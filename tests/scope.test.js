import { runInReactiveScope, destroyScope } from "../src/scope";
import { createSubject } from "../src/subject";

describe("context", () => {
  it("should run in context", () => {
    const logs = [];
    const subject = createSubject({
      user: {
        firstName: "John",
        lastName: "Smith",
      },
    });
    const context = runInReactiveScope(() => {
      logs.push(`user name is ${subject.user.firstName()}`);
    });
    subject.user.firstName = "Abraham";
    subject.user({ ...subject.user(), firstName: "Albert" });
    subject.user({ ...subject.user(), lastName: "Lincoln" });
    destroyScope(context);
    subject.user.firstName = "Lion";
    expect(logs).toEqual([
      `user name is John`,
      `user name is Abraham`,
      `user name is Albert`,
    ]);
  });
});
