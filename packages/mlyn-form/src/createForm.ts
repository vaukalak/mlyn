import { createHostSubject, createSubject, reactive } from "mlyn";

const mapValues = <T>(values, cb, initial = {}) => {
  return Object.keys(values).reduce((composition, key) => {
    composition[key] = cb(key, values[key], values);
    return composition;
  }, initial);
};

const createFields = (initialValues, values, touched, errorsSpec, focused) => {
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
    const initialFieldValue = initialValues[key];
    // if (typeof initialFieldValue === "object") {
    //   for (let subKey in )
    // }
    fieldSpecs[key] = newField;
    fieldEntryDisposers[key] = disposer;
  }
  const [field, fieldDisposer] = createHostSubject(fieldSpecs);

  return [
    field,
    () => {
      for (let key in fieldEntryDisposers) {
        fieldEntryDisposers[key]();
      }
      fieldDisposer();
    },
  ];
};

export const createForm = ({ initialValues, validate = {} }) => {
  const [values, valueDisposer] = createHostSubject(
    mapValues(initialValues, (key, value) => createSubject(value))
  );
  const errorsSpec = mapValues(initialValues, (key, value) => {
    return () => validate[key](values[key], values);
  });
  const [errors, errorDisposers] = createHostSubject(errorsSpec);
  const [touched, touchedDisposers] = createHostSubject(
    mapValues(initialValues, () => createSubject(false))
  );

  const [focused, focusedDisposers] = createHostSubject(
    mapValues(initialValues, () => createSubject(false))
  );

  const [fields, filedsDisposer] = createFields(
    initialValues,
    values,
    touched,
    errorsSpec,
    focused
  );
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
    },
  ] as const;
};
