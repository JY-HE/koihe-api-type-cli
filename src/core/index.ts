import { outputFile, existsSync, readJson } from "fs-extra";
import axios from "axios";
import { OpenAPIV3 } from "openapi-types";
import { Agent } from "https";
import { join } from "path";
import pc from "picocolors";
import ora from "ora";
import { isCreateFile } from "./utils";
import { CONFIG_FILE_NAME, CONFIG_FILE_CONTENT } from "./const";
import { Config, RequestConfig, Server } from "./types/config";

class Service {
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
            ora().start("正在生成配置文件...\n");
            await outputFile(this.configFilePath, CONFIG_FILE_CONTENT, "utf-8");
            ora().succeed(`${pc.green("配置文件生成成功!")}`);
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
            ora().start("正在读取配置文件...\n");
            if (!existsSync(this.configFilePath)) {
                ora().fail(`${pc.red("配置文件不存在，请使用 init 命令初始化配置文件")}`);
                process.exit(1);
            }
            const fileContent: Config = await readJson(this.configFilePath);
            ora().succeed(pc.green("读取配置文件成功!"));
            return fileContent;
        } catch (error) {
            throw error;
        }
    }

    /**
     * @description 获取 swagger 文档数据
     * @returns Promise<OpenAPIV3.Document[]> 获取到的所有文档数据
     */
    public async getSwaggerData(config: Config | null): Promise<OpenAPIV3.Document[]> {
        try {
            const httpsAgent = new Agent({
                rejectUnauthorized: false, // 不拒绝未授权的证书
            });
            // 构建请求配置
            const requests = (config?.servers || []).map((server: Server) => {
                const requestConfig: RequestConfig = {
                    method: "get",
                    url: server.url,
                    httpsAgent,
                };
                if (server.params && Object.keys(server.params).length > 0) {
                    const queryParams = new URLSearchParams(server.params);
                    requestConfig.url += `?${queryParams.toString()}`;
                }
                if (server.headers && Object.keys(server.headers).length > 0) {
                    requestConfig.headers = server.headers;
                }
                if (server.authToken) {
                    requestConfig.headers = {
                        ...requestConfig.headers,
                        Authorization: server.authToken,
                    };
                }
                return axios<OpenAPIV3.Document>(requestConfig);
            });
            // 请求 swagger 文档
            ora().start("正在请求 Swagger 文档数据...\n");
            const swaggerData = await Promise.allSettled(requests);
            const getVersion = (str: string) => {
                const version = str?.match(/^\d+(?=\.)/)?.[0] || 1;
                return `v${version}`;
            };
            // 过滤请求失败的 swagger 文档
            const result = swaggerData
                .map((item, index) => {
                    if (item.status === "fulfilled" && item.value.status === 200) {
                        const server = config?.servers?.[index] || null;
                        const data = item.value.data;
                        return {
                            bizName: server?.name || data.info.title || "default",
                            version: server?.version || getVersion(data.info.version),
                            ...data,
                        };
                    } else if (item.status === "fulfilled") {
                        console.error(
                            pc.red(
                                `请求错误，状态码: ${item.value.status}，URL: ${item.value.config.url}`
                            )
                        );
                    } else {
                        console.error(
                            pc.red(
                                `请求失败，错误信息: ${item.reason}，URL: ${item.reason.config.url}`
                            )
                        );
                    }
                    return null;
                })
                .filter((data) => data !== null) as OpenAPIV3.Document[];
            ora().succeed(pc.green("获取 Swagger 文档数据完成！"));
            return result;
        } catch (error) {
            throw error;
        }
    }
}

export default Service;
