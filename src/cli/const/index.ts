/**
 * @description 配置文件名称
 */
export const CONFIG_FILE_NAME = "apitConfig.json";

/**
 * @description 配置文件内容
 */
export const CONFIG_FILE_CONTENT = `
{
  "outputPath": "src/api/index.ts", 
  "requiredRequestField": false,
  "requiredResponseField": true,
  "servers": [{
    "url": "http://接口文档地址.com",
    "type": "swagger",
    "name": "",
    "dataKey": "",
    "auth": {
      "username": "",
      "password": ""
    },
    "authToken": "",
    "headers": {},
    "params": {}
  }]
}
`
