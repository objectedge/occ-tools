module.exports = {
  env: { es2020: true, node: true, commonjs: true },
  extends: ["plugin:prettier/recommended"],
  plugins: ["prettier"],
  rules: {
    "prettier/prettier": "error",
  },
};
