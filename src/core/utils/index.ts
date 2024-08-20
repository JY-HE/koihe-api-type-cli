import inquirer from 'inquirer';
import { existsSync } from 'fs-extra';
import pc from 'picocolors';

/**
 * @description 判断是否创建配置文件
 * @params filePath 文件路径
 * @returns boolean
 */
export const isCreateFile = async (filePath: string): Promise<boolean> => {
    try {
        // 判断文件是否存在
        if (existsSync(filePath)) {
            const { isOverwrite } = await inquirer.prompt<{
                isOverwrite: boolean;
            }>([
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
            return true;
        }
    } catch (error) {
        console.error('判断是否创建配置文件发生错误:', error);
        return false
    }
};
