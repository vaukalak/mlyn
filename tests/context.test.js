import { runInContext, destroyContext } from "../src/context";
import { createProxy } from "../src/proxy";

describe("context", () => {
  it("should run in context", () => {
    const logs = [];
    const proxy = createProxy({
      user: {
        firstName: "John",
        lastName: "Smith",
      },
    });
    const context = runInContext(() => {
      logs.push(`user name is ${proxy.user.firstName()}`);
    });
    proxy.user.firstName = "Abraham";
    proxy.user({ ...proxy.user(), firstName: "Albert" });
    proxy.user({ ...proxy.user(), lastName: "Lincoln" });
    destroyContext(context);
    proxy.user.firstName = "Lion";
    expect(logs).toEqual([
      `user name is John`,
      `user name is Abraham`,
      `user name is Albert`,
    ]);
  });
});
