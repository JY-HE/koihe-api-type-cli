import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { OverwritePromptResult } from '../types/prompt';
import pc from 'picocolors';

/**
 * @description 检查文件是否存在并提示是否覆盖
 * @params fileName 文件名
 * @returns boolean 是否存在文件并覆盖文件
 */
export const isExistsFile = async (fileName: string) => {
    try {
        // 拼接得到文件路径
        const targetFile = path.join(process.cwd(), fileName);
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
    } catch (error) {
        console.error('检查文件失败:', error);
    }
};
