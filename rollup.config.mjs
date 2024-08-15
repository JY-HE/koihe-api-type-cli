// rollup.config.mjs
import resolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';

export default {
    input: 'src/index.ts',
    output: [
        {
            file: 'dist/index.mjs',
            format: 'esm',
            plugins: [terser()],
        },
    ],
    plugins: [
        resolve({
            preferBuiltins: true, // 优先使用内置模块
        }),
        commonjs(), 
        json(),
        typescript({
            tsconfig: './tsconfig.json',
        }),
    ],
    external: ['path', 'events', 'stream'], // 将 Node.js 内置模块标记为外部依赖
};
