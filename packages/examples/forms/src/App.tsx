import React, { useEffect } from "react";
import logo from "./logo.svg";
import Mlyn, { Show, useDestroyable, useMlynEffect } from "react-mlyn";
import { createForm } from "mlyn-form";
import "./App.css";
import { Subject } from "mlyn";
const [form] = createForm({
  initialValues: {
    firstName: "",
  },
  validate: {
    firstName: (s: Subject<string>) => {
      // console.log(">>> s:", s());
      return s().length === 0;
    },
  },
});
const { fields, values, errors, touched } = form;
const { firstName } = fields;
firstName.value("1")
console.log(">>> errors:", errors());
// useMlynEffect(() => {
//   console.log(">>> e:", errors());
// });
// useEffect(() => {
  // firstName.value("1");
// }, []);


function App() {
  
  return (
    <div className="App">
      {/* <Mlyn.Input onBlur={firstName.onBlur} bindValue={firstName.value} /> */}
      {/* <Show
        when={() => {
          console.log(">>> err: ", firstName.error());
          return errors.firstName();
        }}
      >
        {() => {
          return <div>drenna</div>;
        }}
      </Show> */}
    </div>
  );
}

export default App;
