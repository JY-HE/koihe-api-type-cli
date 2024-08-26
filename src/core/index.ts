import { outputFile, existsSync, readJson, writeFileSync } from "fs-extra";
import axios from "axios";
import { OpenAPIV3 } from "openapi-types";
import { Agent } from "https";
import { join } from "path";
import pc from "picocolors";
import ora from "ora";
import { isCreateFile } from "./utils";
import { CONFIG_FILE_NAME, CONFIG_FILE_CONTENT } from "./const";
import {
    Config,
    RequestConfig,
    Server,
    SwaggerData,
    ProcessedSchema,
    Schema,
    Properties,
} from "./types/config";

class Service {
    private configFilePath: string;
    private bizConfigs: any;
    private descReg: RegExp;
    private seenSchemas: Set<string>;
    private schemaDataJson: any;

    constructor() {
        this.configFilePath = join(process.cwd(), CONFIG_FILE_NAME);
        this.bizConfigs = {};
        // 正则表达式，用于处理接口描述
        this.descReg = /\r|\n|;\"|(<.+\/?>)/g;
        // 缓存未处理好的schema
        this.seenSchemas = new Set();
        // 模型数据，用于写入json文件
        this.schemaDataJson = {};
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
     * @returns Promise<SwaggerData[]> 获取到的所有文档数据
     */
    public async getSwaggerData(config: Config | null): Promise<SwaggerData[]> {
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
                .filter((data) => data !== null) as SwaggerData[];
            ora().succeed(pc.green("获取 Swagger 文档数据完成！"));
            return result;
        } catch (error) {
            throw error;
        }
    }

    /**
     * @description 解析文档数据
     * @returns Promise<void>
     */
    public async parseSwaggerData(swaggerData: SwaggerData[]): Promise<void> {
        ora().start("正在解析数据...\n");
        for (const swagger of swaggerData) {
            console.log(`Processing swagger: ${swagger.bizName}`);
            try {
                const { paths, components, bizName, version } = swagger;
                this.bizConfigs[bizName] = [];
                const schemas = components?.schemas || null;
                // 解析 schemas 模型
                if (schemas) {
                    let schemaData = await this.schemasDataHandler(schemas);
                    // 处理未解析成功的 schemas 模型
                    if (this.seenSchemas.size) {
                        schemaData = await this.seenSchemasHandler(schemaData, schemas);
                    }
                    this.schemaDataJson = { ...this.schemaDataJson, [bizName]: schemaData };
                } else {
                    console.log(pc.yellow(`No schemas found for ${bizName}`));
                }
            } catch (error) {
                console.error(`Failed to parse swagger data for ${swagger.bizName}:`, error);
                throw error;
            }
        }
        ora().succeed(`${pc.green("数据解析完成!")}`);
        // 写入 schema.json
        writeFileSync(
            join(process.cwd(), 'schema.json'),
            JSON.stringify(this.schemaDataJson, null, '\t'),
            'utf8'
        );
    }

    /**
     * @description schemas 模型数据处理
     * @param schemas 原始模型数据
     * @returns 处理后的模型数据
     */
    private async schemasDataHandler(
        schemas: OpenAPIV3.ComponentsObject["schemas"] = {}
    ): Promise<ProcessedSchema> {
        try {
            const resultSchema = Object.entries(schemas).reduce(
                (pre, [curSchemaName, curSchemaData]) => {
                    const {
                        type,
                        properties = {},
                        description = "",
                        required = [],
                        enum: details = null,
                    } = curSchemaData as OpenAPIV3.SchemaObject;

                    if (type === "object") {
                        const params = Object.entries(properties).map(([key, value]) => {
                            return this.schemaPropertiesHandler(
                                pre,
                                key,
                                value as OpenAPIV3.SchemaObject,
                                required,
                                curSchemaName
                            );
                        });
                        return {
                            ...pre,
                            [curSchemaName]: {
                                type,
                                description: description.replace(this.descReg, ""),
                                properties: params,
                            },
                        };
                    } else {
                        return {
                            ...pre,
                            [curSchemaName]: {
                                type: type === "integer" ? "number" : type,
                                description,
                                details,
                            },
                        };
                    }
                },
                {}
            );
            return resultSchema;
        } catch (error) {
            console.error("Failed to handle schemas data:", error);
            throw error;
        }
    }

