/**
 * @description 配置文件名称
 */
export const CONFIG_FILE_NAME = "apit.config.ts";

/**
 * @description 配置文件内容
 */
export const CONFIG_FILE_CONTENT = `import { defineConfig } from '@koihe/api-type-cli';

export default defineConfig({
  // 代码生成后的输出路径
  outputPath: 'src/api/index.ts',
  // 请求数据所有字段设置成必有属性，默认: false
  requiredRequestField: false,
  // 响应数据所有字段设置成必有属性，默认: true
  requiredResponseField: true,
  // 接口文档服务配置
  documentServers: [{
    // 文档地址
    url: 'http://接口文档地址.com',
    // 文档类型，根据文档类型，调用内置的解析器，默认值: 'swagger'。目前仅支持'swagger'
    type: 'swagger',
    // 当前接口文档服务名称，有值的情况下，文件输出变成 -> 路径/当前name
    name: '',
    // 获取响应数据的key，body[dataKey]
    dataKey: '',
    // 访问文档可能需要认证信息，http auth 验证方式
    auth: {
      username: '',
      password: '',
    },
    // 访问文档可能需要认证信息，通过使用token访问
    authToken: '',
    // 访问接口文档时候，自定义的一些请求头
    headers: {},
  }],
});
`
