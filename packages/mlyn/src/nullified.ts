const mockFunction = () => "test value";

export const isNullified = (value) => value && value[IS_NULLIFIED];

export const IS_NULLIFIED = Symbol("IS_NULLIFIED");

let wrapsCount = 0;

export const nullifiedSafe = (cb) => {
  return () => {
    wrapsCount++;
    try {
      const result = cb();
      wrapsCount--;
      return result;
    } catch (ns) {
      wrapsCount--;
      return ns;
    }
  };
};

export const nullified = (value) =>
  new Proxy(mockFunction, {
    get(target, key) {
      if (key === IS_NULLIFIED) {
        return true;
      }
      return nullified(value);
    },
    apply() {
      if (wrapsCount > 0) {
        throw value;
      }
      return value;
    },
  });
