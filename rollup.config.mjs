// rollup.config.mjs
import resolve from "rollup-plugin-node-resolve";
import json from "@rollup/plugin-json";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";

export default {
    input: "packages/cli/index.ts",
    output: [
        {
            file: "dist/index.mjs",
            format: "es",
            plugins: [terser()],
        },
    ],
    plugins: [resolve(), json(), typescript()],
};
