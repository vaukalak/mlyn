let currentScope = undefined;
const scopeByListener = new Map();

export const getActiveScope = () => {
  return currentScope;
};

export const observeInScope = (scope, subscribe) => {
  scope.dependencies.add(subscribe(scope.callback));
};

export const destroyScope = (scope) => {
  const { dependencies, destroy } = scope;
  scope.destroyed = true;
  for (const dependency of dependencies.values()) {
    dependency();
  }
  if (destroy && typeof destroy === "function") {
    destroy();
  } 
};

export const muteScope = (callback) => {
  const prevScope = currentScope;
  currentScope = undefined;
  callback();
  currentScope = prevScope;
};

export const runInReactiveScope = (callback) => {
  const prevScope = currentScope;
  const newScope = {
    dependencies: new Set(),
    callback: () => {
      if (!newScope.destroyed) {
        currentScope = newScope;
        destroyScope(newScope);
        newScope.destroyed = false;
        newScope.destroy = callback();
        currentScope = prevScope;
      }
    },
    destroyed: false,
  };
  currentScope = newScope;
  newScope.destroy = callback();
  currentScope = prevScope;
  return newScope;
};
