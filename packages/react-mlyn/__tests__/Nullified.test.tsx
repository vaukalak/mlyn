import { act, render } from "@testing-library/react";
import { createSubject, nullified } from "mlyn";
import React from "react";
import { Mlyn } from "../src/dom";

const mapChildren = (container) =>
  [...container.children].map((c) => c.innerHTML);


test("nullfied update", async () => {
  const item$ = createSubject(nullified("a"));
  const { container } = render(
    <Mlyn.Div>{() => item$.some.path()}</Mlyn.Div>
  );
  expect(mapChildren(container)).toEqual(["a"]);
  act(() => {
    item$({ some: { path: "d" }});
  });
  expect(mapChildren(container)).toEqual(["d"]);
});
