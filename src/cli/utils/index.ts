import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { OverwritePromptResult } from '../types';
import pc from 'picocolors'; 

/**
 * 检查文件是否存在并提示是否覆盖
 * @returns boolean 是否存在文件并覆盖文件
 */
export const isExistsFile = async () => {
    // 获取当前工作目录
    const cwd = process.cwd();
    // 拼接得到文件路径
    const targetFile = path.join(cwd, 'apit.config.ts');
    // 判断文件是否存在
    if (fs.existsSync(targetFile)) {
        const { isOverwrite } = await inquirer.prompt<OverwritePromptResult>([
            {
                type: 'list',
                name: 'isOverwrite',
                message: '目标文件已存在，请选择操作',
                choices: [
                    { name: '覆盖文件', value: true },
                    { name: '取消', value: false },
                ],
            },
        ]);
        if (!isOverwrite) {
            console.log(pc.green('已取消初始化配置文件。'));
        }
        return isOverwrite;
    } else {
        return false;
    }
};
