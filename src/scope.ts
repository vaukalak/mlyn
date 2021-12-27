type ScopeCallback = (() => void) | (() => Function);

interface IScope {
  // invoke: () => void;
  dependencyDestroyers: Function[];
  destroy?: Function;
  invoke: Function;
  callback: ScopeCallback;
  destroyed: boolean;
}

interface StaticScope extends IScope {
  constructured: boolean;
}

export interface Listener {
  callback: Function;
  active: boolean;
}

export interface Scope extends IScope {}

let currentScope: Scope = undefined;

export const getActiveScope = () => {
  return currentScope;
};

const subscribe = (listeners: Listener[], callback: Function) => {
  // this scope already subscribed to this listener
  let listener = listeners.find((e) => e.callback === callback);
  if (!listener) {
    listener = { callback, active: true };
    // save index to not recompute every time
    let index = listeners.push(listener);
    return (destroy = false) => {
      // however previous listeners in array might be removed!
      if (listeners[index] !== listener) {
        index = listeners.indexOf(listener);
      }
      if (destroy) {
        listeners = listeners.splice(index, 1);
      } else {
        listeners[index].active = false;
      }
    };
  } else {
    listener.active = true;
  }
};

// export const observeInScope = (scope: IScope, subscribe: (cb: Function) => Function) => {
//   scope.observe(subscribe(scope.invoke));
// };

export const destroyScope = (scope: IScope) => {
  const { dependencyDestroyers, destroy } = scope;
  scope.destroyed = true;
  for (let i = 0; i < dependencyDestroyers.length; i++) {
    dependencyDestroyers[i](true);
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

// export const runInStaticReactiveScope = (callback: ScopeCallback) => {
//   const prevScope = currentScope;
//   const newScope: Partial<StaticScope> = {
//     dependencyDestroyers: [],
//     observe: (listeners: Listener[]) => {
//       if (!newScope.constructured) {
//         newScope.dependencyDestroyers.push(
//           subscribe(listeners, newScope.invoke)
//         );
//       }
//     },
//     invoke: () => {
//       newScope.destroy = callback() as Function | undefined;
//     },
//     destroyed: false,
//   };
//   currentScope = newScope as Scope;
//   newScope.destroy = callback() as Function | undefined;
//   newScope.constructured = true;
//   currentScope = prevScope;
//   return () => destroyScope(newScope as Scope);
// };

// export const invokeScope = (scope: IScope, callback: Function) => {
//   if (!scope.destroyed) {
//     const prevScope = currentScope;
//     currentScope = scope;
//     for (let i = 0; i < scope.dependencyDestroyers.length; i++) {
//       scope.dependencyDestroyers[i]();
//     }
//     scope.destroy = callback() as Function | undefined;
//     currentScope = prevScope;
//   }
// };

export const observeInScope = (scope: IScope, listeners: Listener[]) => {
  const destroyer = subscribe(listeners, scope.invoke);
  if (destroyer) {
    scope.dependencyDestroyers.push(destroyer);
  }
};

const invoke = (scope: IScope) => {
  if (!scope.destroyed) {
    const prevScope = currentScope;
    currentScope = scope as Scope;
    for (let i = 0; i < scope.dependencyDestroyers.length; i++) {
      scope.dependencyDestroyers[i]();
    }
    scope.destroy = scope.callback() as Function | undefined;
    currentScope = prevScope;
  }
}

export const runInReactiveScope = (callback: ScopeCallback) => {
  const scope: IScope = {
    dependencyDestroyers: [],
    destroyed: false,
    invoke: () => invoke(scope),
    callback,
  };
  invoke(scope);
  return () => destroyScope(scope);
};
