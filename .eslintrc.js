module.exports = {
    ignorePatterns: [".eslintrc.js"], // 忽略 .eslintrc.js 文件
    parser: "@typescript-eslint/parser",
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
    ],
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        project: "./tsconfig.json", // 这里指定 TypeScript 配置文件
    },
    rules: {
        "@typescript-eslint/no-unused-vars": ["error"],
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/no-floating-promises": "error",
    },
    env: {
        node: true,
        browser: true,
        es6: true,
        commonjs: true,
    },
};
