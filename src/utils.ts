export const createBlock = () => {
  let blocked = false;
  return (cb) => {
    if (!blocked) {
      blocked = true;
      cb();
      blocked = false;
    }
  };
};
