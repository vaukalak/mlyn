type ScopeCallback = (() => void) | (() => Function);

interface IScope {
  invoke: () => void;
  observe: (cb: Function) => void;
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
    observe: (subscribe) => {
      if (!newScope.constructured) {
        newScope.dependencyDestroyers.push((subscribe(newScope.invoke)));
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
    observe: (subscribe) => {
      newScope.dependencyDestroyers.push(subscribe(newScope.invoke));
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
