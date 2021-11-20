type ScopeCallback = (() => void) | (() => Function);

export interface Scope {
  dependencyDestroyers: Set<Function>;
  callback: () => void;
  destroy?: Function;
  destroyed: boolean;
}

let currentScope: Scope = undefined;

export const getActiveScope = () => {
  return currentScope;
};

export const observeInScope = (scope: Scope, subscribe: (cb: Function) => Function) => {
  scope.dependencyDestroyers.add(subscribe(scope.callback));
};

export const destroyScope = (scope: Scope) => {
  const { dependencyDestroyers, destroy } = scope;
  scope.destroyed = true;
  for (const dependencyDestroyer of dependencyDestroyers.values()) {
    dependencyDestroyer();
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

export const runInReactiveScope = (callback: ScopeCallback) => {
  const prevScope = currentScope;
  const newScope: Partial<Scope> = {
    dependencyDestroyers: new Set(),
    callback: () => {
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
