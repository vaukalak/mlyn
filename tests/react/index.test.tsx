import "@testing-library/jest-dom";
import React from "react";
import { renderHook } from "@testing-library/react-hooks";
import { useSubject, rc, useReactive } from "../../src/react"; // adjust the import path as needed
import { render, screen } from "@testing-library/react";
import { createSubject } from "../../src";

describe("useSubject", () => {
  it("should maintain the same subject across renders", () => {
    const { result, rerender } = renderHook(() => useSubject(10));

    const subject1 = result.current;
    rerender();
    const subject2 = result.current;

    expect(subject1).toBe(subject2);
  });
});

describe("useReactive", () => {
  it("should call the callback and clean up on unmount", () => {
    const cleanup = jest.fn();
    const callback = jest.fn(() => {
      return cleanup;
    });
    const { unmount } = renderHook(() => useReactive(callback));

    expect(callback).toHaveBeenCalled();
    unmount();
    expect(cleanup).toHaveBeenCalled();
  });
});

const ReactiveComponent = ({ a }) => {
  return `result: ${a()}`;
};

describe("rc", () => {
  test("renders a reactive component message", () => {
    const a = createSubject(0);
    render(<ReactiveComponent a={a} />);
    const matchText = screen.getByText("result: 0");
    expect(matchText).toBeInTheDocument();
  });
});
