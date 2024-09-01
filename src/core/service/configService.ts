import { outputFile, existsSync, readJson } from "fs-extra";
import { join } from "path";
import { CONFIG_FILE_NAME, CONFIG_FILE_CONTENT } from "../const";
import { Config } from "../types/config";
import { isCreateFile } from "../utils";
import LoggerService from "./loggerService";

/**
 * @description 处理与配置文件相关的操作
 */
class ConfigService {
    private configFilePath: string;

    constructor() {
        this.configFilePath = join(process.cwd(), CONFIG_FILE_NAME);
    }

    /**
     * @description 初始化配置文件
     * @returns Promise<void>
     */
    public async initConfigFile(): Promise<void> {
        try {
            const isCreate = await isCreateFile(this.configFilePath);
            if (!isCreate) return;
            LoggerService.start("正在生成配置文件...\n");
            await outputFile(this.configFilePath, CONFIG_FILE_CONTENT, "utf-8");
            LoggerService.succeed("配置文件生成成功");
        } catch (error) {
            throw error;
        }
    }

    /**
     * @description 读取配置文件
     * @returns Promise<Config> 读取到的配置文件内容
     */
    public async getConfigFile(): Promise<Config> {
        try {
            LoggerService.start("正在读取配置文件...");
            if (!existsSync(this.configFilePath)) {
                LoggerService.fail("配置文件不存在，请使用 init 命令初始化配置文件");
                process.exit(1);
            }
            const fileContent: Config = await readJson(this.configFilePath);
            LoggerService.succeed("读取配置文件成功");
            return fileContent;
        } catch (error) {
            throw error;
        }
    }
}

export default ConfigService;
