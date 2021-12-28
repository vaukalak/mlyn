import { getActiveScope, Listener, observeInScope } from "./scope";

const UNMOUNT = Object.freeze({});
// let currentCycle = 0;
let batches = 0;
let batched: Function[] = [];
let currentBatch = 0;

const invokeCallbacksIfNoBatch = () => {
  if (batches === 0) {
    const previousListeners = batched;
    batched = [];

    const l = previousListeners.length;
    // console.log(">>> listeners:", previousListeners);
    for (let i = 0; i < l; i++) {
      const listener = previousListeners[i];
      // const listener = previousListeners[i];
      // @ts-ignore
      if (listener.lastBatch !== currentBatch) {
        // @ts-ignore
        listener.lastBatch = currentBatch;
        // @ts-ignore
        listener();
      }
    }
    currentBatch++;
  }
};

export const batch = (cb: Function) => {
  batches++;
  cb();
  batches--;
  invokeCallbacksIfNoBatch();
};

const apply = <T>(target, thisArg, args) => {
  if (args.length > 0) {
    // @ts-ignore
    const newValue = args[0] as any;
    if (newValue === UNMOUNT) {
      target.owner = undefined;
    } else {
      if (target.__curried === newValue) {
        return;
      }
      batch(() => {
        // replace root value;
        updateValue(target, newValue);

        if (typeof newValue === "object" && target.cache) {
          target.reconciling = true;
          for (const [childKey, childValue] of target.cache.entries()) {
            // console.log(">>> childKey:", childKey);
            if (childKey in newValue) {
              if (childValue.__curried !== newValue[childKey]) {
                childValue(newValue[childKey]);
              }
            } else {
              childValue(UNMOUNT);
              target.cache.delete(childKey);
            }
          }
          target.reconciling = false;
        }
      });
    }
  } else {
    const scope = getActiveScope();
    if (scope) {
      // console.log(">>> subscribe: ", __curried);
      observeInScope(scope, target.listeners);
    }
    // we allow to run outside of scope
    // in this case just returns a value;
  }
  return target.__curried;
};
const get = <T, K extends Extract<keyof T, string>>(target: T, key: K): T => {
  if (key === "__curried") {
    return target.__curried;
  }
  // some subjects do have child subscriptions and hence on cache.
  if (!(target.cache ||= new Map()).has(key)) {
    const result = createSubject(target.__curried[key], key, target);
    target.cache.set(key, result);
  }
  return target.cache.get(key);
};

export type PrimitiveSubject<T> = (() => T) & ((newValue: T) => void);

export type Subject<T> = {
  [K in keyof T]: Subject<T[K]>;
} & PrimitiveSubject<T>;

declare global {
  interface ProxyConstructor {
    new <T>(target: Function, handler: ProxyHandler<Function>): Subject<T>;
  }
}

const updateValue = <T>(
  target: Function,
  newValue: T,
) => {
  if (target.prevValue === newValue) {
    return;
  }
  target.prevValue = newValue;
  
  // ---------------------------
  if (target.owner && !target.owner.reconciling) {

    if (Array.isArray(target.owner.__curried)) {
      const index = parseInt(target.key, 10);
      if (isNaN(index)) {
        throw new Error(
          `trying to set non numeric key "${target.key}" of type "${typeof target.key}" to array object`
        );
      }
      // is map the most performant way?
      updateValue(
        target.owner,
        target.owner.__curried.map((e, i) => {
          if (i === index) {
            return newValue;
          }
          return e;
        }),
      );
    } else {
      updateValue(
        target.owner,
        {
          ...target.owner.__curried,
          [target.key]: newValue,
        }
      );
    }
  }
  // ---------------------------

  batched = batched.concat(
    target.listeners.filter(({ active }) => active).map(({ callback }) => callback)
  );
  target.__curried = newValue;
};

type Apply<T> =
  | ((target: T, thisArg: any, args: []) => T)
  | ((target: T, thisArg: any, args: [T]) => void);
// this function is never invocked, but js
// doesn't like invoking a function on a proxy
// which target is not a function :P
const applyMock = () => {};
const handlers = { get, apply };
export const createSubject = <T>(
  initialValue: T,
  key?: string,
  owner?: Function,
  // onChange?: (newValue: T) => any
): Subject<T> => {
  // this function is never invocked, but js
  // doesn't like invoking a function on a proxy
  // which target is not a function :P
  const f = () => {};
  if (key) {
    f.key = key;
  }
  f.__curried = initialValue;
  // const self = { reconciling: false };
  f.reconciling = false;
  // target.cache;
  f.listeners = [];
  if (owner) {
    f.owner = owner;
  }
  // if (onChange) {
  //   f.onChange = onChange;
  // }

  // @ts-ignore
  return new Proxy(f, handlers);
};
