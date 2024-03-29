import { runInReactiveScope, muteScope, reactive } from "../src/scope";
import { createSubject, batch } from "../src/subject";

describe("scope", () => {
  it("should run in scope", () => {
    const logs: string[] = [];
    const subject = createSubject({
      user: {
        firstName: "John",
        lastName: "Smith",
      },
    });
    const scope = runInReactiveScope(() => {
      logs.push(`user name is ${subject.user.firstName()}`);
    });
    subject.user.firstName("Abraham");
    subject.user({ ...subject.user(), firstName: "Albert" });
    subject.user({ ...subject.user(), lastName: "Lincoln" });
    scope.destroy();
    subject.user.firstName("Lion");
    expect(logs).toEqual([
      `user name is John`,
      `user name is Abraham`,
      `user name is Albert`,
    ]);
  });

  it("should not retrigger scope by an update", () => {
    const a = createSubject({ foo: 1, bar: 1 });
    const b = createSubject(0);
    runInReactiveScope(() => {
      b(a.foo() + 1);
    });
    expect(b()).toEqual(2);
    a({ foo: 2, bar: 0 });
    expect(b()).toEqual(3);
  });

  it("should not rerun muted scope", () => {
    const subject = createSubject({
      root: 0,
      muted: 0,
    });
    let lastRoot;
    let lastMuted;
    let nestedScope;
    runInReactiveScope(() => {
      lastRoot = subject.root();
      if (!nestedScope) {
        muteScope(() => {
          lastMuted = subject.muted();
        });
      }
    });
    // first run
    expect(lastRoot).toEqual(0);
    expect(lastMuted).toEqual(0);

    subject.muted(subject.muted() + 1);
    // lastMuted is assigned in muted scope, should not be updated
    expect(lastMuted).toEqual(0);

    subject({ root: 1, muted: 1 });
    expect(lastRoot).toEqual(1);
    expect(lastMuted).toEqual(1);
  });

  it("should not invoke when value unchanged", () => {
    const s$ = createSubject({ a: 0 });
    let invocations = 0;
    runInReactiveScope(() => {
      s$.a();
      invocations++;
    });
    expect(invocations).toEqual(1);
    s$.a(0);
    expect(invocations).toEqual(1);
    s$({ a: 1 });
  });

  it("should invoke unsubscribe", () => {
    let invoked = false;
    runInReactiveScope(() => () => (invoked = true)).destroy();
    expect(invoked).toEqual(true);
  });

  it("invoked scope should not add dependencies", () => {
    const input = createSubject(1);
    const output = createSubject(0);
    let outputCalls = 0;
    runInReactiveScope(() => {
      output();
      outputCalls++;
    });
    runInReactiveScope(() => {
      output(input());
    });
    expect(outputCalls).toEqual(2);
    input(2);
    expect(outputCalls).toEqual(3);
  });

  it("manage deleted observed keys", () => {
    type Subscription = { user?: { firstName: string }; country: string };
    const state = createSubject<Subscription>({
      user: { firstName: "Urshulia" },
      country: "vkl",
    });
    let invocationsCount = 0;
    runInReactiveScope(() => {
      invocationsCount++;
    });
    expect(invocationsCount).toEqual(1);
    state({ country: "rp" });
    expect(invocationsCount).toEqual(1);
  });

  it("manage deleted observed array entries", () => {
    const { tags } = createSubject({
      tags: [{ label: "a" }, { label: "b" }, { label: "c" }],
    });
    let log;
    const firstTag = tags[0];
    runInReactiveScope(() => {
      log = firstTag.label();
    });
    expect(log).toEqual("a");
    tags(tags().slice(0, -1));
    expect(log).toEqual("a");
  });

  it("run tracked", () => {
    const a = createSubject(1);
    let lastValue = 0;
    const scope = reactive(() => {
      lastValue = a.__value;
    });
    scope.runTracked(() => {
      a();
    })
    a(2);
    expect(lastValue).toBe(2);
  });
});
