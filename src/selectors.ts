import { createSubject, Subject } from "./subject";
import { runInReactiveScope, destroyScope, muteScope, Scope } from "./scope";

export const createSyncronizer = (outSubject) => {
  let inScope;
  let outScope;
  const NOT_INITIALIZED = Object.freeze({});
  return (inSubject) => {
    if (outScope) {
      destroyScope(outScope);
    }
    if (inScope) {
      destroyScope(inScope);
    }
    let lastInValue = NOT_INITIALIZED;
    let lastOutValue = NOT_INITIALIZED;
    inScope = runInReactiveScope(() => {
      const inValue = inSubject();
      if (lastInValue !== inValue) {
        lastInValue = inValue;
        if (lastOutValue !== lastInValue) {
          outSubject(lastInValue);
        }
      }
    });

    outScope = runInReactiveScope(() => {
      const outValue = outSubject();
      if (lastOutValue !== outValue) {
        lastOutValue = outValue;
        if (lastOutValue !== lastInValue) {
          inSubject(lastOutValue);
        }
      }
    });
  };
};

export const createSubjectSelector = (projection) => {
  let syncronizerScope;
  return (...args) => {
    if (syncronizerScope) {
      destroyScope(syncronizerScope);
    }
    const resultingSubject = createSubject(undefined);
    const syncronizer = createSyncronizer(resultingSubject);
    let lastSelectedSubject;
    syncronizerScope = runInReactiveScope(() => {
      const newValue = projection(...args);
      if (lastSelectedSubject !== newValue) {
        lastSelectedSubject = newValue;
        syncronizer(lastSelectedSubject);
      }
    });
    return resultingSubject;
  };
};

export const projectArray = <T extends any>(
  array$: Subject<T[]>,
  projection: (array: Subject<T[]>) => T[],
  getKey: (item: T) => string
) => {
  type CacheEntry = {
    item$: Subject<T>;
    index: number;
    scope: Scope;
  };
  let block = false;
  let keyToOriginalIndex: { [key: string]: number } = {};
  const projectEntries = () => {
    const newKeyToOriginalIndex: { [key: string]: number } = {};
    array$().forEach((e, i) => (newKeyToOriginalIndex[getKey(e)] = i));
    const result = projection(array$);
    keyToOriginalIndex = newKeyToOriginalIndex;
    return result;
  };
  const filtered$ = createSubject<T[]>([]);

  let cache: { [key: string]: CacheEntry } = {};
  let blockPropagation = false;
  let prevItems: T[];
  const projectionScope = runInReactiveScope(() => {
    const entries = projectEntries();
    const bypassBlock = (() => {
      if (!prevItems || prevItems.length !== entries.length) {
        return true;
      }
      return entries.find((e, i) => getKey(e) !== getKey(prevItems[i]));
    })();
    prevItems = entries;
    if (block && !bypassBlock) {
      return;
    }
    muteScope(() => {
      blockPropagation = true;
      filtered$(entries);
      const untouched: { [key: string]: CacheEntry } = { ...cache };
      entries.forEach((e, i) => {
        const key = getKey(e);
        delete untouched[key];
        if (!cache[key] || cache[key].index !== i) {
          if (cache[key]) {
            destroyScope(cache[key].scope);
          }
          const item$ = filtered$[i];
          const scope = runInReactiveScope(() => {
            const item = item$();
            if (blockPropagation) {
              return;
            }
            block = true;
            const itemKey = getKey(item);
            array$[keyToOriginalIndex[itemKey]](item);
            block = false;
          });
          cache[key] = {
            item$,
            index: i,
            scope,
          };
        }
      });
      blockPropagation = false;
      Object.keys(untouched).forEach((key) => {
        destroyScope(cache[key].scope);
        delete cache[key];
      });
    });
  });
  return [filtered$, projectionScope];
};

// todo: cover with tests
export const createSelector = (projection, equal) => {
  return (...args) => {
    const resultingSubject = createSubject(undefined);
    let lastValue;
    runInReactiveScope(() => {
      const newValue = projection(...args);
      if (!equal(lastValue, newValue)) {
        lastValue = newValue;
        resultingSubject(lastValue);
      }
    });
    return resultingSubject;
  };
};