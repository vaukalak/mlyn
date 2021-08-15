let currentScope = undefined;
const scopeByListener = new Map();

export const getActiveScope = () => {
  return currentScope;
};

export const observeInScope = (scope, subscribe) => {
  scope.dependencies.add(subscribe(scope.callback));
};

export const destroyScope = ({ dependencies, destroy }) => {
  for (const dependency of dependencies.values()) {
    dependency();
  }
  if (destroy) {
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
    callback,
  };
  currentScope = newScope;
  const destroy = callback();
  newScope.destroy = destroy;
  currentScope = prevScope;
  return newScope;
};
