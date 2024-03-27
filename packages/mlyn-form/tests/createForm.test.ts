import { Subject } from "mlyn";
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

    it("should work when changing value through `field` object.", () => {
      const [form] = createForm({
        initialValues: {
          firstName: "",
        },
        validate: {
          firstName: (s: Subject<string>) => {
            return s().length === 0;
          },
        },
      });
      const { fields, errors } = form;
      const { firstName } = fields;
      firstName.value("1");
      expect(errors.firstName()).toBe(false);
    });
  });

  describe("nested entries", () => {
    it("should validate array entries", () => {
      const [form] = createForm({
        initialValues: {
          names: ["barbara", "", "ganna"],
        },
        validate: {
          names: (s: Subject<string[]>) => {
            const errors = s().map((name) =>
              name.length === 0 ? "empty" : ""
            );
            return errors.find(Boolean) ? errors : null;
          },
        },
      });
      const { fields, errors } = form;
      const { names } = fields;
      expect(errors.names()).toEqual(["", "empty", ""]);
      names.value[1]("bonasforza");
      expect(errors.names()).toBe(null);
    });

    it("should validate array of objects entries", () => {
      const [form] = createForm({
        initialValues: {
          names: [
            { first: "barbara", last: "radzivil" },
            { first: "bona", last: "" },
          ],
        },
        validate: {
          names: (s: Subject<{ first: string; last: string }[]>) => {
            const errors = s().map((name) => {
              const first = name.first.length === 0 ? "empty" : "";
              const last = name.last.length === 0 ? "empty" : "";
              return first || last
                ? {
                    first,
                    last,
                  }
                : null;
            });
            return errors.find(Boolean) ? errors : null;
          },
        },
      });
      const { fields, errors } = form;
      const { names } = fields;
      expect(errors.names()).toEqual([null, { first: "", last: "empty" }]);
      names.value[1].last("sforza");
      expect(errors.names()).toBe(null);
    });
  });
});
