import { nullified, nullifiedSafe } from "../src/nullified";
import { reactive } from "../src/scope";
import { createSubject } from "../src/subject";

describe("nullify", () => {
  it("should read read keys recursively", () => {
    const subj$ = createSubject(nullified(1));
    expect(subj$()).toBe(1);
    expect(subj$.someTestKey()).toBe(1);
  });

  it("should react to nullified change", () => {
    const n = nullified(1);
    const subj$ = createSubject(n);
    expect(subj$()).toBe(1);
    expect(subj$.foo()).toBe(1);
    subj$({ foo: 2 });
    expect(subj$()).toEqual({ foo: 2 });
    expect(subj$.foo()).toBe(2);
    subj$(n);
    expect(subj$()).toEqual(1);
    expect(subj$.foo()).toBe(1);
  });

  it("if composed value is nullified", () => {
    const n = nullified(1);
    const subj$ = createSubject(n);
    const wrapped = nullifiedSafe(() => `${subj$.a()} _ ${subj$.b()}`);
    expect(wrapped()).toBe(1);
    subj$({ a: "a", b: "b"});
    expect(wrapped()).toBe(`a _ b`);
  });

  it("should subscribe to nullified leaf", () => {
    const subj$ = createSubject(nullified(1));
    const results: any[] = [];
    reactive(() => { results.push(subj$.foo()); });
    subj$({ foo: 2 });
    expect(results).toEqual([1, 2]);
  });
});
