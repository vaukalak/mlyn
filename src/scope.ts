import { SubjectImpl } from "./subject";

type ScopeCallback = (() => void) | (() => Function);

export interface Scope {
  destroy?: Function;
  invoke: Function;
  subscriptions: Set<SubjectImpl<any>>;
  callback: ScopeCallback;
  destroyed: boolean;
}

let currentScope: Scope = undefined;

export const getActiveScope = () => {
  return currentScope;
};

export const muteScope = (callback: Function) => {
  const prevScope = currentScope;
  currentScope = undefined;
  callback();
  currentScope = prevScope;
};

export class ReactiveScope implements Scope {
  subscriptions = new Set<SubjectImpl<any>>();
  destroyed = false;
  callback;
  _destroy?: Function = undefined;
  
  constructor(callback) {
    this.callback = callback;
    this.invoke();
  }

  destroy() {
    this.destroyed = true;
    
    this.subscriptions.forEach((sub) => sub.listeners.delete(this));
    this.subscriptions = new Set();
    if (this._destroy) {
      this._destroy();
    }
  }

  invoke() {
    if (!this.destroyed) {
      const prevScope = currentScope;
      currentScope = this;
      this.subscriptions.forEach((sub) => sub.listeners.delete(this));
      this.subscriptions = new Set();
      if (typeof this.callback === "function") {
        this._destroy = this.callback() as Function | undefined;
      } else {
        this._destroy = this.callback.recompute() as Function | undefined;
      }
      currentScope = prevScope;
    }
  }

}

export const runInReactiveScope = (callback: ScopeCallback) => {
  return new ReactiveScope(callback);
};
