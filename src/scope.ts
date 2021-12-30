import { Subject } from ".";
import { getCurrentBatch, SubjectImpl } from "./subject";

type ScopeCallback = (() => void) | (() => Function);

export interface Scope {
  destroy?: Function;
  invoke: Function;
  subscriptions: Subscription[];
  callback: ScopeCallback;
  destroyed: boolean;
  lastBatch: number;
}

let currentScope: Scope = undefined;

export const getActiveScope = () => {
  return currentScope;
};

export class Subscription {
  scope: Scope;
  lastBatch: number;
  subject: SubjectImpl<any>;
  
  constructor(subject, scope) {
    this.subject = subject;
    this.scope = scope;
    this.lastBatch = getCurrentBatch();
  }

  unsubscribe() {
    this.subject.listeners.delete(this.scope);
  }
}

export const muteScope = (callback: Function) => {
  const prevScope = currentScope;
  currentScope = undefined;
  callback();
  currentScope = prevScope;
};

class ReactiveScope implements Scope {
  subscriptions: Subscription[] = [];
  destroyed = false;
  callback;
  lastBatch = -1;
  _destroy?: Function = undefined;
  
  constructor(callback) {
    this.callback = callback;
    this.invoke();
  }

  destroy() {
    this.destroyed = true;
    for (let i = 0; i < this.subscriptions.length; i++) {
      this.subscriptions[i].unsubscribe();
    }
    this.subscriptions = [];
    if (this._destroy) {
      this._destroy();
    }
  }

  invoke() {
    if (!this.destroyed) {
      const prevScope = currentScope;
      currentScope = this;
      this.lastBatch =  getCurrentBatch();
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
