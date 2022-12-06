import { IS_SUBJECT } from "./domain";
import { reactive } from "./scope";
import { createSubject } from "./subject";

type UnwrapSubject<T> = T extends (...arg: never[]) => infer R ? R : T;

type UnwrapMap<T extends Object> = {
  [Key in keyof T]: UnwrapSubject<T[Key]>;
};

const isSubject = (value) => {
  return typeof value === "function" && value[IS_SUBJECT];
};

export const createHostSubject = <T extends object>(subjectSpec: T) => {
  const computeObject = () => {
    return Object.keys(subjectSpec).reduce((composition, key) => {
      composition[key] = isSubject(subjectSpec[key])
        ? subjectSpec[key]()
        : subjectSpec[key];
      return composition;
    }, {}) as UnwrapMap<T>;
  };
  let resultSubject$;
  let lock = true;
  const disposeChildSync = reactive(() => {
    const value = computeObject();
    if (!resultSubject$) {
      resultSubject$ = createSubject<UnwrapMap<T>>(value);
    } else {
      if (!lock) {
        lock = true;
        resultSubject$(value);
        lock = false;
      }
    }
  });
  const disposeGuestSync = reactive(() => {
    const newValue = resultSubject$();
    if (!lock) {
      lock = true;
      for (const [key, value] of Object.entries(newValue)) {
        if (isSubject(subjectSpec[key])) {
          subjectSpec[key](value);
        }
      }
      lock = false;
    }
  });
  lock = false;
  return [
    resultSubject$,
    () => {
      disposeChildSync.destroy();
      disposeGuestSync.destroy();
    },
  ] as const;
};
