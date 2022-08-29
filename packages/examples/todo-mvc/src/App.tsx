import React, { useEffect, useMemo, useRef } from "react";
import Mlyn, {
  For,
  useSubject,
  seal,
  useMlynEffect,
  useDestroyable,
} from "react-mlyn";
import { createHistory } from "mlyn-history";

// @ts-ignore
const useSyncronize = (subject$, key) => {
  if (localStorage[key]) subject$(JSON.parse(localStorage[key]));
  useMlynEffect(() => {
    localStorage[key] = JSON.stringify(subject$());
  });
};

const useHistory = (subject$: any) => {
  const history = useMemo(() => createHistory(), []);
  useEffect(() => {
    const { destroy } = history.observe(subject$);
    return () => {
      destroy();
    };
  }, []);
  return history;
};

const History = seal(({ history }: any) => {
  useSyncronize(history.past$, "past");
  useSyncronize(history.future$, "future");
  return (
    <>
      <Mlyn.Input
        type="range"
        step="1"
        onChange={(e) => {
          // @ts-ignore
          history.jumpTo(e.target.value);
        }}
        value$={() => history.past$().length}
        min={1}
        disabled$={() => history.entries$().length === 1}
        max$={() => history.entries$().length}
      />
      <button onClick={history.commit}>COMMIT</button>
    </>
  );
});

const App = seal(() => {
  const state$ = useSubject({
    todos: [] as { title: string; createdAt: string; done: boolean }[],
    newTitle: "",
  });

  const addItem = () => {
    state$({
      todos: [
        ...state$.todos(),
        {
          title: state$.newTitle(),
          createdAt: new Date().toISOString(),
          done: false,
        },
      ],
      newTitle: "",
    });
  };
  const removeItem = (i: number) => {
    state$.todos([
      ...state$.todos().slice(0, i),
      ...state$.todos().slice(i + 1),
    ]);
  };
  const form = useRef();

  const history = useHistory(state$.todos);
  return (
    <>
      <h3>TodoMVC example (Mlyn)</h3>
      {/* @ts-ignore */}
      <History history={history} />
      <br />
      <br />
      <form
        // @ts-ignore
        ref={form}
        id="new-todo"
        onSubmit={(e) => {
          e.preventDefault();
          addItem();
        }}
      >
        <Mlyn.Input
          type="text"
          onKeyPress={(event) => {
            if (event.which === 13) {
              // @ts-ignore
              form.current.dispatchEvent(new Event("submit"));
            }
          }}
          placeholder="enter todo and click +"
          bindValue={state$.newTitle}
        />
        <input type="submit" value="+" />
      </form>
      <For each={state$.todos} getKey={({ createdAt }) => createdAt}>
        {(todo$, index$) => (
          <div>
            <Mlyn.Input type="checkbox" bindChecked={todo$.done} />
            <Mlyn.Input bindValue={todo$.title} />
            <button onClick={() => removeItem(index$())}>x</button>
          </div>
        )}
      </For>
    </>
  );
});

export default App;
