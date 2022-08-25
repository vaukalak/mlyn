const mockFunction = () => "test value";

export const isNullified = (value) => value && value[IS_NULLIFIED];

export const IS_NULLIFIED = Symbol("IS_NULLIFIED");

export const nullified = (value) =>
  new Proxy(mockFunction, {
    get(target, key) {
      if (key === IS_NULLIFIED) {
        return true;
      }
      return nullified(value);
    },
    apply() {
      return value;
    },
  });
