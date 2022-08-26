import { createBlock, createSubject, runInReactiveScope, batch } from "mlyn";

export const createHistory = () => {
  const past$ = createSubject([]);
  const blocked = createBlock();
  const future$ = createSubject([]);
  const jumpTo = (index) => {
    // @ts-ignore
    const history = past$.__value;
    if (index < history.length) {
      const past = history.slice(0, index);
      const futureItems = history.slice(index);
      batch(() => {
        // @ts-ignore
        future$([...futureItems, ...future$.__value]);
        past$(past);
      });
    } else {
      const prevFuture = future$();
      const futureIndex = index - history.length;
      const past = [...history, ...prevFuture.slice(0, futureIndex)];
      const future = [...prevFuture.slice(futureIndex)];
      batch(() => {
        past$(past);
        future$(future);
      });
    }
  };
  const undo = () => {
    jumpTo(past$().length - 1);
  };
  const redo = () => {
    jumpTo(past$().length);
  };
  const canUndo$ = () => past$().length > 1;
  const canRedo$ = () => future$().length > 0;
  const reset = () => {
    batch(() => {
      past$([past$()[0]]);
      future$([]);
    });
  };
  const commit = () => {
    // @ts-ignore
    past$([past$.__value[past$.__value.length - 1]]);
  };
  const observe = (subject$) => {
    const c2hScope = runInReactiveScope(() => {
      const newValue = subject$();
      blocked(() => {
        future$([]);
        // @ts-ignore
        past$([...past$.__value, newValue]);
      });
    });
    const h2cScope = runInReactiveScope(() => {
      const history = past$();
      blocked(() => subject$(history[history.length - 1]));
    });
    return {
      destroy: () => {
        c2hScope.destroy();
        h2cScope.destroy();
      },
    };
  };
  return {
    past$,
    commit,
    future$,
    entries$: () => [...past$(), ...future$()],
    canUndo$,
    canRedo$,
    reset,
    redo,
    undo,
    jumpTo,
    observe,
  };
};
