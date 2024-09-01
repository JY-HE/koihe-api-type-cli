# 版本记录

## [v1.1.1] - 2024-9-1

### fix
- 修复命令 `npx apit -v` 输出版本号错误问题。

## [v1.1.0] - 2024-9-1

### feat
- 增加了 `requiredRequestField` 和 `requiredResponseField` 配置，支持对 `type` 的字段设置是否必有属性。

## [v1.0.0] - 2024-8-31

### feat
- 发布第一个版本。根据用户自定义的配置文件，自动请求 `Swagger` 文档数据，并解析处理自动生成 `API` 接口类型定义文件。