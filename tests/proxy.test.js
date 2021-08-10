import { createProxy, batch } from "./proxy";
import { runInContext } from "./context";

describe("proxy", () => {
  it("accessing proxy value", () => {
    const proxy = createProxy({
      host: {
        count: 0,
      },
    });
    expect(proxy.host.count()).toBe(0);
  });

  it("updating proxy value", () => {
    const initialValue = {
      count: 0,
    };
    const proxy = createProxy(initialValue);
    proxy.count = 1;
    expect(proxy.count()).toBe(1);
  });

  it("updating nested value", () => {
    const initialValue = {
      wrapper: {
        count: 0,
      },
    };
    const proxy = createProxy(initialValue);
    proxy.wrapper.count = 1;
    expect(proxy.wrapper.count()).toBe(1);
    expect(proxy.wrapper()).toEqual({ count: 1 });
    expect(proxy()).toEqual({ wrapper: { count: 1 } });
    expect(proxy().wrapper).toBe(proxy.wrapper());
    // original should not change!
    expect(initialValue).toEqual({ wrapper: { count: 0 } });
  });

  it("replace root value", () => {
    const proxy = createProxy(0);
    proxy(1);
    expect(proxy()).toBe(1);
  });

  it("replace complex root value", () => {
    const proxy = createProxy({ count: 0 });
    // important to trigger cache
    expect(proxy.count()).toBe(0);
    proxy({ count: 1 });
    expect(proxy()).toEqual({ count: 1 });
    // child propagation
    expect(proxy.count()).toBe(1);
  });

  it("reconcile should update only changed", () => {
    const foo = { value: 1 };
    const bar = { value: 1 };
    const foo2 = { value: 2 };
    const proxy = createProxy({
      foo,
      bar,
    });
    // important to trigger cache
    expect(proxy.foo()).toBe(foo);

    proxy({ ...proxy(), foo: foo2 });

    expect(proxy.foo()).not.toBe(foo);
    expect(proxy.bar()).toBe(bar);

    proxy({ ...proxy(), bar: { value: 2 } });

    expect(proxy.foo()).toBe(foo2);
    expect(proxy.bar()).not.toBe(bar);

    // let check root
    expect(proxy()).toEqual({
      foo: { value: 2 },
      bar: { value: 2 },
    });
  });

  it("working with destructured properties", () => {
    const proxy = createProxy({ foo: 0, bar: 1 });
    const { foo, bar } = proxy;
    expect(foo(1)).toEqual(1);
    expect(bar(2)).toEqual(2);
    expect(proxy()).toEqual({ foo: 1, bar: 2 });
  });
});

describe("batch updated", () => {
  test("do not disptach changes untill batch passed", () => {
    const logs = [];
    const { foo, bar } = createProxy({ foo: 0, bar: 1 });
    runInContext(() => logs.push(`${foo()}-${bar()}`));
    batch(() => {
      foo(1);
      bar(2);
    });
    expect(logs).toEqual(["0-1", "1-2"]);
  });

  test("batch tree mutation leaf to root", () => {
    const logs = [];
    const proxy = createProxy({ foo: 0, bar: 1 });
    const { bar } = proxy;
    runInContext(() => logs.push(`${proxy().foo}-${bar()}`));
    proxy.bar = 2;
    proxy({ ...proxy(), bar: 3 });
    expect(logs).toEqual(["0-1", "0-2", "0-3"]);
  });

  test.skip("invoking batched context", () => {
    const { showFull, firstName, lastName } = createProxy({
      showFull: true,
      firstName: "John",
      lastName: "Smith",
    });
    const logs = [];
    runInContext(() => {
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
