import { OpenAPIV3 } from "openapi-types";
import { ProcessedSchemas, Properties, Schema } from "../types/config";
import { cleanDescription, isReferenceObject, isPrimitiveType } from "../utils";

/**
 * @description 专门处理 Schema 的解析和处理逻辑
 */
class SchemaService {
    private descReg: RegExp;
    private seenSchemas: Set<string>;

    constructor() {
        // 正则表达式，用于处理接口描述
        this.descReg = /\r|\n|;\"|(<.+\/?>)/g;
        // 缓存未处理好的 schema
        this.seenSchemas = new Set();
    }

    /**
     * @description 处理 swagger 数据的 schemas 模型
     * @param schemas 原始的 schemas 数据
     * @returns 返回当前处理好的 schemas 数据
     */
    public async schemasDataHandler(
        schemas: OpenAPIV3.ComponentsObject["schemas"] = {}
    ): Promise<ProcessedSchemas> {
        try {
            const resultSchema = this.processSchemas(schemas);
            if (this.seenSchemas.size) {
                return await this.seenSchemasHandler(resultSchema, schemas);
            }
            return resultSchema;
        } catch (error) {
            throw error;
        }
    }

    /**
     * @description 遍历处理 schemas 数据
     * @param schemas 原始的 schemas 数据
     * @returns 返回处理好的 schemas 数据对象
     */
    private processSchemas(schemas: OpenAPIV3.ComponentsObject["schemas"] = {}): ProcessedSchemas {
        return Object.entries(schemas).reduce((pre, [curSchemaName, curSchemaData]) => {
            const schemaData: Schema | null = this.processSchema(pre, curSchemaName, curSchemaData);
            return {
                ...pre,
                [curSchemaName]: schemaData,
            };
        }, {} as ProcessedSchemas);
    }

    /**
     * @description 处理单个的 schema 数据
     * @param processedSchemas 已经处理好的 schema 对象数据
     * @param curSchemaName 当前处理的 schema 名称
     * @param curSchemaData 当前处理的 schema 数据
     * @returns 返回处理好的单个 schema 数据
     */
    private processSchema(
        processedSchemas: ProcessedSchemas,
        curSchemaName: string,
        curSchemaData: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject
    ): Schema {
        // 引用数据类型：$ref
        if ("$ref" in curSchemaData) {
            return this.processReferenceSchema(curSchemaName, curSchemaData, processedSchemas);
        }
        const { type = "", enum: details = null } = curSchemaData;
        // 基本数据类型：string、number、boolean、integer
        if (isPrimitiveType(type)) {
            return this.processPrimitiveSchema(curSchemaData);
        } else if (["object", "array"].includes(type)) {
            // 复合数据类型：object、array
            return this.processCompoundSchema(curSchemaName, curSchemaData, processedSchemas);
        } else if (details) {
            // 枚举数据类型：enum
            return this.processPrimitiveSchema(curSchemaData);
        } else {
            // 未知数据类型：unknown
            return {
                type: curSchemaData.type || "unknown",
                description: curSchemaData.description || "",
            };
        }
    }

    /**
     * @description 处理未解析成功并缓存的 schemas 数据
     * @param processedSchemas 已处理好的数据
     * @param schemas 源数据
     * @returns 处理后的数据
     */
    private async seenSchemasHandler(
        processedSchemas: ProcessedSchemas,
        schemas: OpenAPIV3.ComponentsObject["schemas"] = {}
    ): Promise<ProcessedSchemas> {
        const resultSchema = { ...processedSchemas };
        for (const schemaName of this.seenSchemas) {
            if (schemas[schemaName]) {
                const updatedProperties = this.processSchemaProperties(
                    schemaName,
                    schemas[schemaName],
                    processedSchemas
                );
                resultSchema[schemaName] = updatedProperties;
            }
        }
        this.seenSchemas.clear(); // 清除缓存的 schemas 名称
        return resultSchema;
    }

    /**
     * @description 处理 schema 为引用数据类型的数据
     * @param schemaName schema 名称
     * @param schemaData schema 对象
     * @param processedSchemas 已处理好的数据
     * @param type schema 类型
     * @returns 处理后的数据
     */
    private processReferenceSchema(
        schemaName: string,
        schemaData: OpenAPIV3.ReferenceObject,
        processedSchemas: ProcessedSchemas,
        type: string = ''
    ): Schema {
        const refName = schemaData.$ref?.split("/")?.pop() || "";
        const refObj = processedSchemas[refName] || null;
        if (refObj) {
            return refObj;
        }
        this.seenSchemas.add(schemaName);
        return {
            type: type || "unknown",
            description: ''
        };
    }

