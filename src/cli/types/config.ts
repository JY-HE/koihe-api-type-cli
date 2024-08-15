import type { AxiosHeaders } from 'axios';

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
    documentServers: Array<{
        // 文档地址
        url: string;
        // 文档类型，根据文档类型，调用内置的解析器，默认值: 'swagger'。目前仅支持'swagger'
        type: 'swagger' | string;
        // 服务名称
        name?: string;
        // 获取响应数据的key，body[dataKey]
        dataKey?: string;
        // 访问文档可能需要认证信息，http auth 验证方式
        auth?: {
            username: string;
            password: string;
        };
        // 访问文档可能需要认证信息，通过使用token访问
        authToken?: '';
        // 访问接口文档时候，自定义的一些请求头
        headers?: AxiosHeaders | Record<string, any>,
    }>,
}