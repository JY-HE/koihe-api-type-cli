import { cac } from "cac";
import { readFileSync } from "fs-extra";
import { join } from "path";
import Service from "../core";

class Cli {
    private cli: ReturnType<typeof cac>;
    private service: Service;
    private version: string;

    constructor() {
        const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
        this.version = packageJson.version;
        // 创建一个命令行应用程序实例，指定调用该应用程序的名称为 apit
        this.cli = cac("apit");
        this.service = new Service();
        this.registerCommands();
    }

    /**
     * @description 注册命令
     */
    private registerCommands() {
        this.cli.command("init", "初始化配置").action(() => this.handleInit());

        this.cli
            .command("")
            .option("-v, --version", "Display version number")
            .action(async (cmd) => {
                // 自定义展示版本信息，因为 cli.version() 不是想要的效果
                if (cmd.version || cmd.v) {
                    console.log(`v${this.version}`);
                } else {
                    try {
                        await this.handleDefaultCommand();
                        process.exit(0);
                    } catch (error) {
                        console.error("An error occurred:", error);
                        process.exit(1);
                    }
                }
            });

        this.cli.help();
    }

    /**
     * @description 初始化配置文件
     */
    private async handleInit() {
        try {
            await this.service.initConfigFile();
            process.exit(0);
        } catch (error) {
            console.error("handleInit has a error:", error);
            process.exit(1);
        }
    }

    /**
     * @description 生成 API 接口类型定义文件
     */
    private async handleDefaultCommand() {
        try {
            // 读取配置文件
            const configFileContent = await this.service.getConfigFile();
            // 获取 swagger 文档数据
            const res = await this.service.getSwaggerData(configFileContent);
            if (res.length) {
                // 解析数据
                await this.service.parseSwaggerData(res, configFileContent);
            }
        } catch (error) {
            throw error;
        }
    }

    /**
     * @description 运行脚本
     */
    public run() {
        try {
            this.cli.parse();
        } catch (error) {
            console.error("run has a error:", error);
        }
    }
}

export default Cli;
