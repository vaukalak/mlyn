import { getCurrentBatch } from "./subject";

type ScopeCallback = (() => void) | (() => Function);

interface IScope {
  // invoke: () => void;
  dependencyDestroyers: Subscription[];
  destroy?: Function;
  invoke: Function;
  callback: ScopeCallback;
  destroyed: boolean;
}

interface StaticScope extends IScope {
  constructured: boolean;
}

export class Listener {
  callback: Function;
  active: boolean;
  constructor(callback) {
    this.callback = callback;
    this.active = true;
  }
}

export interface Scope extends IScope {}

let currentScope: IScope = undefined;

export const getActiveScope = () => {
  return currentScope;
};

export class Subscription {
  listeners;
  index;
  scope: ReactiveScope;
  active;

  constructor(listeners, scope) {
    this.listeners = listeners;
    this.scope = scope;
    this.index = listeners.length;
    this.active = true;
  }

  unsubscribe() {
    if (this.listeners[this.index] !== this) {
      this.index = this.listeners.indexOf(this);
    }
    this.listeners.splice( this.index, 1);
  }
}

export const muteScope = (callback: Function) => {
  const prevScope = currentScope;
  currentScope = undefined;
  callback();
  currentScope = prevScope;
};

export const observeInScope = (scope: IScope, listeners: Subscription[]) => {
  // this scope already subscribed to this listener
  let listener = listeners.find((e) => e.scope === scope);
  if (!listener) {
    const subscription = new Subscription(listeners, scope);
    listeners.push(subscription);
    scope.dependencyDestroyers.push(subscription);
  } else {
    listener.active = true;
  }
};

class ReactiveScope implements IScope {
  dependencyDestroyers: Subscription[] = [];
  destroyed = false;
  callback;
  lastBatch = -1;
  _destroy?: Function = undefined;
  
  constructor(callback) {
    this.callback = callback;
    this.invoke();
  }

  destroy = () => {
    this.destroyed = true;
    for (let i = 0; i < this.dependencyDestroyers.length; i++) {
      this.dependencyDestroyers[i].unsubscribe();
    }
    this.dependencyDestroyers = [];
    if (this._destroy) {
      this._destroy();
    }
  }

  invoke() {
    if (!this.destroyed) {
      const prevScope = currentScope;
      currentScope = this;
      for (let i = 0; i < this.dependencyDestroyers.length; i++) {
        this.dependencyDestroyers[i].active = false;
      }
      this._destroy = this.callback() as Function | undefined;
      currentScope = prevScope;
    }
  }

}

export const runInReactiveScope = (callback: ScopeCallback) => {
  return new ReactiveScope(callback).destroy;
};
