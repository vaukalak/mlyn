import { createSubject, batch } from "../src/subject";
import { runInReactiveScope } from "../src/scope";

describe("subject", () => {
  it("accessing subject value", () => {
    const subject = createSubject({
      host: {
        count: 0,
      },
    });
    expect(subject.host.count()).toBe(0);
  });

  it("updating subject value", () => {
    const initialValue = {
      count: 0,
    };
    const subject = createSubject(initialValue);
    subject.count(1);
    expect(subject.count()).toBe(1);
  });

  it("updating nested value", () => {
    const initialValue = {
      wrapper: {
        count: 0,
      },
    };
    const subject = createSubject(initialValue);
    subject.wrapper.count(1);
    expect(subject.wrapper.count()).toBe(1);
    expect(subject.wrapper()).toEqual({ count: 1 });
    expect(subject()).toEqual({ wrapper: { count: 1 } });
    expect(subject().wrapper).toBe(subject.wrapper());
    // original should not change!
    expect(initialValue).toEqual({ wrapper: { count: 0 } });
  });

  it("replace root value", () => {
    const subject = createSubject(0);
    subject(1);
    expect(subject()).toBe(1);
  });

  it("replace complex root value", () => {
    const subject = createSubject({ count: 0 });
    // important to trigger cache
    expect(subject.count()).toBe(0);
    subject({ count: 1 });
    expect(subject()).toEqual({ count: 1 });
    // child propagation
    expect(subject.count()).toBe(1);
  });

  it("should update subject from subject field subscription", () => {
    const subject = createSubject({
      firstName: "Barbara",
      lastName: "Radzivil",
    });
    runInReactiveScope(() => {
      if (subject.firstName() === "Alzhbeta") {
        subject.lastName("Sapeha");
      }
    });
    subject.firstName("Alzhbeta");
    expect(subject()).toEqual({ firstName: "Alzhbeta", lastName: "Sapeha" });
  });

  it("children should not dispatch back during reconciliation", () => {
    const firstState = {
      foo: { value: 1 },
    };
    const subject = createSubject(firstState);
    // this line is important, cause it creates a cache key
    // without it, test is not valid!
    expect(subject.foo.value()).toBe(1);

    const secondState = {
      foo: { value: 2 },
    };
    subject(secondState);
    expect(subject()).toBe(secondState);
  });

  it("reconcile should update only changed", () => {
    const foo = { value: 1 };
    const bar = { value: 1 };
    const foo2 = { value: 2 };
    const subject = createSubject({
      foo,
      bar,
    });
    // important to trigger cache
    expect(subject.foo()).toBe(foo);

    subject({ ...subject(), foo: foo2 });

    expect(subject.foo()).not.toBe(foo);
    expect(subject.bar()).toBe(bar);

    subject({ ...subject(), bar: { value: 2 } });

    expect(subject.foo()).toBe(foo2);
    expect(subject.bar()).not.toBe(bar);

    // let check root
    expect(subject()).toEqual({
      foo: { value: 2 },
      bar: { value: 2 },
    });
  });

  it("working with destructured properties", () => {
    const subject = createSubject({ foo: 0, bar: 1 });
    const { foo, bar } = subject;
    expect(foo(1)).toEqual(1);
    expect(bar(2)).toEqual(2);
    expect(subject()).toEqual({ foo: 1, bar: 2 });
  });

  it("subject can hold functions", () => {
    const foo = jest.fn();
    const subject = createSubject({ foo });
    expect(foo).not.toBeCalled();
    subject.foo();
    expect(foo).toBeCalled();
  });

  it("deleted node, should not affect parent, node", () => {
    const parent = createSubject<{ child?: any; a?: number }>({
      child: { value: 1 },
    });
    const { child } = parent;
    parent({ a: 1 }); // `child` will be unmounted
    child.value(2);
    expect(parent()).toEqual({ a: 1 });
  });
});

describe("array updates", () => {
  it("should properly update indexes", () => {
    const subject = createSubject({ tags: ["a", "b", "c"] });
    subject.tags[0]("d");
    expect(subject.tags()).toEqual(["d", "b", "c"]);
  });

  it("should properly update indexes on nested values", () => {
    const subject = createSubject({
      tags: [{ name: "a" }, { name: "b" }, { name: "c" }],
    });
    subject.tags[0].name("d");
    expect(subject.tags()).toEqual([
      { name: "d" },
      { name: "b" },
      { name: "c" },
    ]);
    subject.tags[0]({ name: "e" });
    expect(subject.tags()).toEqual([
      { name: "e" },
      { name: "b" },
      { name: "c" },
    ]);
  });

  it("should properly add / delete values", () => {
    const subject = createSubject({ tags: ["a", "b", "c"] });
    subject.tags([...subject.tags(), "d"]);
    expect(subject.tags()).toEqual(["a", "b", "c", "d"]);
    const [a, ...newTags] = subject.tags();
    subject.tags([...newTags]);
    expect(subject.tags()).toEqual(["b", "c", "d"]);
  });

  it("manage deleted key", () => {
    const subject = createSubject({ tags: ["a", "b", "c"] });
    let log = "";
    runInReactiveScope(() => {
      log = subject.tags[0]();
    });
    expect(log).toBe("a");
    const [a, ...newTags] = subject.tags();
    subject.tags(newTags);
    expect(log).toBe("b");
    subject.tags([]);
    // TODO: right now I think, that, if a key doesn't exist in object,
    // then it should be entirely unmounted from any parent subscription.
    expect(log).toBe("b");
  });

  it("swap items", () => {
    const subject = createSubject([
      { firstName: "Alberth" },
      { firstName: "Nicola" },
    ]);
    let log;
    runInReactiveScope(() => {
      log = subject[0].firstName();
    });
    expect(log).toEqual("Alberth");
    subject([subject[1](), subject[0]()]);
    expect(log).toEqual("Nicola");
  });
});

describe("batch updated", () => {
  test("do not disptach changes untill batch passed", () => {
    const logs = [];
    const { foo, bar } = createSubject({ foo: 0, bar: 1 });
    runInReactiveScope(() => logs.push(`${foo()}-${bar()}`));
    batch(() => {
      foo(1);
      bar(2);
    });
    expect(logs).toEqual(["0-1", "1-2"]);
  });

  test("batch tree mutation leaf to root", () => {
    const logs = [];
    const subject = createSubject({ foo: 0, bar: 1 });
    const { bar } = subject;
    runInReactiveScope(() => logs.push(`${subject().foo}-${bar()}`));
    subject.bar(2);
    subject({ ...subject(), bar: 3 });
    expect(logs).toEqual(["0-1", "0-2", "0-3"]);
  });

  test("invoking batched context", () => {
    const { showFull, firstName, lastName } = createSubject({
      showFull: true,
      firstName: "John",
      lastName: "Smith",
    });
    const logs = [];
    runInReactiveScope(() => {
      if (showFull()) {
        logs.push(`${firstName()} ${lastName()}`);
      } else {
        logs.push(firstName());
      }
    });
    firstName("Joseph");
    lastName("Lincoln");
    showFull(false);
    lastName("Enstein");
    firstName("Alberth");
    showFull(true);
    expect(logs).toEqual([
      "John Smith",
      "Joseph Smith",
      "Joseph Lincoln",
      "Joseph",
      // "Joseph", // lastName should not be dependency, if not listened
      "Alberth",
      "Alberth Enstein",
    ]);
  });
});
