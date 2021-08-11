import { getActiveContext, observeInContext } from "./context";

const batches = [];

export const batch = (cb) => {
  const currentBatch = { listeners: new Set() };
  batches.push(currentBatch);
  cb();
  batches.pop();
  if (batches.length === 0) {
    const previousListeners = new Set([...currentBatch.listeners]);
    for (const listener of previousListeners) {
      listener();
    }
  } else {
    const parentBatch = batches[batches.length - 1];
    parentBatch.listeners = new Set([
      ...parentBatch.listeners,
      ...currentBatch.listeners,
    ]);
  }
};

const handlers = (onChange) => {
  const cache = new Map();
  const listeners = new Set();
  const subscribe = (listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  const dispatch = (value) => {
    for (const listener of listeners.values()) {
      listener(value);
    }
  };
  const updateValue = (target, newValue) => {
    target.__curried = newValue;
    if (onChange) {
      onChange(target.__curried);
    }
    // will this ever be true ?
    if (batches.length === 0) {
      dispatch();
    } else {
      const currentBatch = batches[batches.length - 1];
      currentBatch.listeners = new Set([
        ...currentBatch.listeners,
        ...listeners,
      ]);
    }
  };
  const proxifyKeyCached = (target, key) => {
    if (!cache.has(key)) {
      const result = createProxy(target.__curried[key], (newValue) => {
        if (Array.isArray(target.__curried)) {
          const index = parseInt(key, 10);
          if (isNaN(index)) {
            throw new Error(`trying to set non numeric key "${key}" of type "${typeof key}" to array object`);
          }
          // is map the most performant way?
          updateValue(target, target.__curried.map((e, i) => {
            if (i === index) {
              return newValue;
            }
            return e;
          }));
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
  return {
    apply: (target, thisArg, args) => {
      if (args.length > 0) {
        batch(() => {
          // replace root value;
          const newValue = args[0];
          updateValue(target, newValue);
          // reconcile
          for (const [childKey, childValue] of cache.entries()) {
            if (childValue.__curried !== newValue[childKey]) {
              childValue(newValue[childKey]);
            }
          }
        });
      } else {
        const context = getActiveContext();
        if (context) {
          observeInContext(context, subscribe);
        }
        // we allow to run outside of context
        // in this case just returns a value;
      }
      return target.__curried;
    },
    get: (target, key) => {
      if (key === "__curried") {
        return target.__curried;
      }
      return proxifyKeyCached(target, key);
    },
    set: (target, key, value) => {
      proxifyKeyCached(target, key)(value);
      return true;
    },
  };
};

export const createProxy = (target, onChange) => {
  // this function is never invocked, but js
  // doesn't like invoking a function on a proxy
  // which target is not a function :P
  const f = () => f.__curried;
  f.__curried = target;
  return new Proxy(f, handlers(onChange));
};
