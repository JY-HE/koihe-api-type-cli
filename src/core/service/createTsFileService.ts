import { join } from "path";
import { ensureDirSync, writeFile } from "fs-extra";
import { ProcessedPath, ProcessedParameters, ProcessedRequestBody } from "../types/paths";
import { Config } from "../types/config";
import LoggerService from "../service/loggerService";
import { isPrimitiveType } from "../utils";

class CreateTsFileService {
    /**
     * @description 生成 API 类型定义文件
     * @param bizName 业务名称
     * @param data path 对象数据类型
     * @param config 配置
     */
    async startup(bizName: string, data: ProcessedPath[], config: Config) {
        try {
            const apiTypeMdTemplate = await this.getApiType(bizName, data, config);
            const outputPath = this.getOutputPath(config.outputPath || "src/types");
            ensureDirSync(outputPath);
            await writeFile(
                join(process.cwd(), `${outputPath}${bizName}.ts`),
                apiTypeMdTemplate,
                "utf8"
            );
        } catch (error) {
            LoggerService.logError(error);
        }
    }

    /**
     * @description 获取输出路径，并确保路径以 "/" 结尾
     * @param outputPath 配置中的输出路径
     * @returns 返回规范化的输出路径字符串
     */
    private getOutputPath(outputPath: string): string {
        return outputPath.match(/\/$/) ? outputPath : outputPath + "/";
    }

    /**
     * @description 获取 API 类型定义字符串
     * @param bizName 业务名称
     * @param bizData 业务数据
     * @param config 配置
     * @returns 返回 API 类型定义的模板字符串
     */
    private async getApiType(
        bizName: string,
        bizData: ProcessedPath[],
        config: Config
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                const resultStr = bizData.reduce((pre, item) => {
                    const formatParamsData = this.getFormattedParameters(item);
                    const formatResponsesData = item.responses || [];

                    const requestTypeStr = this.generateTypeDefinition(
                        bizName,
                        item,
                        formatParamsData,
                        "Request",
                        config
                    );
                    const responseTypeStr = this.generateTypeDefinition(
                        bizName,
                        item,
                        formatResponsesData,
                        "Response",
                        config
                    );

                    return pre + requestTypeStr + responseTypeStr;
                }, "");
                resolve(resultStr);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * @description 根据请求方法返回格式化的参数数据
     * @param item path 对象数据项
     * @returns 返回格式化的请求参数或请求体数据
     */
    private getFormattedParameters(
        item: ProcessedPath
    ): (ProcessedParameters | ProcessedRequestBody)[] {
        return item.method === "get"
            ? item.parameters || []
            : [...(item.parameters || []), ...(item.requestBody || [])];
    }

    /**
     * @description 生成请求或响应的类型定义字符串
     * @param bizName 业务名称
     * @param item path 对象数据项
     * @param data 格式化的请求或响应数据
     * @param type 请求或响应类型 ("Request" 或 "Response")
     * @param config 配置
     * @returns 返回类型定义字符串
     */
    private generateTypeDefinition(
        bizName: string,
        item: ProcessedPath,
        data: (ProcessedParameters | ProcessedRequestBody)[],
        type: "Request" | "Response",
        config: Config
    ): string {
        if (data.length === 0) return "";

        const typeName = type === "Request" ? item.requestTypeName : item.responsesTypeName;
        const descriptionStr = this.generateTypeDescription(bizName, item, type);
        const typeStr = data.reduce((str, i) => {
            return `${str}      ${this.formatKey(i.key)}${this.getKeyRequired(
                i,
                config,
                type
            )} ${this.getType(i)};\n`;
        }, "");

        return `${descriptionStr}\nexport type ${typeName} = {\n${typeStr}}\n\n`;
    }

    /**
     * @description 生成类型定义的注释字符串
     * @param bizName 业务名称
     * @param item path 对象数据项
     * @param type 请求或响应类型 ("Request" 或 "Response")
     * @returns 返回类型定义的注释字符串
     */
    private generateTypeDescription(
        bizName: string,
        item: ProcessedPath,
        type: "Request" | "Response"
    ): string {
        return `/**\n * @description ${item.summary} \n * @summary ${type} data types \n * @url [ ${item.method} ] ${item.url} \n * @bizName ${bizName} \n */`;
    }

    /**
     * @description 格式化参数或响应对象的 key，确保合法性
     * @param key 参数或响应对象的 key
     * @returns 返回格式化后的 key 字符串
     */
    private formatKey(key: string): string {
        return key.includes("-") || key.includes("_") || key.includes(".") ? `'${key}'` : key;
    }

    /**
     * @description 根据配置给 key 添加必填标记
     * @param item 参数或响应对象
     * @param config 配置
     * @param type 请求或响应类型
     * @returns 返回必填标记
     */
    private getKeyRequired(
        item: ProcessedParameters | ProcessedRequestBody,
        config: Config,
        type: "Request" | "Response"
    ): string {
        const { requiredRequestField = false, requiredResponseField = true } = config;
        if (type === "Request") {
            return requiredRequestField ? ":" : item.required ? ":" : "?:";
        }
        return requiredResponseField ? ":" : item.required ? ":" : "?:";
    }

    /**
     * @description 根据参数或响应数据类型获取对应的类型字符串
     * @param data 请求参数或请求体对象
     * @returns 返回类型字符串
     */
    private getType(data: ProcessedParameters | ProcessedRequestBody): string {
        const { type, details } = data;
        if (type === "Array<object>" && details) {
            return `Array<{\n${this.reduceDetails(details)}\n}>`;
        }
        if (type === "object" && details) {
            return `{\n${this.reduceDetails(details)}\n}`;
        }
        if (isPrimitiveType(type) && details) {
            return details.join(" | ");
        }
        return type;
    }

    /**
     * @description 处理对象或数组类型的细节字段并生成对应的类型定义字符串
     * @param details 详细字段数据
     * @returns 返回详细字段的类型定义字符串
     */
    private reduceDetails(details: any[]): string {
        return details.reduce((str: string, item: any) => {
            return `${str}      ${item.key}: ${this.getType(item)};\n`;
        }, "");
    }
}

export default CreateTsFileService;
