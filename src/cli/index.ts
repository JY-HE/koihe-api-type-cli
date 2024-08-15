import { cac } from "cac";
import { version } from "../../package.json";
import Service from "./service";

class Cli {
    private cli: ReturnType<typeof cac>;
    private service: Service;

    constructor() {
        // 创建一个命令行应用程序实例，指定调用该应用程序的名称为 apit
        this.cli = cac("apit");
        this.service = new Service();
        this.registerCommands();
    }

    private registerCommands() {
        this.cli.version(version);

        this.cli
            .command("init", "初始化配置")
            .action(() => this.handleInit());

        this.cli
            .command("")
            .action(() => this.handleDefaultCommand());

        this.cli.help();
    }

    /**
     * @description 初始化配置文件
     */
    private async handleInit() {
        try {
            await this.service.init();
        } catch (error) {
            console.error("初始化配置文件失败:", error);
        }
    }

    /**
     * @description 生成 API 接口类型定义文件
     */
    private handleDefaultCommand() {
        console.log("🚀 ~ index.ts:15 ~ cmd:", 1111111111);
    }

    public run() {
        this.cli.parse();
    }
}


export default Cli
