// rollup.config.mjs
import resolve from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import replace from "@rollup/plugin-replace";

export default {
    input: "src/index.ts",
    output: [
        {
            file: "dist/index.mjs",
            format: "esm",
            sourcemap: true,
        },
    ],
    plugins: [
        resolve({
            preferBuiltins: true, // 优先使用内置模块
        }),
        commonjs(),
        typescript({
            tsconfig: "./tsconfig.json",
        }),
        json(),
        replace({
            preventAssignment: true,
            values: {
                __filename: "import.meta.url", // 替换 __filename 为 import.meta.url
            },
        }),
    ],
    external: ["path", "events", "stream"], // 将 Node.js 内置模块标记为外部依赖
};
