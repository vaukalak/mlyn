import { getActiveScope, observeInScope, Subscription } from "./scope";

const UNMOUNT = Object.freeze({});
// let currentCycle = 0;
let batches = 0;
let batched: Subscription[] = [];
let currentBatch = 0;

export const getCurrentBatch = () => currentBatch;

const invokeCallbacksIfNoBatch = () => {
  if (batches === 0) {
    const previousListeners = batched;
    batched = [];

    const l = previousListeners.length;
    for (let i = 0; i < l; i++) {
      const listener = previousListeners[i];
      // const listener = previousListeners[i];
      // @ts-ignore
      if (listener.active && listener.scope.lastBatch !== currentBatch) {
        listener.active = false;
        listener.scope.lastBatch = currentBatch;
        // @ts-ignore
        listener.scope.invoke();
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

export type PrimitiveSubject<T> = (() => T) & ((newValue: T) => void);

export type Subject<T> = {
  [K in keyof T]: Subject<T[K]>;
} & PrimitiveSubject<T>;

declare global {
  interface ProxyConstructor {
    new <T>(target: Function, handler: ProxyHandler<Function>): Subject<T>;
  }
}

let reconciling = false;

const mock = () => {};
class SubjectImpl<T> {
  key?: string;
  listeners: Subscription[] = [];
  cache: { [key: string]: any };
  owner: SubjectImpl<any>;
  value: T;

  constructor(intialValue, key?: string, owner?: SubjectImpl<any>) {
    // super();
    this.value = intialValue;
    this.key = key;
    this.owner = owner;
    this.cache = {};
    // @ts-ignore
    return new Proxy(mock, this);
  }

  updateValue(newValue) {
    if (this.value === newValue) {
      return;
    }
    this.value = newValue;

    // ---------------------------
    if (this.owner && !reconciling) {
      if (Array.isArray(this.owner.value)) {
        const index = parseInt(this.key, 10);
        if (isNaN(index)) {
          throw new Error(
            `trying to set non numeric key "${this.key}" of type "${typeof this
              .key}" to array object`
          );
        }
        // is map the most performant way?
        const newOwnerValue = this.owner.value.concat();
        newOwnerValue[index] = newValue;
        this.owner.updateValue(newOwnerValue);
      } else {
        this.owner.updateValue({
          ...this.owner.value,
          [this.key]: newValue,
        });
      }
    }
    // ---------------------------

    batched = batched.concat(this.listeners);
    this.value = newValue;
  }

  get(target, key) {
    // return undefined;
    if (key === "__value" || key === "__curried") {
      return this.value;
    }
    // some subjects do have child subscriptions and hence on cache.
    if (!this.cache[key]) {
      const result = new SubjectImpl(this.value[key], key, this);
      this.cache[key] = result;
    }
    return this.cache[key];
  }

  apply(target, thisArg, args) {
    if (args.length > 0) {
      // @ts-ignore
      const newValue = args[0] as any;
      if (newValue === UNMOUNT) {
        this.owner = undefined;
      } else {
        if (this.value === newValue) {
          return;
        }
        batch(() => {
          // replace root value;
          this.updateValue(newValue);

          if (typeof newValue === "object" && this.cache) {
            reconciling = true;
            for (const [childKey, childValue] of Object.entries(this.cache)) {
              if (childKey in newValue) {
                if (childValue.value !== newValue[childKey]) {
                  childValue(newValue[childKey]);
                }
              } else {
                childValue(UNMOUNT);
                delete this.cache[childKey];
              }
            }
            reconciling = false;
          }
        });
      }
    } else {
      const scope = getActiveScope();
      if (scope) {
        observeInScope(scope, this.listeners);
      }
      // we allow to run outside of scope
      // in this case just returns a value;
    }
    return this.value;
  }
}

export const createSubject = <T>(
  initialValue: T,
  key?: string,
  owner?: Subject<any>
): Subject<T> => {
  // @ts-ignore
  return new SubjectImpl(initialValue, key, owner) as Subject<T>;
};
