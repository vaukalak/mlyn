import { createForm } from "../src/createForm";

describe("createForm", () => {
  const initialValues = {
    firstName: "Barbara",
    lastName: "Radzivil",
  };
  it("should map fields to new object", () => {
    const [{ values }] = createForm({
      initialValues,
    });
    expect(values.firstName()).toBe("Barbara");
    expect(values.lastName()).toBe("Radzivil");
  });

  describe("touched", () => {
    it("should all fields should not be touched", () => {
      const [{ touched }] = createForm({
        initialValues,
      });
      expect(touched.firstName()).toBe(false);
      expect(touched.lastName()).toBe(false);
    });

    it("should mark field as touched onBlur", () => {
      const [{ fields, touched }] = createForm({
        initialValues,
      });
      expect(touched.firstName()).toBe(false);
      fields.firstName.onBlur();
      expect(touched.firstName()).toBe(true);
    });
  });

  describe("errors", () => {
    it("should validate errors on start", () => {
      const [{ errors }] = createForm({
        initialValues: { password: "" },
        validate: {
          password: (v) => (v().length >= 8 ? undefined : "error!"),
        },
      });
      expect(errors.password()).toBe("error!");
    });

    it("should validate errors on change", () => {
      const [{ errors, values }] = createForm({
        initialValues: { password: "" },
        validate: {
          password: (v) => (v().length >= 8 ? undefined : "error!"),
        },
      });
      values.password("12345678");
      expect(errors.password()).toBe(undefined);
    });
  });
});
