# @koihe/api-type-cli

> 一个可以根据用户自定义的配置文件，自动请求 `Swagger` 文档数据，并解析处理自动生成 `API` 接口类型定义的快捷工具库。

## 安装

```
npm install @koihe/api-type-cli -D
or
yarn add @koihe/api-type-cli -D
...
```

## 使用方式

- 初始化配置文件

```
apit init
```

- 运行生成 `API` 文件
  - 打开 `apitConfig.json` 文件进行自定义配置
  - 完成配置之后，输入下面指令，即可生成 `API` 文件
```
apit
```

## 配置文件说明

```javascript
{
    // API 文件生成后的输出路径，默认值：src/types。必填
    outputPath: "";
    // 请求数据所有字段设置成必有属性，默认值: false
    requiredRequestField?: false;
    // 响应数据所有字段设置成必有属性，默认值：true
    requiredResponseField?: false;
    // 接口文档服务配置，可配置多个文档服务，servers 为数组对象，必填
    servers: [
        {
            // 文档地址，必填
            url: "";
            // 服务名称，默认值：获取到的 swagger 文档的 info.title || 'default'。有值的情况下，文件输出变成 -> 路径/[name].ts
            name?: "";
            // 文档类型，根据文档类型，调用内置的解析器，默认值: 'swagger'。目前仅支持'swagger'
            type?: "swagger";
            // 当前服务版本，默认值: 获取到的 swagger 文档的 info.version || 'v1'，如果是其他版本，如 v2，生成的类型定义名称自动会拼接 'V2'
            version?: "";
            // 自定义类型名称后缀，可以用于区分不同服务的同名api。请求类型名称默认：methodType + url + 'ReqType' + typeNameSuffix + version，响应类型名称默认：methodType + url + 'ResType' + typeNameSuffix + version
            typeNameSuffix?: "";
            // 访问文档可能需要认证信息，通过使用token访问
            authToken?: "";
            // 访问接口文档时候，自定义的一些请求头
            headers?: {};
            // 访问接口文档时候，自定义的一些请求参数
            params?: {};
        }
    ];
}
```