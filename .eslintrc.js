module.exports = {
    ignorePatterns: [".eslintrc.js", "rollup.config.mjs", "bin/index.js"], // 忽略文件
    parser: "@typescript-eslint/parser",
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
    ],
    parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        project: "./tsconfig.json", // 这里指定 TypeScript 配置文件
    },
    rules: {
        "@typescript-eslint/no-unused-vars": ["error"], // 不允许存在未使用的变量
        "@typescript-eslint/explicit-function-return-type": "off", // 关闭要求函数必须显式声明返回类型的规则
        "@typescript-eslint/no-floating-promises": "error", // 不允许存在未处理的异步操作
    },
    env: {
        node: true,
        browser: true,
        es6: true,
        commonjs: true,
    },
};
