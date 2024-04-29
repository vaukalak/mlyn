import { createSubject } from "../src/subject";
import {
  createSyncronizer,
  createSubjectSelector,
  projectSubject,
} from "../src/selectors";
import { runInReactiveScope } from "../src/scope";

describe("syncronizer", () => {
  it("syncronizer should bind syncronized subject", () => {
    const outSubject = createSubject<T>(undefined);
    type T = { value: number };
    const inSubject = createSubject<T>({ value: 1 });
    const inSubject2 = createSubject<T>({ value: 1 });
    const [syncronize] = createSyncronizer(outSubject);
    let lastValue;
    runInReactiveScope(() => {
      lastValue = outSubject();
    });
    syncronize(inSubject);
    expect(lastValue).toEqual({ value: 1 });
    inSubject.value(2);
    expect(lastValue).toEqual({ value: 2 });
    syncronize(inSubject2);
    expect(lastValue).toEqual({ value: 1 });
    inSubject.value(3);
    expect(lastValue).toEqual({ value: 1 });
    outSubject.value(4);
    expect(inSubject()).toEqual({ value: 3 });
    expect(inSubject2()).toEqual({ value: 4 });
    expect(lastValue).toEqual({ value: 4 });
  });

  it("should run selector", () => {
    const subject = createSubject([{ value: 0 }, { value: 1 }]);
    const nonFoundSubject = createSubject(undefined);
    const findSelector = createSubjectSelector((array, search) => {
      const index = array().findIndex(search);
      return index === -1 ? nonFoundSubject : array[index];
    });
    const [resulting] = findSelector(subject, (a) => {
      return a.value === 0;
    });
    expect(resulting()).toEqual({ value: 0 });
    const newItems = subject().slice(1);
    subject(newItems);
    expect(resulting()).toEqual(undefined);
  });
});

describe("projectSubject", () => {
  it("it should allow 2-way for dynamically referenced value", () => {
    const subject$ = createSubject<Record<string, string>>({
      barbara: "1520/12/6",
      ursulia: "1705/02/13",
    });
    const name$ = createSubject("barbara");
    const [date$, destroyDate] = projectSubject(() => subject$[name$()]);
    date$("12");
    expect(subject$.barbara()).toBe("12");
    destroyDate();
  });

  it("it should react when selector dependency changes", () => {
    const subject$ = createSubject<Record<string, string>>({
      barbara: "1520/12/6",
      ursulia: "1705/02/13",
    });
    const name$ = createSubject("barbara");
    const [date$, destroyDate] = projectSubject(() => {
      return subject$[name$()];
    });
    const dates = [];
    runInReactiveScope(() => {
      dates.push(date$());
    });
    name$("ursulia");
    expect(dates).toEqual(["1520/12/6", "1705/02/13"]);

    date$("12");
    expect(subject$.ursulia()).toBe("12");
    
    destroyDate();
    name$("barbara");
    expect(dates).toEqual(["1520/12/6", "1705/02/13", "12"]);
    date$("11");
    expect(subject$.ursulia()).toBe("12");
  });
});
