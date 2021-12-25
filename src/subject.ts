import { getActiveScope } from "./scope";

const UNMOUNT = Object.freeze({});
// let currentCycle = 0;
let batches = 0;
let batched: Function[] = [];
let currentBatch = 0;

type AnyFunction = (...args: any[]) => any;

type Curried<T> = {
  (): void;
  __curried: T;
};

export const batch = (cb: AnyFunction) => {
  batches++;
  cb();
  batches--;
  if (batches === 0) {
    const previousListeners = batched;
    batched = [];

    const l = previousListeners.length;
    for (let i = 0; i < l; i++) {
      const listener = previousListeners[i];
      // @ts-ignore
      if (listener.lastBatch !== currentBatch) {
        // @ts-ignore
        listener.lastBatch = currentBatch;
        listener();
      }
    }
    currentBatch++;
  }
};

const handlers = <T>(onChange?: (newValue: T) => any) => {
  const cache = new Map<any, any>();
  let listeners: Function[] = [];
  let reconciling = false;
  let onChangeRef = onChange;
  const subscribe = (listener) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  };
  const updateValue = (target: Curried<T>, newValue: T) => {
    if (target.__curried === newValue) {
      return;
    }
    target.__curried = newValue;
    if (onChangeRef) {
      onChangeRef(target.__curried);
    }
    batched = batched.concat(listeners);
  };
  const proxifyKeyCached = (target, key) => {
    if (!cache.has(key)) {
      const result = createSubject(target.__curried[key], (newValue) => {
        if (reconciling) {
          return;
        }
        if (Array.isArray(target.__curried)) {
          const index = parseInt(key, 10);
          if (isNaN(index)) {
            throw new Error(
              `trying to set non numeric key "${key}" of type "${typeof key}" to array object`
            );
          }
          // is map the most performant way?
          
          const newArray = [...target.__curried];
          newArray[index] = newValue;
          updateValue(
            target,
            // @ts-ignore
            newArray,
          );
        } else {
          updateValue(target, {
            ...target.__curried,
            [key]: newValue,
          });
        }
      });
      cache.set(key, result);
    }
    return cache.get(key);
  };
  type Apply = (
    target: Curried<T>,
    thisArg: any,
    args: []
  ) => T | ((target: Curried<T>, thisArg: any, args: [T]) => void);
  const apply: Apply = (target, thisArg, args) => {
    if (args.length > 0) {
      // @ts-ignore
      const newValue = args[0] as any;
      if (newValue === UNMOUNT) {
        onChangeRef = undefined;
      } else {
        if (target.__curried === newValue) {
          return;
        }
        batch(() => {
          // replace root value;
          updateValue(target, newValue);
          if (typeof newValue === "object") {
            reconciling = true;
            for (const [childKey, childValue] of cache.entries()) {
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
        scope.observe(subscribe);
      }
      // we allow to run outside of scope
      // in this case just returns a value;
    }
    return target.__curried;
  };
  return {
    apply,
    get: <K extends Extract<keyof T, string>>(
      target: Curried<T>,
      key: K
    ): T => {
      if (key === "__curried") {
        return target.__curried;
      }
      return proxifyKeyCached(target, key);
    },
    set: <K extends Extract<keyof T, string>>(
      target: Curried<T>,
      key: K,
      value: T[K]
    ) => {
      proxifyKeyCached(target, key)(value);
      return true;
    },
  };
};

export type PrimitiveSubject<T> = (() => T) & ((newValue: T) => void);

export type Subject<T> = {
  [K in keyof T]: Subject<T[K]>;
} & PrimitiveSubject<T>;

declare global {
  interface ProxyConstructor {
    new <T>(target: Curried<T>, handler: ProxyHandler<Curried<T>>): Subject<T>;
  }
}

export const createSubject = <T>(
  target: T,
  onChange?: (newValue: T) => any
) => {
  // this function is never invocked, but js
  // doesn't like invoking a function on a proxy
  // which target is not a function :P
  const f: Curried<T> = () => f.__curried;
  f.__curried = target;
  return new Proxy(f, handlers(onChange));
};
