const scopes = [];
const scopeByListener = new Map();

export const getActiveScope = () => {
  return scopes.length > 0 ? scopes[scopes.length - 1] : undefined;
};

export const getListenerScope = () => {
  return scopes.length > 0 ? scopes[scopes.length - 1] : undefined;
};

export const observeInScope = (scope, subscribe) => {
  scope.dependencies.add(subscribe(scope.callback));
};

export const destroyScope = (scope) => {
  for (const dependency of scope.dependencies.values()) {
    dependency();
  }
};

export const runInReactiveScope = (callback) => {
  scopes.push({
    dependencies: new Set(),
    callback,
  });
  callback();
  return scopes.pop();
};
