import { act, render } from "@testing-library/react";
import { createSubject } from "mlyn";
import React from "react";
import { Mlyn } from "../src/dom";

const mapChildren = (container) =>
  [...container.children].map((c) => c.innerHTML);


test("simple update", async () => {
  const item$ = createSubject("a");
  const { container } = render(
    <Mlyn.Div>{item$}</Mlyn.Div>
  );
  expect(mapChildren(container)).toEqual(["a"]);
  act(() => {
    item$("d");
  });
  expect(mapChildren(container)).toEqual(["d"]);
});
