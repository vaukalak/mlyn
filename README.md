# mlyn

Reactive immutable state.

Inspired by [solidjs](https://github.com/solidjs/solid)

## Reason

Tracking re-renderings in react is a painful process. Fine-grain reactivity removes this problem completely. And react engineer can entirely forget about tracking dependencies and focus on writing code.

```js
import { useCallback } from "react";
import { rc, useSubject, useReactive } from "mlyn/react";

const Counter = rc(() => {
  const state = useSubject({ count: 0 });

  useReactive(() => {
    // no dependency required for `state.count()`;
    console.log(">>> reactive effect:", state.count());
  });

  const increment = useCallback(() => {
    state.count(state.count() + 1); // No dependencies needed
  }, []); // no dependency required for `state.count()`;

  return (
    <div>
      <h1>Count: {state.count()}</h1>
      <button onClick={increment}>Increment</button>
    </div>
  );
});

export default Counter;
```

## create a subject

let create a simple subject by passing in initial state
```js
import { createSubject } from "mlyn";

const subject = createSubject({
  user: {
    firstName: "Adam",
    lastName: "Smith",
  },
});
```
Now you can access any property by invoking as function corresponding value on subject:
```js
subject.user.firstName(); // Adam
```
You can retrieve the value on any level of nesting
```js
subject.user().firstName; // Adam
```

## modifying subject

You can modify a property, just in the same way as with plain js object, however this will update full state in immutable fashion:
```
const stateCopy = subject();
subject.user.firstName = "Abraham";

console.log(subject.user()); // { firstName: "Abraham", lastName: "Smith" }
console.log(subject() === stateCopy); // false, cause root object has changed as well.
```
Assignments, can be done, on any nesting level (expect to root one):
```js
subject.user = { ...subject.user(), firstName: "Abraham" };
```
To modify root you can invoke the subject as a function (same as to retrieve a value), but passing in the new value:
```js
subject({ user: { firstName: "Mihas", lastName: "Vaukalak" } });
```
This approach is applicable on any level on nesting
```js
subject.user.firstName("Abraham");
```
Btw, this approach will work if you perfrom destructuring or pass a node as parameter to a function:
```js
const upperCase = (value) => {
  value(value().toUpperCase());
}
const { firstName } = subject.user;
upperCase(firstName);
console.log(subject()); // { user: { firstName: "ADAM", lastName: "Smith" } }
```

## Reactive scopes

Since the state is fully immutable, we can detect any update of it (or of any sub-node) using `runInReactiveScope` api. 
```js
const logState = (state) => {
  runInReactiveScope(() => {
    console.log("subject: ", state());
  });
};
logState(subject.user.firstName);
subject.user.firstName = "Abraham";
```
This will log both `Adam` and `Abraham`, because, if you invoke a subject inside callback passed to `runInReactiveScope` a subscribtion to this object gets created. The best thing of it, is that subscription gets created only on the part of the state, you've asked for:
```js
subject.user.lastName = "Lincoln"; // nothing logged, cause we observe only first name
```