    /**
     * @description 处理 schema 为基本数据类型的数据
     * @param schemaData schema 对象
     * @returns 处理后的数据
     */
    private processPrimitiveSchema(schemaData: OpenAPIV3.SchemaObject): Schema {
        const { type = "", description = "", enum: details = null } = schemaData;
        return {
            type: type === "integer" ? "number" : type,
            description: cleanDescription(description, this.descReg),
            details,
        };
    }

    /**
     * @description 处理 schema 为复合类型的数据
     * @param schemaName schema 名称
     * @param schemaData schema 对象
     * @param processedSchemas 已处理好的数据
     * @returns 处理后的数据
     */
    private processCompoundSchema(
        schemaName: string,
        schemaData: OpenAPIV3.SchemaObject,
        processedSchemas: ProcessedSchemas
    ): Schema {
        const { type = "", description = "", required = [] } = schemaData;
        if (type === "object") {
            const propertiesArr = Object.entries(schemaData?.properties || {}).map(([key, value]) => {
                return this.processSchemaProperties(
                    key,
                    value,
                    processedSchemas,
                    required,
                    schemaName
                );
            });
            return {
                type,
                description,
                properties: propertiesArr.length > 0 ? propertiesArr : null,
            };
        }
        if (type === "array") {
            const { items = {} } = schemaData as OpenAPIV3.ArraySchemaObject;
            if (isReferenceObject(items)) {
                return this.processReferenceSchema(schemaName, items, processedSchemas, type);
            }
            return {
                type: 'Array<any>',
                description,
                properties: null,
            };
        }
        return {
            type: type || "unknown",
            description,
            properties: null,
        };
    }

    /**
     * @description 处理 properties 中的单个属性
     * @param key 属性名
     * @param value 属性值
     * @param processedSchemas 已处理好的 schemas 数据
     * @param requiredList 必填属性集合
     * @param curSchemaName 当前处理的 schema 名称
     * @returns 处理好的 properties 数组
     */
    private processSchemaProperties(
        key: string,
        value: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
        processedSchemas: ProcessedSchemas,
        requiredList: string[] = [],
        curSchemaName: string = ""
    ): Properties {
        if (isReferenceObject(value)) {
            return this.handleReferenceType(
                key,
                value,
                processedSchemas,
                requiredList,
                curSchemaName
            );
        }
        const { type = "" } = value;
        if (isPrimitiveType(type)) {
            return this.handlePrimitiveType(key, value, requiredList);
        }
        if (type === "array") {
            return this.handleArrayType(key, value, processedSchemas, requiredList, curSchemaName);
        }
        if (type === "object") {
            return this.handleObjectType(
                key,
                value,
                processedSchemas,
                requiredList,
                curSchemaName
            );
        }
        return this.handleDefaultType(key, value, processedSchemas, requiredList, curSchemaName);
    }

    /**
     * @description 处理 properties 为引用类型
     * @param key 属性名
     * @param value 属性值
     * @param processedSchemas 已经处理好的 schemas 数据
     * @param requiredList 必填属性集合
     * @param curSchemaName 当前处理的 schema 名称
     * @param type 当前属性类型
     * @returns 处理好的属性
     */
    private handleReferenceType(
        key: string,
        value: OpenAPIV3.ReferenceObject,
        processedSchemas: ProcessedSchemas,
        requiredList: string[],
        curSchemaName: string,
        type: string = 'any'
    ): Properties {
        const refName = value.$ref.split("/").pop() || '';
        const refObj = processedSchemas[refName] || null;
        if (!refObj) {
            this.seenSchemas.add(curSchemaName);
            return {
                key,
                type,
                description: "",
                required: requiredList.includes(key),
            };
        }
        let details: Array<Properties | number | string> = [];
        if (Array.isArray(refObj?.properties)) {
            details = [...refObj.properties];
        } else {
            details = Object.entries(refObj?.properties || []).map(([itemKey, itemValue]) => {
                return this.processSchemaProperties(
                    itemKey,
                    itemValue,
                    processedSchemas,
                    requiredList,
                    curSchemaName
                );
            });
        }
        return {
            key,
            type: refObj.type,
            description: refObj.description,
            required: requiredList.includes(key),
            details: details.length ? details : null,
        };
    }


