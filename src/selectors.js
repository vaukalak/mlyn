import { createSubject } from "./subject";
import { runInReactiveScope, destroyScope } from "./scope";

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
    const resultingSubject = createSubject();
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

// todo: cover with tests
export const createSelector = (projection, equal) => {
  return (...args) => {
    const resultingSubject = createSubject();
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