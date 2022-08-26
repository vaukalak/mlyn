module.exports = function (api) {
  api.cache(true);

  const presets = ["@babel/preset-typescript", "@babel/preset-env"];
  const plugins = ["@babel/plugin-syntax-jsx", "@babel/plugin-transform-react-jsx"];

  return {
    presets,
    plugins,
  };
};
