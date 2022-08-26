import React from "react";
import { render, act } from "@testing-library/react";
import { createSubject } from "mlyn";
import Mlyn, { For } from "../src";

const mapChildren = (container) =>
  [...container.children].map((c) => c.innerHTML);

test("displays entries", async () => {
  const items$ = createSubject(["a", "b", "c"]);
  const { container } = render(
    <For each={items$}>{(e$) => <div>{e$()}</div>}</For>
  );
  expect(mapChildren(container)).toEqual(["a", "b", "c"]);
});

test("add entries", async () => {
  const items$ = createSubject(["a", "b", "c"]);
  const { container } = render(
    <For each={items$}>{(e$) => <div>{e$()}</div>}</For>
  );
  expect(mapChildren(container)).toEqual(["a", "b", "c"]);
  act(() => {
    items$([...items$(), "d"]);
  });
  expect(mapChildren(container)).toEqual(["a", "b", "c", "d"]);
  // act(() => { items$(items$().slice(1)) });
  // expect(mapChildren(container)).toEqual(["b", "c", "d"]);
});

test("remove first entry", async () => {
  const items$ = createSubject(["a", "b", "c"]);
  const { container } = render(
    <For each={items$}>{(e$) => <div>{e$()}</div>}</For>
  );
  expect(mapChildren(container)).toEqual(["a", "b", "c"]);
  act(() => {
    items$(items$().slice(1));
  });
  expect(mapChildren(container)).toEqual(["b", "c"]);
});

test("remove mid entry", async () => {
  const items$ = createSubject(["a", "b", "c"]);
  const { container } = render(
    <For each={items$}>{(e$) => <div>{e$()}</div>}</For>
  );
  expect(mapChildren(container)).toEqual(["a", "b", "c"]);
  act(() => {
    items$([...items$().slice(0, 1), ...items$().slice(2)]);
  });
  expect(mapChildren(container)).toEqual(["a", "c"]);
});

const idGen = () => {
  let i = 0;
  return () => (i++).toString();
};

test("insert entries", async () => {
  const id = idGen();
  const item = (v) => ({ v, id: id() });
  const items$ = createSubject([item("a"), item("b")]);
  const { container } = render(
    <For each={items$}>{(e$) => <Mlyn.Div>{e$.v()}</Mlyn.Div>}</For>
  );
  expect(mapChildren(container)).toEqual(["a", "b"]);
  act(() => {
    items$([...items$(), item("c")]);
  });
  expect(mapChildren(container)).toEqual(["a", "b", "c"]);
});

test("update entries", async () => {
  const id = idGen();
  const item = (v) => ({ v, id: id() });
  const items$ = createSubject([item("a"), item("b"), item("c")]);
  const { container } = render(
    <For each={items$}>{(e$) => <Mlyn.Div>{e$.v()}</Mlyn.Div>}</For>
  );
  expect(mapChildren(container)).toEqual(["a", "b", "c"]);
  act(() => {
    items$[1].v("d");
  });
  expect(mapChildren(container)).toEqual(["a", "b", "c"]);
});

test("indexes updated on remove", async () => {
  const id = idGen();
  const item = (v) => ({ v, id: id() });
  const items$ = createSubject([item("a"), item("b")]);
  const { container } = render(
    <For each={items$}>{(e$, i$) => <Mlyn.Div>{i$}</Mlyn.Div>}</For>
  );
  expect(mapChildren(container)).toEqual(["0", "1"]);
  act(() => {
    items$(items$().slice(1));
  });
  expect(mapChildren(container)).toEqual(["0"]);
});

test("remove only entry", async () => {
  const id = idGen();
  const item = (v) => ({ v, id: id() });
  const items$ = createSubject([item("a"), item("b")]);
  const { container } = render(
    <For each={items$}>{(e$) => <Mlyn.Div>{e$.v()}</Mlyn.Div>}</For>
  );
  expect(mapChildren(container)).toEqual(["a", "b"]);
  act(() => {
    items$(items$().slice(1));
  });
  expect(mapChildren(container)).toEqual(["b"]);
  act(() => {
    items$(items$().slice(1));
  });
  expect(mapChildren(container)).toEqual([]);
});

test("add entries to start", async () => {
  const id = idGen();
  const item = (v) => ({ v, id: id() });
  const a = item("a");
  const b = item("b");
  const items$ = createSubject([a]);
  const { container } = render(
    <For each={items$}>
      {(e$, $i) => <Mlyn.Div>{() => `${e$.v()}-${$i()}`}</Mlyn.Div>}
    </For>
  );
  expect(mapChildren(container)).toEqual(["a-0"]);
  act(() => {
    items$([b, ...items$()]);
  });
  expect(mapChildren(container)).toEqual(["b-0", "a-1"]);
});

test("bindback", async () => {
  const id = idGen();
  const item = (v) => ({ v, id: id() });
  const items$ = createSubject([item("a")]);
  let onClick;
  const { container } = render(
    <For each={items$}>
      {(e$) => {
        onClick = () => e$.v("b");
        return <Mlyn.Div>{e$.v}</Mlyn.Div>;
      }}
    </For>
  );
  expect(mapChildren(container)).toEqual(["a"]);

  act(() => {
    onClick();
  });
  expect(mapChildren(container)).toEqual(["b"]);
  expect(items$()[0].v).toEqual("b");
});

test("bind-back when index changed", async () => {
  const id = idGen();
  const item = (v) => ({ v, id: id() });
  const a = item("a");
  const b = item("b");
  const items$ = createSubject([a]);
  const bindBackCallbacks = [];
  const { container } = render(
    <For each={items$}>
      {(e$, $i) => {
        bindBackCallbacks.push(e$);
        return <Mlyn.Div>{() => `${e$.v()}`}</Mlyn.Div>;
      }}
    </For>
  );
  expect(mapChildren(container)).toEqual(["a"]);
  act(() => {
    items$([b, ...items$()]);
  });
  expect(mapChildren(container)).toEqual(["b", "a"]);
  // the one which has been pushed first
  act(() => {
    bindBackCallbacks[0].v("c");
  });
  expect(mapChildren(container)).toEqual(["b", "c"]);
});

describe("keyed updates", () => {
  it("should display entries with a computed key", () => {
    const items$ = createSubject(["a", "b", "c"]);
    const { container } = render(
      <For each={items$} getKey={(item) => item}>
        {(e$) => <div>{e$()}</div>}
      </For>
    );
    expect(mapChildren(container)).toEqual(["a", "b", "c"]);
  });

  it("should swap first and last entries", () => {
    const items$ = createSubject(["a", "b", "c"]);
    const { container } = render(
      <For each={items$} getKey={(item) => item}>
        {(e$) => <div>{e$()}</div>}
      </For>
    );
    expect(mapChildren(container)).toEqual(["a", "b", "c"]);
    act(() => {
      items$(["c", "b", "a"]);
    });
    expect(mapChildren(container)).toEqual(["c", "b", "a"]);
  });
});
