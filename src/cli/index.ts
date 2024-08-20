import { cac } from "cac";
import { version } from "../../package.json";
import Service from "../core";

class Cli {
    private cli: ReturnType<typeof cac>;
    private service: Service;

    constructor() {
        // 创建一个命令行应用程序实例，指定调用该应用程序的名称为 apit
        this.cli = cac("apit");
        this.service = new Service();
        this.registerCommands();
    }

    /**
     * @description 注册命令
     */
    private registerCommands() {

        this.cli
            .command("init", "初始化配置")
            .action(() => this.handleInit());

        this.cli
            .command("")
            .option('-v, --version', 'Display version number')
            .action((cmd) => {
                // 自定义展示版本信息，因为 cli.version() 不是想要的效果 
                if (cmd.version || cmd.v) {
                    console.log(`v${version}`);
                } else {
                    this.handleDefaultCommand()
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
        } catch (error) {
            console.error("handleInit has a error:", error);
        }
        process.exit(1);
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
        } catch (error) {
            console.error('handleDefaultCommand has a error:', error);
        }
        process.exit(1);
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

export default Cli
