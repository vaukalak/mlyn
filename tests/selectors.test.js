import { createSubject } from "../src/subject";
import { createSyncronizer, createSubjectSelector } from "../src/selectors";
import { runInReactiveScope } from "../src/scope";

describe("syncronizer", () => {
    it("syncronizer should bind syncronized subject", () => {
        const outSubject = createSubject(undefined);
        const inSubject = createSubject({ value: 1 });
        const inSubject2 = createSubject({ value: 1 });
        const syncronize = createSyncronizer(outSubject);
        let lastValue;
        runInReactiveScope(() => {
            lastValue = outSubject();
        });
        syncronize(inSubject);
        expect(lastValue).toEqual({ value: 1 });
        inSubject.value = 2;
        expect(lastValue).toEqual({ value: 2 });
        syncronize(inSubject2);
        expect(lastValue).toEqual({ value: 1 });
        inSubject.value = 3;
        expect(lastValue).toEqual({ value: 1 });
        outSubject.value = 4;
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
        const resulting = findSelector(subject, (a) => {
            return a.value === 0;
        });
        expect(resulting()).toEqual({ value: 0 });
        const newItems = subject().slice(1);
        subject(newItems);
        expect(resulting()).toEqual(undefined);
    })
});