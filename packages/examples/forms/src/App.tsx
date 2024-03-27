import { useEffect } from "react";
import Mlyn, { For } from "react-mlyn";
import { createForm } from "mlyn-form";
import { createHistory } from "mlyn-history";
import "./App.css";
import { Subject } from "mlyn";
import { Field } from "./Form";

const [form] = createForm({
  initialValues: {
    firstName: "",
    lastName: "",
    password: "",
    email: "",
    tags: [],
  },
  validate: {
    firstName: (s: Subject<string>) => (s().length === 0 ? "Required!" : ""),
    lastName: (s: Subject<string>) => (s().length === 0 ? "Required!" : ""),
    password: (s: Subject<string>) =>
      s().length === 0 ? "Invalid password!" : "",
    email: (s: Subject<string>) => (s().length === 0 ? "Invalid email!" : ""),
  },
});

const history = createHistory();

function App() {
  const { fields, values } = form;
  const { firstName, lastName, email, password, tags } = fields;
  useEffect(() => {
    history.observe(values);
  }, []);
  return (
    <div className="App">
      <Field label="First name" field={firstName}>
        <Mlyn.Input />
      </Field>
      <Field label="Last name" field={lastName}>
        <Mlyn.Input />
      </Field>
      <Field label="Email" field={email}>
        <Mlyn.Input />
      </Field>
      <Field label="Password" field={password}>
        <Mlyn.Input />
      </Field>
      {/* <For each={tags.value}>
        {(tag) => (
          <Field label="Tag" field={}>
            <Mlyn.Input />
          </Field>
        )}
      </For> */}
      <Mlyn.Input
        type="range"
        step="1"
        onChange={(e: any) => {
          history.jumpTo(e.target.value);
        }}
        value$={() => history.past$().length}
        min={1}
        disabled$={() => history.entries$().length === 1}
        max$={() => history.entries$().length}
      />
    </div>
  );
}

export default App;
