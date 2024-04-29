import { useState, useMemo, useEffect } from "react";
import { reactive, createSubject } from "..";

export const useSubject = (value) => useMemo(() => createSubject(value), []);

export const useForceUpdate = () => {
  const [, setState] = useState(0);
  // will create and memoize a reactive-scope
  // which, when dependency is changed
  // will re-render component
  return useMemo(
    () =>
      reactive(() => {
        setState((value) => value + 1);
      }),
    []
  );
};

export const useReactive = (cb) => {
  useEffect(() => {
    let cleanup;
    const scope = reactive(() => {
      if (cleanup) {
        cleanup();
      }
      cleanup = cb();
    });
    return () => {
      scope.destroy();
      cleanup();
    };
  }, []);
};

export const rc = (fn) => {
  return (props) => {
    const scope = useForceUpdate();
    return scope.runTracked(() => fn(props));
  };
};
