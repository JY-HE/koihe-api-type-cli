import axios from "axios";
import { Agent } from "https";
import LoggerService from "./loggerService";
import { Config, RequestConfig, Server, SwaggerData } from "../types/config";
import { OpenAPIV3 } from "openapi-types";

/**
 * @description 负责处理多个 Swagger 文档数据的获取与解析
 */
class SwaggerService {
    /**
     * @description 获取 swagger 文档数据
     * @param config 配置文件
     * @returns Promise<SwaggerData[]> 获取到的所有文档数据
     */
    public async getSwaggerData(config: Config): Promise<SwaggerData[]> {
        const httpsAgent = new Agent({ rejectUnauthorized: false });

        const requests = config.servers.map((server: Server) => {
            const requestConfig: RequestConfig = this.buildRequestConfig(server, httpsAgent);
            return axios<OpenAPIV3.Document>(requestConfig).then(
                response => this.processResponse(server, response),
                error => this.handleRequestError(error, server.url)
            );
        });

        LoggerService.start("正在请求 Swagger 文档数据...");

        const results = await Promise.allSettled(requests);

        LoggerService.succeed("获取 Swagger 文档数据完成");

        return results
            .filter((result): result is PromiseFulfilledResult<SwaggerData | null> => result.status === "fulfilled")
            .map(result => result.value)
            .filter((data): data is SwaggerData => data !== null);
    }

    /**
     * @description 构建 Axios 请求配置
     * @param server 单个服务配置
     * @param httpsAgent HTTPS 代理
     * @returns Axios 请求配置
     */
    private buildRequestConfig(server: Server, httpsAgent: Agent): RequestConfig {
        const { url, headers, params, authToken } = server;
        const requestConfig: RequestConfig = {
            method: "get",
            url: params ? `${url}?${new URLSearchParams(params)}` : url,
            headers: {
                ...headers,
                ...(authToken ? { Authorization: authToken } : {}),
            },
            httpsAgent,
        };
        return requestConfig;
    }

    /**
     * @description 处理 Axios 请求响应
     * @param server 单个服务配置
     * @param response Axios 响应
     * @returns 处理后的 SwaggerData
     */
    private processResponse(server: Server, response: { data: OpenAPIV3.Document }): SwaggerData {
        const { name, version } = server;
        const { info } = response.data;
        const bizName = name || info.title || "default";
        const apiVersion = version || this.extractVersion(info.version);

        return {
            bizName,
            version: apiVersion,
            ...response.data,
        };
    }

    /**
     * @description 提取文档版本号
     * @param version 版本号字符串
     * @returns 规范化的版本号字符串
     */
    private extractVersion(version: string): string {
        const majorVersion = version.match(/^\d+/)?.[0] || "1";
        return `v${majorVersion}`;
    }

    /**
     * @description 处理请求错误
     * @param error 请求错误信息
     * @param url 请求的 URL
     * @returns null
     */
    private handleRequestError(error: any, url: string): null {
        if (error.response) {
            LoggerService.logError(`请求错误，状态码: ${error.response.status}，URL: ${url}`)
        } else {
            LoggerService.logError(`请求失败，错误信息: ${error.message}，URL: ${url}`)
        }
        return null;
    }
}

export default SwaggerService;
