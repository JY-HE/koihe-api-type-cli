import { Properties } from "./config";

/**
 * @description 处理后的单个 path 对象数据类型
 */
export type ProcessedPath = {
    url: string;
    tag: string;
    method: string;
    summary?: string;
    version?: string;
    requestTypeName: string;
    responsesTypeName: string;
    operationId?: string;
    parameters: ProcessedParameters[] | null;
    responses: ProcessedResponses[] | null;
    requestBody: ProcessedRequestBody[] | null;
};

/**
 * @description 处理后的 path 对象中的 parameters 数据类型
 */
export type ProcessedParameters = {
    key: string;
    type: string;
    description: string;
    required: boolean;
    default?: any;
    in?: string;
    details?: any;
};

/**
 * @description 处理后的 path 对象中的 responses 数据类型
 */
export type ProcessedResponses = Properties;

/**
 * @description 处理后的 path 对象中的 requestBody 数据类型
 */
export type ProcessedRequestBody = {
    key: string;
    type: string;
    description: string;
    required: boolean;
    default?: any;
    in?: string;
    details?: any;
};
