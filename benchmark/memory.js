const getMem = () => {
    const { heapUsed } = process.memoryUsage();;
    return heapUsed;
};

const printMem = () => {
  global.gc();
  // console.log("MEMORY:");
  const { heapUsed } = process.memoryUsage();
  console.log(`- MEMORY: ${Math.round((heapUsed / 1024 ** 2) * 100) / 100} MB`);
  // for (let key in [usage.]) {
  //     console.log(`- ${key}: ${Math.round(data / 1024 ** 1024 * 100) / 100} MB`)
  // }
};

const { createSubject, runInReactiveScope, createPrimitiveSubject } = require("../lib");
const delay = (ms = 5000) =>
  new Promise((res) => {
    setTimeout(res, ms);
  });

const creation = async () => {
  console.log("Create 1M subjects");
  printMem();
  const a$ = createSubject(Array(1_000).fill("A"));
  printMem();
  a$(undefined);
  global.gc();
  await delay();
  printMem();
};

const sub = () => {
  const a$ = createSubject(Array(1_000).fill("A"));

  const destroyers = a$().map((e, i) => runInReactiveScope(() => a$[i]()));
  printMem();
  destroyers.forEach((d) => d());
  a$(undefined);
};

const scopes = async () => {
  console.log("Create 1M scopes");
  printMem();
  sub();
  global.gc();
  await delay(20000);
  printMem();
};
// printMem();
// const a$ = Array(1_000).fill("A").map(s => createSubject(s));
// printMem();
// (async () => {
//   await creation();
// //   await scopes();
// })();

const startMem = getMem();
// const a$ = Array(1_000).fill({ id: 0, text: ""}).map(s => createSubject(s));
// const a$ = Array(1_000).fill({ id: 0, text: ""}).map(s => runInReactiveScope(() => {} ));
// const a$ = Array(1_000).fill({ id: 0, text: ""}).map(s => [runInReactiveScope(() => {}), createSubject(s)]);
// const a$ = Array(1).fill({ id: 0, text: ""}).map(s => {
//   // const s$ = createSubject(s);
//   return [];
//   // return runInReactiveScope(() => {
//   //   s$();
//   //   s$.id();
//   //   s$.text();
//   // })
// });
const a$ = Array(1).fill({ id: 0, text: ""}).map(s => {
  const s$ = createSubject(s);
  // return s$;
  return [s$.id, s$.text];
  // const a = [Math.random()];
  // return () => {
  //   return a;
  // };
});
// const a$ = Array(1_000).fill({ id: 0, text: ""}).map(s => createPrimitiveSubject(s.id));
// const a$ = Array(1_000).fill(1).map(s => new Proxy({}, {}));
// const a$ = Array(1_000).fill(1).map(s => ()=> {});
// const a$ = Array(1_000).fill(1).map(s => ({}));
// const a$ = Array(1_000).fill(1).map((s, i) => i);
// const ids = a$.map(({ id }) => id);
// const texts = a$.map(({ text }) => text);

console.log(getMem() - startMem);