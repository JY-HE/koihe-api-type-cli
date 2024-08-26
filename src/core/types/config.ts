import type { AxiosHeaders } from 'axios';
import { AxiosRequestConfig } from 'axios';
import { Agent } from "https";
import { OpenAPIV3 } from "openapi-types";

/**
 * @description 配置文件中 Server 类型
 */
export type Server = {
    // 文档地址
    url: string;
    // 服务名称，默认值：获取到的 swagger 文档的 info.title || 'default'。有值的情况下，文件输出变成 -> 路径/当前name
    name?: string;
    // 文档类型，根据文档类型，调用内置的解析器，默认值: 'swagger'。目前仅支持'swagger'
    type?: 'swagger' | string;
    // 当前服务版本，默认值: 获取到的 swagger 文档的 info.version || 'v1'，如果是其他版本，如 v2，生成的类型定义名称自动会拼接 'V2'
    version?: string;
    // 访问文档可能需要认证信息，通过使用token访问
    authToken?: '';
    // 访问接口文档时候，自定义的一些请求头
    headers?: AxiosHeaders | Record<string, any>,
    // 访问接口文档时候，自定义的一些请求参数
    params?: Record<string, string>,
}

/**
 * @description 配置文件类型
 */
export type Config = {
    // 代码生成后的输出路径
    outputPath: string;
    // 请求数据所有字段设置成必有属性，默认: false
    requiredRequestField?: boolean;
    // 响应数据所有字段设置成必有属性，默认：true
    requiredResponseField?: boolean;
    // 接口文档服务配置
    servers: Array<Server>,
}

/**
 * @description 请求配置类型
 */
export type RequestConfig = AxiosRequestConfig & {
    httpsAgent: Agent;
}

/**
 * @description swagger 文档数据类型
 */
export type SwaggerData = OpenAPIV3.Document & {
    bizName: string;
    version: string;
}

export type Properties = {
    key: string,
    type: string,
    description: string,
    required: boolean,
    details?: Array<Properties | number | string> | null
}

/**
 * @description 处理后的单个 schema 对象数据类型
 */
export type Schema = {
    type: string,
    description: string,
    properties?: Array<Properties> | null
    details?: Array<any> | null
};

/**
 * @description 处理后的 schemas 对象数据类型
 */
export type ProcessedSchema = {
    [key: string]: Schema
}

