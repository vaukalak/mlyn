import { createSubject } from "../src/subject";
import { createHostSubject } from "../src/hostSubject";
import { runInReactiveScope } from "../src/scope";

describe("host subjects", () => {
  test("nested subject should be reflected in the host value", () => {
    const foo = createSubject("a");
    const [s$] = createHostSubject({ foo });
    expect(s$()).toEqual({ foo: "a" });
  });

  test("nested subject change should update to the host", () => {
    const foo = createSubject("a");
    const [s$] = createHostSubject({ foo });
    foo("b");
    expect(s$()).toEqual({ foo: "b" });
  });

  test("nested subject change should update to the leaf value", () => {
    const foo = createSubject("a");
    const [s$] = createHostSubject({ foo });
    foo("b");
    expect(s$.foo()).toEqual("b");
  });

  test("nested subject change make the host dispatch", () => {
    const scope = jest.fn();
    const foo = createSubject("a");
    const [s$] = createHostSubject({ foo });
    runInReactiveScope(() => {
      scope(s$());
    });
    foo("b");
    expect(scope.mock.calls[0]).toEqual([{ foo: "a" }]);
    expect(scope.mock.calls[1]).toEqual([{ foo: "b" }]);
  });

  test("nested subject change make the host leaf dispatch", () => {
    const scope = jest.fn();
    const foo = createSubject("a");
    const [s$] = createHostSubject({ foo });
    runInReactiveScope(() => {
      scope(s$.foo());
    });
    foo("b");
    expect(scope.mock.calls[0]).toEqual(["a"]);
    expect(scope.mock.calls[1]).toEqual(["b"]);
  });

  test.only("function shouldn't be detected as a subject", () => {
    const foo = jest.fn(() => {
      console.log(1);
    });
    createHostSubject({ foo });
    expect(foo).not.toBeCalled();
  });

  test("host change should update guest proxy", () => {
    const foo = createSubject("a");
    const [s$] = createHostSubject({ foo });
    s$({ foo: "b" });
    expect(foo()).toEqual("b");
  });
  
  test("guest subjects should unsync on dispose", () => {
    const foo = createSubject("a");
    const [s$, dispose] = createHostSubject({ foo });
    dispose();
    s$({ foo: "b" });
    expect(foo()).toEqual("a");
  });

  test("host subjects should unsync on dispose", () => {
    const foo = createSubject("a");
    const [s$, dispose] = createHostSubject({ foo });
    dispose();
    foo("b");
    expect(s$()).toEqual({ foo: "a" });
  });

  test("host subjects can hold functions", () => {
    const foo = jest.fn();
    const [s$] = createHostSubject({ foo });
    expect(foo).not.toBeCalled();
    s$.foo();
    expect(foo).toBeCalled();
  });
  
  test("host subjects should have host children", () => {
    const foo = jest.fn();
    const [child] = createHostSubject({ foo });
    const [s$] = createHostSubject({ child });
    expect(foo).not.toBeCalled();
    s$.child.foo();
    expect(foo).toBeCalled();
  });
});
