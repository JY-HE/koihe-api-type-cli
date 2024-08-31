import { join } from "path";
import { ensureDirSync, writeFile } from "fs-extra";
import { ProcessedPath, ProcessedParameters, ProcessedRequestBody } from "../types/paths";
import { Config } from "../types/config";
import LoggerService from "../service/loggerService";
import { isPrimitiveType } from "../utils";

/**
 * @description 负责生成 Typescript 文件
 */
class CreateTsFileService {
    /**
     * @description 生成 API 类型定义文件
     * @param bizName 业务名称
     * @param data path 对象数据类型
     * @param config 配置文件
     */
    async startup(bizName: string, data: ProcessedPath[], config: Config) {
        try {
            const apiTypeMdTemplate = await this.getApiType(bizName, data);
            const { outputPath = "src/types" } = config;
            const path = outputPath.match(/\/$/) ? outputPath : outputPath + "/";
            // 判断目录是否存在，不存在则创建
            ensureDirSync(path);
            await writeFile(join(process.cwd(), `${path}${bizName}.ts`), apiTypeMdTemplate, "utf8");
        } catch (error) {
            LoggerService.logError(error);
        }
    }

    /**
     * @description 根据给定的类型对象和类型名称映射获取类型字符串
     * @param data 数据项
     * @returns 处理好的数据
     */
    private getType(data: ProcessedParameters | ProcessedRequestBody): string {
        const { type, details } = data;
        if (type === "Array<object>" && details) {
            const res = details.reduce((str: string, item: any) => {
                return `${str}      ${item.key}: ${this.getType(item)};\n`;
            }, "");
            return `Array<{\n${res}}>`;
        }
        if (type === "object" && details) {
            const res = details.reduce((str: string, item: any) => {
                return `${str}      ${item.key}: ${this.getType(item)};\n`;
            }, "");
            return `{\n${res}}`;
        }
        if (isPrimitiveType(type) && details) {
            let res = "";
            for (let i = 0; i < details.length; i += 1) {
                res = res + ` ${details[i]} ${i === details.length - 1 ? "" : "|"}`;
            }
            return res;
        }
        return type;
    }

    /**
     * @description 获取API类型定义
     * @param bizName 业务名称
     * @param bizData 业务数据
     * @returns 返回API类型定义模板字符串
     */
    private async getApiType(bizName: string, bizData: ProcessedPath[]): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                const resultStr = bizData.reduce((pre, item) => {
                    // 处理请求参数类型定义
                    let formatParamsData: (ProcessedParameters | ProcessedRequestBody)[] = [];
                    if (item.method === "get") {
                        formatParamsData = item.parameters || [];
                    } else {
                        formatParamsData = [
                            ...(item.parameters || []),
                            ...(item.requestBody || []),
                        ];
                    }
                    // 请求类型定义头注释
                    const formatReqDescStr = `/**\n * @description ${item.summary} \n * @summary Request data types \n * @url [ ${item.method} ] ${item.url} \n * @bizName ${bizName} \n */`;
                    // 请求类型定义
                    const formatRequestTypeStr = formatParamsData.reduce((str, i) => {
                        return `${str}      ${
                            i.key.includes("-") || i.key.includes("_") || i.key.includes(".")
                                ? `'${i.key}'`
                                : i.key
                        }${!i.required ? "?:" : ":"} ${this.getType(i)};\n`;
                    }, "");

                    // 处理响应参数类型定义
                    const formatResponsesData = item.responses || [];
                    // 响应类型头注释
                    const formatResDescStr = `/**\n * @description ${item.summary} \n * @summary Response data types \n * @url [ ${item.method} ] ${item.url} \n * @bizName ${bizName} \n */`;
                    // 响应类型定义
                    const formatResponsesTypeStr = formatResponsesData.reduce((str, i) => {
                        return `${str}      ${i.key}: ${this.getType(i)};\n`;
                    }, "");

                    return (
                        pre +
                        `${
                            formatParamsData.length > 0
                                ? `${formatReqDescStr}\nexport type ${item.requestTypeName} = {\n${formatRequestTypeStr}}\n\n`
                                : ""
                        }` +
                        `${
                            item.responses
                                ? `${formatResDescStr}\nexport type ${item.responsesTypeName} = {\n${formatResponsesTypeStr}}\n\n`
                                : ""
                        }`
                    );
                }, "");
                resolve(resultStr);
            } catch (error) {
                reject(error);
            }
        });
    }
}

export default CreateTsFileService;
