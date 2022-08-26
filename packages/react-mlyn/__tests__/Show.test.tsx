import React from "react";
import { render, act } from "@testing-library/react";
import { createSubject } from "mlyn";
import Mlyn, { Show } from "../src";

const mapChildren = (container) =>
  [...container.children].map((c) => c.innerHTML);

test("hide / show entries", async () => {
  const show$ = createSubject(false);
  const { container } = render(
    <Show when={show$}>{() => <div>SHOW</div>}</Show>
  );
  expect(mapChildren(container)).toEqual([]);
  act(() => {
    show$(true);
  });
  expect(mapChildren(container)).toEqual(["SHOW"]);
});

test("show fallback", async () => {
  const show$ = createSubject(false);
  const { container } = render(
    <Show when={show$} fallback={() => <div>FALLBACK</div>}>
      {() => <div>SHOW</div>}
    </Show>
  );
  expect(mapChildren(container)).toEqual(["FALLBACK"]);
  act(() => {
    show$(true);
  });
  expect(mapChildren(container)).toEqual(["SHOW"]);
  act(() => {
    show$(false);
  });
  expect(mapChildren(container)).toEqual(["FALLBACK"]);
});
