import { runInReactiveScope, muteScope, destroyScope } from "../src/scope";
import { createSubject } from "../src/subject";

describe("scope", () => {
  it("should run in scope", () => {
    const logs = [];
    const subject = createSubject({
      user: {
        firstName: "John",
        lastName: "Smith",
      },
    });
    const scope = runInReactiveScope(() => {
      logs.push(`user name is ${subject.user.firstName()}`);
    });
    subject.user.firstName = "Abraham";
    subject.user({ ...subject.user(), firstName: "Albert" });
    subject.user({ ...subject.user(), lastName: "Lincoln" });
    destroyScope(scope);
    subject.user.firstName = "Lion";
    expect(logs).toEqual([
      `user name is John`,
      `user name is Abraham`,
      `user name is Albert`,
    ]);
  });

  it("should not rerun muted scope", () => {
    const subject = createSubject({
      root: 0,
      muted: 0,
    });
    let lastRoot;
    let lastMuted;
    let nestedScope;
    runInReactiveScope(() => {
      lastRoot = subject.root();
      if (!nestedScope) {
        muteScope(() => {
          lastMuted = subject.muted();
        });
      }
    });
    // first run
    expect(lastRoot).toEqual(0);
    expect(lastMuted).toEqual(0);
    
    subject.muted(subject.muted() + 1);
    // lastMuted is assigned in muted scope, should not be updated
    expect(lastMuted).toEqual(0);

    subject({ root: 1, muted: 1 });
    expect(lastRoot).toEqual(1);
    expect(lastMuted).toEqual(1);
  });

  it("should invoke unsubscribe", () => {
    let invoked = false;
    destroyScope(runInReactiveScope(() => () => invoked = true));
    expect(invoked).toEqual(true);
  });
});
