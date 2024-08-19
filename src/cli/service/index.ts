import { outputFile, existsSync, readJson } from 'fs-extra';
import { join } from 'path';
import pc from 'picocolors';
import ora from 'ora';
import { isCreateFile } from "../utils";
import { CONFIG_FILE_NAME, CONFIG_FILE_CONTENT } from "../const";
import { Config } from "../types/config";

class Service {
    private configFilePath: string

    constructor() {
        this.configFilePath = join(process.cwd(), CONFIG_FILE_NAME);
    }

    /**
     * @description 初始化配置文件
     */
    public async initConfigFile(): Promise<void> {
        try {
            const isCreate = await isCreateFile(this.configFilePath);
            if (!isCreate) return;
            ora().start('正在生成配置文件...\n');
            await outputFile(this.configFilePath, CONFIG_FILE_CONTENT, 'utf-8');
            ora().succeed(`${pc.green('配置文件生成成功!')}`);
        } catch (error) {
            console.error('配置文件生成失败:', error);
        }
    }

    /**
     * @description 读取配置文件
     */
    public async getConfigFile(): Promise<Config | null> {
        try {
            ora().start('读取配置文件中...\n');
            if (!existsSync(this.configFilePath)) {
                ora().fail(`${pc.red('配置文件不存在，请使用 init 命令初始化配置文件')}`);
                process.exit(1);
            }
            const fileContent = await readJson(this.configFilePath);
            ora().succeed(pc.green('读取配置文件成功!'));
            return fileContent
        } catch (error) {
            console.error('读取配置文件失败：', error);
            return null
        }
    }
}

export default Service;
