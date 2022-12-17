import { createHostSubject, createSubject, reactive } from "mlyn";

const mapValues = <T>(values, cb, initial = {}) => {
  return Object.keys(values).reduce((composition, key) => {
    composition[key] = cb(key, values[key], values);
    return composition;
  }, initial);
};

export const createForm = ({ initialValues, validate = {} }) => {
  const [values, valueDisposer] = createHostSubject(
    mapValues(initialValues, (key, value) => createSubject(value))
  );
  const errorsSpec = mapValues(initialValues, (key, value) => {
    return () => validate[key](values[key], values);
  })
  const [errors, errorDisposers] = createHostSubject(errorsSpec);
  const [touched, touchedDisposers] = createHostSubject(
    mapValues(initialValues, () => createSubject(false))
  );

  const [focused, focusedDisposers] = createHostSubject(
    mapValues(initialValues, () => createSubject(false))
  );

  const fieldSpecs = {};
  const fieldEntryDisposers = {};
  for (let key in initialValues) {
    const [newField, disposer] = createHostSubject({
      value: values[key],
      touched: touched[key],
      error: errorsSpec[key],
      focused: focused[key],
      onBlur: () => {
        touched[key](true);
      },
      onFocus: () => {},
    });
    fieldSpecs[key] = newField;
    fieldEntryDisposers[key] = disposer;
  }

  const [fields, filedsDisposer] = createHostSubject(fieldSpecs);
  return [
    {
      values,
      touched,
      focused,
      errors,
      fields,
    },
    () => {
      valueDisposer();
      errorDisposers();
      touchedDisposers();
      focusedDisposers();
      filedsDisposer();
      for (let key in fieldEntryDisposers) {
        fieldEntryDisposers[key]();
      }
    }
  ] as const;
};
