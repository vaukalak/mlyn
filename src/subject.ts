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

const handlers = <T>(__curried: T, onChange?: (newValue: T) => any) => {
  const cache = new Map<any, any>();
  let listeners: Listener[] = [];
  let reconciling = false;

  const apply: Apply<T> = (target, thisArg, args) => {
    if (args.length > 0) {
      // @ts-ignore
      const newValue = args[0] as any;
      if (newValue === UNMOUNT) {
        onChange = undefined;
      } else {
        if (__curried === newValue) {
          return;
        }
        batch(() => {
          // replace root value;
          __curried = updateValue(target, newValue, listeners, onChange);
          if (typeof newValue === "object") {
            reconciling = true;
            for (const [childKey, childValue] of cache.entries()) {
              // console.log(">>> childKey:", childKey);
              if (childKey in newValue) {
                if (childValue.__curried !== newValue[childKey]) {
                  childValue(newValue[childKey]);
                }
              } else {
                childValue(UNMOUNT);
                cache.delete(childKey);
              }
            }
            reconciling = false;
          }
        });
      }
    } else {
      const scope = getActiveScope();
      if (scope) {
        // console.log(">>> subscribe: ", __curried);
        observeInScope(scope, listeners);
      }
      // we allow to run outside of scope
      // in this case just returns a value;
    }
    return __curried;
  };
  return {
    apply,
    get: <K extends Extract<keyof T, string>>(target: T, key: K): T => {
      if (key === "__curried") {
        return __curried;
      }
      if (!cache.has(key)) {
        const result = createSubject(__curried[key], (newValue) => {
          if (reconciling) {
            return;
          }
          if (Array.isArray(__curried)) {
            const index = parseInt(key, 10);
            if (isNaN(index)) {
              throw new Error(
                `trying to set non numeric key "${key}" of type "${typeof key}" to array object`
              );
            }

            const newArray = __curried.concat();
            newArray[index] = newValue;
            // @ts-ignore
            __curried = updateValue(
              __curried,
              newArray,
              listeners,
              // @ts-ignore
              onChange
            );
          } else {
            __curried = updateValue(
              __curried,
              {
                ...__curried,
                [key]: newValue,
              },
              listeners,
              onChange
            );
          }
        });
        cache.set(key, result);
      }
      return cache.get(key);
    },
  };
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
  prevValue: T,
  newValue: T,
  listeners: Listener[],
  onChange?: (newValue: T) => any
) => {
  if (prevValue === newValue) {
    return;
  }
  prevValue = newValue;
  if (onChange) {
    onChange(prevValue);
  }
  // console.log(`>>> listeners1 (${newValue}): `, listeners);
  batched = batched.concat(
    listeners.filter(({ active }) => active).map(({ callback }) => callback)
  );
  return newValue;
};

type Apply<T> =
  | ((target: T, thisArg: any, args: []) => T)
  | ((target: T, thisArg: any, args: [T]) => void);
// this function is never invocked, but js
// doesn't like invoking a function on a proxy
// which target is not a function :P
const applyMock = () => {};

export const createSubject = <T>(
  initialValue: T,
  onChange?: (newValue: T) => any
): Subject<T> => {
  // this function is never invocked, but js
  // doesn't like invoking a function on a proxy
  // which target is not a function :P
  // @ts-ignore
  return new Proxy(applyMock, handlers(initialValue, onChange));
};
