import { createSubject, Subject } from "./subject";
import { runInReactiveScope, muteScope } from "./scope";

type Syncronizer<T> = [(s: Subject<T>) => void, () => void];

export const createSyncronizer = <T extends any>(
  outSubject: Subject<T>
): Syncronizer<T> => {
  let destroyInScope: () => void;
  let destroyOutScope: () => void;
  const NOT_INITIALIZED: any = Object.freeze({});
  return [
    (inSubject: Subject<T>) => {
      if (destroyOutScope) {
        destroyOutScope();
      }
      if (destroyInScope) {
        destroyInScope();
      }
      let lastInValue: T = NOT_INITIALIZED;
      let lastOutValue: T = NOT_INITIALIZED;
      destroyInScope = runInReactiveScope(() => {
        const inValue = inSubject();
        if (lastInValue !== inValue) {
          lastInValue = inValue;
          if (lastOutValue !== lastInValue) {
            outSubject(lastInValue);
          }
        }
      });

      destroyOutScope = runInReactiveScope(() => {
        const outValue = outSubject();
        if (lastOutValue !== outValue) {
          lastOutValue = outValue;
          if (lastOutValue !== lastInValue) {
            inSubject(lastOutValue);
          }
        }
      });
    },
    () => {
      destroyInScope();
      destroyOutScope();
    },
  ];
};

// deprecated
export const createSubjectSelector = (projection) => {
  let destroySyncronizerScope;
  return (...args) => {
    if (destroySyncronizerScope) {
      destroySyncronizerScope();
    }
    const resultingSubject = createSubject(undefined);
    const [syncronizer] = createSyncronizer(resultingSubject);
    let lastSelectedSubject;
    destroySyncronizerScope = runInReactiveScope(() => {
      const newValue = projection(...args);
      if (lastSelectedSubject !== newValue) {
        lastSelectedSubject = newValue;
        syncronizer(lastSelectedSubject);
      }
    });
    return [
      resultingSubject,
      () => {
        destroySyncronizerScope();
      },
    ];
  };
};

type Projection<T> = [Subject<T>, () => void];

export const projectSubject = <T>(
  projection: () => Subject<T>
): Projection<T> => {
  const resultingSubject = createSubject<T>(undefined);
  const [syncronizer, destroySyncronizerScope] =
    createSyncronizer(resultingSubject);
  let lastSelectedSubject;
  const destroyProjectionScope = runInReactiveScope(() => {
    const newValue = projection();
    if (lastSelectedSubject !== newValue) {
      lastSelectedSubject = newValue;
      syncronizer(lastSelectedSubject);
    }
  });
  return [
    resultingSubject,
    () => {
      destroySyncronizerScope();
      destroyProjectionScope();
    },
  ];
};

export const projectArray = <T extends any>(
  array$: Subject<T[]>,
  projection: (array: Subject<T[]>) => T[],
  getKey: (item: T) => string
) => {
  type CacheEntry = {
    item$: Subject<T>;
    index: number;
    destroyScope: () => void;
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
            cache[key].destroyScope();
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
            destroyScope: scope,
          };
        }
      });
      blockPropagation = false;
      Object.keys(untouched).forEach((key) => {
        cache[key].destroyScope();
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