    /**
     * @description 处理 schema 模型中的 properties
     * @param processedSchemas 已处理好的数据
     * @param key 属性名
     * @param value 属性值
     * @param requiredList 必填属性集合
     * @param curSchemaName 当前处理的 schema 名称
     * @returns 处理后的单个Schema数据
     */
    private schemaPropertiesHandler(
        processedSchemas: ProcessedSchema,
        key: string,
        value: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
        requiredList: string[] = [],
        curSchemaName: string = ""
    ): Properties {
        try {
            const isReferenceObject = (obj: any): obj is OpenAPIV3.ReferenceObject => {
                return "$ref" in obj;
            };

            if (isReferenceObject(value)) {
                const refName = value.$ref.split("/").pop();
                if (!refName) {
                    throw new Error(`Invalid $ref format in schema: ${value.$ref}`);
                }
                return this.processComplexType(
                    processedSchemas,
                    key,
                    refName,
                    requiredList,
                    curSchemaName
                );
            }

            const {
                type = "",
                description = "",
                allOf = [],
                properties = {},
                enum: details = null,
            } = value;

            const cleanDescription = description ? description.replace(this.descReg, "") : "";
            const isRequired = requiredList.includes(key);

            if (["number", "integer", "string", "boolean"].includes(type)) {
                return {
                    key,
                    type: type === "integer" ? "number" : type,
                    description: cleanDescription,
                    required: isRequired,
                    details,
                };
            }

            if (type === "array") {
                const items = (value as OpenAPIV3.ArraySchemaObject).items;
                if (isReferenceObject(items)) {
                    const refName = items.$ref.split("/").pop();
                    if (!refName) {
                        throw new Error(`Invalid $ref format in schema: ${items.$ref}`);
                    }
                    return this.processComplexType(
                        processedSchemas,
                        key,
                        refName,
                        requiredList,
                        curSchemaName
                    );
                } else if (
                    items &&
                    typeof items.type === "string" &&
                    ["number", "integer", "string", "boolean"].includes(items.type)
                ) {
                    return {
                        key,
                        type: `Array<${items.type === "integer" ? "number" : items.type}>`,
                        description: cleanDescription,
                        required: isRequired,
                    };
                } else {
                    return {
                        key,
                        type: "Array<any>",
                        description: cleanDescription,
                        required: isRequired,
                    };
                }
            }

            if (type === "object") {
                const details = Object.entries(properties).map(([propKey, propValue]) =>
                    this.schemaPropertiesHandler(
                        processedSchemas,
                        propKey,
                        propValue as OpenAPIV3.SchemaObject,
                        requiredList,
                        curSchemaName
                    )
                );
                if (details.length > 0) {
                    return {
                        key,
                        type: "object",
                        description: cleanDescription,
                        required: isRequired,
                        details,
                    };
                }
                if (allOf.length > 0 && isReferenceObject(allOf[0])) {
                    const refName = allOf[0].$ref.split("/").pop();
                    if (!refName) {
                        throw new Error(`Invalid $ref format in schema: ${allOf[0].$ref}`);
                    }
                    return this.processComplexType(
                        processedSchemas,
                        key,
                        refName,
                        requiredList,
                        curSchemaName
                    );
                }
                return {
                    key,
                    type: "Record<string, any>",
                    description: cleanDescription,
                    required: isRequired,
                };
            }

            return {
                key,
                type: "any",
                description: cleanDescription,
                required: isRequired,
                details: null,
            };
        } catch (error) {
            throw error
        }
    }

    /**
     * @description 处理复杂类型
     * @param processedSchemas 已处理好的数据
     * @param key 属性名
     * @param refName 索引名称
     * @param requiredList 必填属性集合
     * @param curSchemaName 当前处理的 schema 名称
     * @returns 处理好的属性
     */
    private processComplexType(
        processedSchemas: ProcessedSchema,
        key: string,
        refName: string,
        requiredList: string[],
        curSchemaName: string
    ): Properties {
        const refObj = processedSchemas[refName] || null;
        let details: Array<Properties | number | string> = [];

        if (refObj) {
            if (Array.isArray(refObj?.properties)) {
                details = [...refObj.properties];
            } else {
                details = Object.entries(refObj?.properties || []).map(([itemKey, itemValue]) => {
                    return this.schemaPropertiesHandler(
                        processedSchemas,
                        itemKey,
                        itemValue,
                        requiredList,
                        curSchemaName
                    );
                });
            }
        } else {
            this.seenSchemas.add(curSchemaName);
        }

        return {
            key,
            type: details.length ? "Array<object>" : "Array<Record<string, any>>",
            description: "",
            required: requiredList.includes(key),
            details: details.length ? details : null,
        };
    }

    /**
     * @description 处理未解析成功并缓存的schemas数据
     * @param processedSchemas 已处理好的数据
     * @param schemas 源数据
     * @returns 处理后的数据
     */
    private async seenSchemasHandler(
        processedSchemas: ProcessedSchema,
        schemas: OpenAPIV3.ComponentsObject["schemas"] = {}
    ): Promise<ProcessedSchema> {
        const resultSchema = { ...processedSchemas };
        for (const schemaName of this.seenSchemas) {
            if (schemas[schemaName]) {
                const updatedProperties = this.schemaPropertiesHandler(
                    processedSchemas,
                    schemaName,
                    schemas[schemaName] as OpenAPIV3.SchemaObject,
                    []
                );
                resultSchema[schemaName] = updatedProperties;
            }
        }
        this.seenSchemas.clear(); // 清除缓存的 schemas 名称
        return resultSchema;
    }
}

export default Service;
