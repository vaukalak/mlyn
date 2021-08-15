import { createSubject, batch } from "../src/subject";
import { runInReactiveScope } from "../src/scope";

describe("monitors", () => {
    let monitor;
    beforeEach(() => {
        monitor = {
            history: [],
            initiator: [],
            runningTransaction: false,
            transactionsStarted: 0,
            init: (state) => {
                monitor.history.push({ state, initiator: [] });
            },
            startTransaction: () => {
                monitor.initiator = [];
                monitor.transactionsStarted++;
                monitor.runningTransaction = true;
            },
            entryUpdated: (update) => {
                monitor.initiator.push(update);
            },
            isTransactionRunning: () => {
                return monitor.runningTransaction;
            },
            endTransaction: (state) => {
                monitor.history.push({ state, initiator: monitor.initiator })
                monitor.runningTransaction = false;
            }
        };
    });

    it("should start and end transaction", () => {
        const sub = createSubject(0, { monitor });
        expect(monitor.transactionsStarted).toEqual(0);
        sub(1);
        expect(monitor.runningTransaction).toEqual(false);
        expect(monitor.transactionsStarted).toEqual(1);
    });

    it("should not start transaction on child nodes update", () => {      
        const sub = createSubject({ a: 0, b: 0 }, { monitor });
        sub.a = 2;
        expect(monitor.runningTransaction).toEqual(false);
        expect(monitor.transactionsStarted).toEqual(1);
        sub({ a: 2, b: 3 });
        expect(monitor.runningTransaction).toEqual(false);
        expect(monitor.transactionsStarted).toEqual(2);
    });

    it("should create history report", () => {      
        const sub = createSubject({ a: { foo: 0 }, b: 0 }, { monitor });
        sub.a = { foo: 1 };
        expect(monitor.history).toEqual([
            { state: { a: { foo: 0 }, b: 0 }, initiator: [] },
            { state: { a: { foo: 1 }, b: 0 }, initiator: [{ a: { foo: 1 } }] },
        ]);
        sub.a.foo = 2;
        expect(monitor.history).toEqual([
            { state: { a: { foo: 0 }, b: 0 }, initiator: [] },
            { state: { a: { foo: 1 }, b: 0 }, initiator: [{ a: { foo: 1 } }] },
            { state: { a: { foo: 2 }, b: 0 }, initiator: [{ a: { foo: 2 } }, { foo: 2 }] },
        ])
    });
})