    /**
     * @description 处理 properties 为基本数据类型
     * @param key 属性值
     * @param value 属性值
     * @param requiredList 必填属性集合
     * @returns 处理好的属性
     */
    private handlePrimitiveType(
        key: string,
        value: OpenAPIV3.SchemaObject,
        requiredList: string[]
    ): Properties {
        const { type = "", description = "", enum: details = null } = value;
        return {
            key,
            type: type === "integer" ? "number" : type,
            description: cleanDescription(description, this.descReg),
            required: requiredList.includes(key),
            details,
        };
    }

    /**
     * @description 处理 properties 为数组类型
     * @param key 属性名
     * @param value 属性值
     * @param processedSchemas 已经处理好的 schemas 数据
     * @param requiredList 必填属性集合
     * @param curSchemaName 当前处理的 schema 名称
     * @returns 处理好的属性
     */
    private handleArrayType(
        key: string,
        value: OpenAPIV3.SchemaObject,
        processedSchemas: ProcessedSchemas,
        requiredList: string[],
        curSchemaName: string
    ): Properties {
        const items = (value as OpenAPIV3.ArraySchemaObject).items;
        let details: Array<Properties | number | string> = [];
        let type = ''
        if (isReferenceObject(items)) {
            const refName = items.$ref.split("/").pop() || '';
            const refObj = processedSchemas[refName] || null;
            if (!refObj) {
                this.seenSchemas.add(curSchemaName);
            }
            if (Array.isArray(refObj?.properties)) {
                details = [...refObj.properties];
            } else {
                details = Object.entries(refObj?.properties || []).map(([itemKey, itemValue]) => {
                    return this.processSchemaProperties(
                        itemKey,
                        itemValue,
                        processedSchemas,
                        requiredList,
                        curSchemaName
                    );
                });
            }
            type = `Array<${details.length ? 'object' : 'any'}>`
        } else {
            type = `Array<${((items?.type || 'any') === 'integer' ? 'number' : (items?.type || 'any'))}>`;
        }
        return {
            key,
            type,
            description: cleanDescription(value.description || "", this.descReg),
            required: requiredList.includes(key),
            details: details.length ? details : null,
        };
    }

    /**
     * @description 处理 properties 为对象类型
     * @param key 属性名
     * @param value 属性值
     * @param processedSchemas 已经处理好的 schemas 数据
     * @param requiredList 必填属性集合
     * @param curSchemaName 当前处理的 schema 名称
     * @returns 处理好的属性
     */
    private handleObjectType(
        key: string,
        value: OpenAPIV3.SchemaObject,
        processedSchemas: ProcessedSchemas,
        requiredList: string[],
        curSchemaName: string
    ): Properties {
        const { properties = {}, allOf = [] } = value;
        if (Object.keys(properties).length) {
            const details = Object.entries(properties)?.map(([propKey, propValue]) =>
                this.processSchemaProperties(
                    propKey,
                    propValue,
                    processedSchemas,
                    requiredList,
                    curSchemaName
                )
            );
            return {
                key,
                type: "object",
                description: cleanDescription(value.description || "", this.descReg),
                required: requiredList.includes(key),
                details,
            };
        }
        if (allOf.length > 0 && isReferenceObject(allOf[0])) {
            return this.handleReferenceType(
                key,
                allOf[0],
                processedSchemas,
                requiredList,
                curSchemaName,
                'object'
            );
        }
        return {
            key,
            type: "Record<string, any>",
            description: cleanDescription(value.description || "", this.descReg),
            required: requiredList.includes(key),
        };
    }

    /**
     * @description 处理 properties 为未知类型
     * @param key 属性名
     * @param value 属性值
     * @param processedSchemas 已经处理好的 schemas 数据
     * @param requiredList 必填属性集合
     * @param curSchemaName 当前处理的 schema 名称
     * @returns 处理好的属性
     */
    private handleDefaultType(
        key: string,
        value: OpenAPIV3.SchemaObject,
        processedSchemas: ProcessedSchemas,
        requiredList: string[],
        curSchemaName: string
    ): Properties {
        const { type = "", description = "", allOf = [] } = value;
        if (!type && allOf.length > 0 && isReferenceObject(allOf[0])) {
            return this.handleReferenceType(
                key,
                allOf[0],
                processedSchemas,
                requiredList,
                curSchemaName
            );
        }
        return {
            key,
            type: "any",
            description: cleanDescription(description, this.descReg),
            required: requiredList.includes(key),
            details: null,
        };
    }
}

export default SchemaService;
