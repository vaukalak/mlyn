const contexts = [];
const contextByListener = new Map();

export const getActiveContext = () => {
  return contexts.length > 0 ? contexts[contexts.length - 1] : undefined;
};

export const getListenerContext = () => {
  return contexts.length > 0 ? contexts[contexts.length - 1] : undefined;
};

export const observeInContext = (context, subscribe) => {
  context.dependencies.add(subscribe(context.callback));
};

export const destroyContext = (context) => {
  for (const dependency of context.dependencies.values()) {
    dependency();
  }
};

export const runInContext = (callback) => {
  contexts.push({
    dependencies: new Set(),
    callback,
  });
  callback();
  return contexts.pop();
};

// export const runMemoized = (callback) => {
//     const result = createProxy(undefined);
//     runInContext(() => result(callback(result())));
//     return result;
// };

// const stateProxy = {};

// export const useSelector = (selector) => {
//     const [selectedState, setSelectedState] = useState();
//     const callback = () => {
//         setSelectedState(selector(stateProxy));
//     }
//     contexts.push({
//         dependencies: new Set(),
//         callback,
//     });
//     const context = contexts.pop();
//     useEffect(() => {
//         return () => {
//             destroyContext(context);
//         }
//     }, []);
//     return selectedState;
// };
