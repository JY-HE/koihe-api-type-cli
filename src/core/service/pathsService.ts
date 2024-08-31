import { OpenAPIV3 } from "openapi-types";
import { ProcessedSchemas, SwaggerData } from "../types/config";
import {
    ProcessedParameters,
    ProcessedResponses,
    ProcessedRequestBody,
    ProcessedPath,
} from "../types/paths";
import { isReferenceObject, isPrimitiveType } from "../utils";

/**
 * @description 处理 paths 数据的解析
 */
class PathsService {
    private descReg: RegExp;

    constructor() {
        // 正则表达式，用于处理接口描述
        this.descReg = /\r|\n|;\"|(<.+\/?>)/g;
    }

    /**
     * @description 处理 swagger 数据的 paths
     * @param paths 原始的 paths 数据
     * @param schemaData 处理后的 schema 数据
     * @param serverConfig 当前处理的 swagger 的自定义配置
     * @returns 返回当前处理好的 paths 数据
     */
    public async pathsDataHandler(
        paths: OpenAPIV3.PathsObject = {},
        schemaData: ProcessedSchemas,
        serverConfig: SwaggerData["serverConfig"]
    ): Promise<ProcessedPath[]> {
        return new Promise((resolve, reject) => {
            try {
                const resultPath: ProcessedPath[] = [];
                Object.keys(paths).forEach((url) => {
                    Object.entries(paths[url] || {}).forEach(
                        ([methodType, value]: [string, OpenAPIV3.OperationObject]) => {
                            const {
                                operationId,
                                summary,
                                tags,
                                parameters,
                                requestBody,
                                responses,
                            } = value;
                            const transformParameters = this.apiParametersHandler(
                                parameters as OpenAPIV3.ParameterObject[],
                                schemaData
                            );
                            const transformRequestBody = this.apiRequestBodyHandler(
                                requestBody as OpenAPIV3.RequestBodyObject,
                                schemaData
                            );
                            const transformResponses = this.apiResponsesHandler(
                                responses as OpenAPIV3.ResponsesObject,
                                schemaData
                            );
                            const requestTypeName = this.getNameFromUrl(
                                1,
                                transformParameters,
                                transformRequestBody,
                                transformResponses,
                                url,
                                methodType,
                                serverConfig
                            );
                            const responsesTypeName = this.getNameFromUrl(
                                2,
                                transformParameters,
                                transformRequestBody,
                                transformResponses,
                                url,
                                methodType,
                                serverConfig
                            );
                            resultPath.push({
                                url,
                                tag: tags?.[0] || "",
                                method: methodType,
                                summary,
                                version: serverConfig.version,
                                requestTypeName,
                                responsesTypeName,
                                operationId,
                                parameters: transformParameters,
                                responses: transformResponses,
                                requestBody: transformRequestBody,
                            });
                        }
                    );
                });
                resolve(resultPath);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * @description 处理接口 parameters 参数
     * @param parameters 接口对象的 parameters 数组
     * @param schemaData 模型数据
     * @returns 处理后的 parameters 参数数组
     */
    private apiParametersHandler(
        parameters: OpenAPIV3.ParameterObject[],
        schemaData: ProcessedSchemas
    ): ProcessedParameters[] | null {
        try {
            if (!Array.isArray(parameters)) {
                return null;
            }
            return parameters.map((item) => {
                // 基本参数
                let paramInfo: ProcessedParameters = {
                    key: item.name,
                    type: "",
                    description: this.getDescription(item),
                    required: item.required || false,
                    default: null,
                    in: item.in,
                    details: null,
                };

                if (item.schema) {
                    if (isReferenceObject(item.schema)) {
                        const referenceResult = this.schemaReferenceHandler(
                            item.schema,
                            schemaData
                        );
                        paramInfo.type = referenceResult.type;
                        paramInfo.details = referenceResult.details;
                    } else {
                        const schemaObjectResult = this.schemaObjectHandler(
                            item.schema,
                            schemaData
                        );
                        paramInfo.type = schemaObjectResult.type;
                        paramInfo.details = schemaObjectResult.details;
                        paramInfo.default = item.schema.default;
                    }
                }
                return paramInfo;
            });
        } catch (error) {
            throw error;
        }
    }

    /**
     * @description 获取参数描述
     * @param item 参数对象
     * @returns 参数描述
     */
    private getDescription(item: OpenAPIV3.ParameterObject): string {
        return item.description
            ? item.description.replace(this.descReg, "")
            : /id$/i.test(item.name)
            ? item.name
            : "";
    }

    /**
     * @description 处理 schema 为对象类型的数据
     * @param schema 数据
     * @param schemaData 已经处理好的模型
     * @returns 处理后的数据
     */
    private schemaObjectHandler(
        schema: OpenAPIV3.SchemaObject,
        schemaData: ProcessedSchemas
    ): {
        type: string;
        details: any;
    } {
        const { type = "", allOf = [] } = schema;
        if (isPrimitiveType(type)) {
            return {
                type: type === "integer" ? "number" : type,
                details: null,
            };
        } else if (type === "array") {
            const { items } = schema as OpenAPIV3.ArraySchemaObject;
            if (isReferenceObject(items)) {
                return this.schemaReferenceHandler(items, schemaData);
            }
            return {
                type: `Array<${
                    items.type ? (items.type === "integer" ? "number" : items.type) : "any"
                }>`,
                details: null,
            };
        } else if (isReferenceObject(allOf[0])) {
            return this.schemaReferenceHandler(allOf[0], schemaData);
        }
        return {
            type: "any",
            details: null,
        };
    }

    /**
     * @description 处理 schema 为引用类型的数据
     * @param schema 数据
     * @param schemaData 已经处理好的模型
     * @returns 处理后的数据
     */
    private schemaReferenceHandler(
        schema: OpenAPIV3.ReferenceObject,
        schemaData: ProcessedSchemas
    ): {
        type: string;
        details: any;
    } {
        const refName = schema.$ref.split("/")?.at(-1) || "";
        const refData = schemaData?.[refName] || {};
        return {
            type: refData.type,
            details: refData.details,
        };
    }

    /**
     * @description 处理接口 requestBody 参数
     * @param requestBody 接口对象的 requestBody 对象
     * @param schemaData 模型数据
     * @returns 处理后的 requestBody 参数数组
     */
    private apiRequestBodyHandler(
        requestBody: OpenAPIV3.RequestBodyObject,
        schemaData: ProcessedSchemas
    ): ProcessedRequestBody[] | null {
        if (!requestBody) return null;
        const schemaWrap = requestBody.content["application/json"]?.schema ?? {};
        let schemaRef = "";
        if (isReferenceObject(schemaWrap)) {
            schemaRef = schemaWrap.$ref;
        } else if (schemaWrap.allOf && isReferenceObject(schemaWrap.allOf[0])) {
            schemaRef = schemaWrap.allOf[0].$ref;
        }
        const schemaName = schemaRef.split("/")?.at(-1) || "";
        return (
            schemaData[schemaName]?.properties?.map((i) => ({ ...i, in: "requestBody" })) || null
        );
    }

    /**
     * @description 处理接口 responses 参数
     * @param responses 接口对象的 responses 对象
     * @param schemaData 模型数据
     * @returns 处理后的 responses 参数数组
     */
    private apiResponsesHandler(
        responses: OpenAPIV3.ResponsesObject,
        schemaData: ProcessedSchemas
    ): ProcessedResponses[] | null {
        if (!responses) return null;
        const responsesData = responses["200"] || responses["201"] || responses["204"];
        if (isReferenceObject(responsesData)) {
            const refName = responsesData.$ref.split("/")?.at(-1) || "";
            return schemaData[refName]?.properties || null;
        }
        if (responsesData?.content) {
            const schemaObj = responsesData.content["application/json"].schema as any;
            const refName = schemaObj?.$ref || schemaObj?.items?.$ref || "";
            const responseSchemaName = refName.split("/").at(-1);
            return schemaData[responseSchemaName]?.properties || null;
        }
        return null;
    }

    /**
     * @description 解析 url 获取类型定义名称
     * @param type 1-requestTypeName 2-responsesTypeName
     * @param parameters api参数对象
     * @param requestBody api请求体对象
     * @param responses api响应对象
     * @param url Api Url
     * @param methodType 请求方式
     * @param serverConfig 当前处理的 swagger 的自定义配置
     * @returns 创建好的requestTypeName或responsesTypeName
     */
    private getNameFromUrl(
        type: number,
        parameters: ProcessedParameters[] | null,
        requestBody: ProcessedRequestBody[] | null,
        responses: ProcessedResponses[] | null,
        url: string,
        methodType: string,
        serverConfig: SwaggerData["serverConfig"]
    ): string {
        const { version = "", typeNameSuffix = "" } = serverConfig;

        const urls = url
            .split("/")
            .filter((item) => item !== "api")
            .map((item) => this.capitalizeFirstLetter(item));
        if (type === 1) {
            if (!parameters && !requestBody) return "";
            return `${this.capitalizeFirstLetter(methodType)}${urls.join(
                ""
            )}ReqType${typeNameSuffix}${
                version === "v1" ? "" : this.capitalizeFirstLetter(version)
            }`;
        } else {
            if (!responses) return "";
            return `${this.capitalizeFirstLetter(methodType)}${urls.join(
                ""
            )}ResType${typeNameSuffix}${
                version === "v1" ? "" : this.capitalizeFirstLetter(version)
            }`;
        }
    }

    /**
     * @description 处理字符串转换为PascalCase格式
     * @param str 字符串
     * @returns 转换后的字符串
     */
    private capitalizeFirstLetter(str: string): string {
        let res = str || "";
        if (res.includes("{")) {
            res = res.replace(/[{}]/g, "");
        }
        if (res.includes("_")) {
            return res.replace(/(?:^|_)([a-z])/g, function (_, p1) {
                return p1.toUpperCase();
            });
        }
        return res ? res.replace(/^\w/, (c) => c.toUpperCase()) : "";
    }
}

export default PathsService;
