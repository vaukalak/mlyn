import { useState, useEffect, useMemo, useRef } from "react";
// import ReactCurrentOwner from "react/lib/ReactCurrentOwner";
import {
  runInReactiveScope,
  Subject,
  projectArray,
  projectSubject,
  createSubject,
} from "mlyn";

export const useSubject = <T>(initialValue: T): Subject<T> => {
  return useMemo(() => createSubject<T>(initialValue), []) as Subject<T>;
};

interface Destroyable {
  destroy: Function;
}

export const useDestroyable = (callback: <T>() => [() => T, Destroyable]) => {
  const [observable$, destroyable] = useMemo(callback, []);
  useEffect(() => () => destroyable.destroy(), []);
  return observable$;
};

export const useMlynEffect = (callback: (() => void) | (() => Function)) => {
  useEffect(() => {
    const scope = runInReactiveScope(callback);
    // @ts-ignore
    return () => scope.destroy();
  }, []); // no dependencies, run only once
};

/**
 * returns one way bindable function
 * @param cb
 * @returns
 */
export const useMemoize = <T extends any>(cb: () => T) => {
  const subject$ = useSubject<T>(cb());
  useMlynEffect(() => {
    const newValue = cb();
    subject$(newValue);
  });
  return () => subject$();
};

/**
 * returns a 2-way bindable subject
 * @param cb
 * @returns
 */
export const useProjectSubject = <T extends any>(
  projection: () => Subject<T>
) => {
  const [result, scope] = useMemo(() => projectSubject<T>(projection), []);
  useEffect(() => scope, []);
  return result;
};

/**
 * returns an array projection, every entry is 2-way bindable
 * @param cb
 * @returns
 */
export const useProjectArray = <T extends any, R extends any = T>(
  array$: Subject<T[]>,
  projection: (array: Subject<T[]>) => R[],
  getKey: (item: T | R) => string
  // bindBack?: (item: R, keyToIndex: Record<string, number>) => void,
) => {
  const [result, scope] = useMemo(
    () => projectArray(array$, projection, getKey),
    []
  );
  useEffect(() => () => scope.destroy(), []);
  return result as Subject<T[]>;
};

/**
 * causes component re-rendering on computed value change
 * @param callback
 * @returns
 */
export const useCompute = <T>(callback: () => T): T => {
  const [computed, setComputed] = useState(callback());
  useMlynEffect(() => {
    setComputed(callback());
  });
  return computed;
};

/**
 * causes component re-rendering on subject value change
 * @param callback
 * @returns
 */
export const useSubjectValue = <T>(subject: Subject<T>): T => {
  return useCompute(() => subject());
};

export const useForceUpdate = () => {
  const [, forceUpdate] = useState(0);
  return () => forceUpdate((v) => v + 1);
};

const unitialized = {};

/**
 * causes re-render
 * @param observable
 * @returns
 */
export const useObervableValue = <T extends any>(observable: () => T): T => {
  const [state, setState] = useState<T>(observable());
  useEffect(() => {
    const scope = runInReactiveScope(() => {
      setState(observable());
    });
    return () => scope.destroy();
  }, []);
  return state;
};

/**
 * causes component re-rendering on subject value change
 * @param callback
 * @returns
 */
export const useSubjectInputBinding = <T>(subject: Subject<T>) => {
  const value = useSubjectValue(subject);
  return { value, onChange: (e) => subject(e.target.value) };
};
