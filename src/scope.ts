type ScopeCallback = (() => void) | (() => Function);

interface IScope {
  invoke: () => void;
  observe: (listeners: Function[]) => void;
  dependencyDestroyers: Function[];
  destroy?: Function;
  destroyed: boolean;
}

interface StaticScope extends IScope {
  constructured: boolean;
}
export interface Scope extends IScope {
  
}

let currentScope: Scope = undefined;

export const getActiveScope = () => {
  return currentScope;
};


const subscribe = (listeners: Function[], callback: Function) => {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter(l => l !== callback);
    // console.log(">>> after destroy:", listeners)
  };
};

// export const observeInScope = (scope: IScope, subscribe: (cb: Function) => Function) => {
//   scope.observe(subscribe(scope.invoke));
// };

export const destroyScope = (scope: IScope) => {
  const { dependencyDestroyers, destroy } = scope;
  scope.destroyed = true;
  for (let i = 0; i < dependencyDestroyers.length; i++) {
    dependencyDestroyers[i]();
  }
  if (destroy && typeof destroy === "function") {
    destroy();
  } 
};

export const muteScope = (callback: Function) => {
  const prevScope = currentScope;
  currentScope = undefined;
  callback();
  currentScope = prevScope;
};

export const runInStaticReactiveScope = (callback: ScopeCallback) => {
  const prevScope = currentScope;
  const newScope: Partial<StaticScope> = {
    dependencyDestroyers: [],
    observe: (listeners: Function[]) => {
      if (!newScope.constructured) {
        newScope.dependencyDestroyers.push((subscribe(listeners, newScope.invoke)));
      }
    },
    invoke: () => {
      newScope.destroy = callback() as Function | undefined;
    },
    destroyed: false,
  };
  currentScope = newScope as Scope;
  newScope.destroy = callback() as Function | undefined;
  newScope.constructured = true;
  currentScope = prevScope;
  return () => destroyScope(newScope as Scope);
};

export const runInReactiveScope = (callback: ScopeCallback) => {
  const prevScope = currentScope;
  const newScope: Partial<Scope> = {
    dependencyDestroyers: [],
    observe: (listeners) => {
      newScope.dependencyDestroyers.push(subscribe(listeners, newScope.invoke));
    },
    invoke: () => {
      if (!newScope.destroyed) {
        const prevScope = currentScope;
        currentScope = newScope as Scope;
        destroyScope(newScope as Scope);
        newScope.destroyed = false;
        newScope.destroy = callback() as Function | undefined;
        currentScope = prevScope;
      }
    },
    destroyed: false,
  };
  currentScope = newScope as Scope;
  newScope.destroy = callback() as Function | undefined;
  currentScope = prevScope;
  return () => destroyScope(newScope as Scope);
};
