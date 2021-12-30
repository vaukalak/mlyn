import { getActiveScope, Scope, Subscription } from "./scope";

const UNMOUNT = Object.freeze({});
// let currentCycle = 0;
let batches = 0;
let batched: Subscription[] = [];

let currentBatch = 0;

export const getCurrentBatch = () => currentBatch;

export const observeInScope = (scope: Scope, subject: SubjectImpl<any>) => {
  // this scope already subscribed to this listener
  let listener = subject.listeners.get(scope);
  if (!listener) {
    const subscription = new Subscription(subject, scope);
    scope.subscriptions.push(subscription);
    subject.listeners.set(scope, subscription);
  } else {
    listener.lastBatch = scope.lastBatch;
  }
};

const invokeCallbacksIfNoBatch = () => {
  if (batches === 0) {
    const previousListeners = batched;
    batched = [];

    const l = previousListeners.length;
    currentBatch++;
    for (let i = 0; i < l; i++) {
      const listener = previousListeners[i];
      if (
        // this subscription has been pinged in the last scope inv
        listener.lastBatch === listener.scope.lastBatch &&
        // this scope hasn't yet run in the scope
        listener.scope.lastBatch !== currentBatch
      ) {
        listener.scope.invoke();
      }
    }
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
export class SubjectImpl<T> {
  key?: string;
  listeners: Map<Scope, Subscription> = new Map();
  children: { [key: string]: any };
  owner: SubjectImpl<any>;
  value: T;

  constructor(intialValue, key?: string, owner?: SubjectImpl<any>) {
    // super();
    this.value = intialValue;
    this.key = key;
    this.owner = owner;
    this.children = undefined;
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
        const newOwnerValue = this.owner.value.concat();
        newOwnerValue[index] = newValue;
        this.owner.updateValue(newOwnerValue);
      } else {
        this.owner.updateValue(
          Object.assign({}, this.owner.value, { [this.key]: newValue })
        );
      }
    }
    // ---------------------------

    batched = batched.concat(Array.from(this.listeners.values()));
    // batched = batched.concat(Array.from(this.listeners.values()));
    this.value = newValue;
  }

  get(target, key) {
    // return undefined;
    if (key === "__value" || key === "__curried") {
      return this.value;
    }
    // some subjects do have child subscriptions and hence on cache.
    if (!(this.children ||= {})[key]) {
      const result = new SubjectImpl(this.value[key], key, this);
      this.children[key] = result;
    }
    return this.children[key];
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

          if (typeof newValue === "object" && this.children) {
            reconciling = true;
            Object.keys(this.children).forEach((childKey) => {
              if (childKey in newValue) {
                if (this.children[childKey].value !== newValue[childKey]) {
                  this.children[childKey](newValue[childKey]);
                }
              } else {
                this.children[childKey](UNMOUNT);
                delete this.children[childKey];
              }
            });
            reconciling = false;
          }
        });
      }
    } else {
      const scope = getActiveScope();
      if (scope) {
        observeInScope(scope, this);
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
