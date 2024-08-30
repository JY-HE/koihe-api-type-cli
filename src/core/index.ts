import { writeFileSync } from "fs-extra";
import { join } from "path";
import ConfigService from "./service/configService";
import SwaggerService from "./service/swaggerService";
import SchemaService from "./service/schemaService";
import LoggerService from "./service/loggerService";
import PathsService from "./service/pathsService";
import { Config, SwaggerData } from "./types/config";

class Service {
    private configService = new ConfigService();
    private swaggerService = new SwaggerService();
    private schemaService = new SchemaService();
    private pathsService = new PathsService();

    public async initConfigFile(): Promise<void> {
        await this.configService.initConfigFile();
    }

    public async getConfigFile(): Promise<Config> {
        return await this.configService.getConfigFile();
    }

    public async getSwaggerData(config: Config): Promise<SwaggerData[]> {
        return await this.swaggerService.getSwaggerData(config);
    }

    public async parseSwaggerData(swaggerData: SwaggerData[]): Promise<void> {
        LoggerService.start("正在解析数据...");
        let schemaDataJson = {};
        let pathsDataJson = {};
        for (const swagger of swaggerData) {
            try {
                const { components, paths, serverConfig } = swagger;
                const schemas = components?.schemas || null;
                if (schemas) {
                    const schemaData = await this.schemaService.schemasDataHandler(schemas);
                    schemaDataJson = { ...schemaDataJson, [serverConfig.bizName]: schemaData };
                    if (Object.keys(paths).length) {
                        const pathsData = await this.pathsService.pathsDataHandler(
                            paths,
                            schemaData,
                            serverConfig
                        );
                        pathsDataJson = { ...pathsDataJson, [serverConfig.bizName]: pathsData };
                    }
                } else {
                    console.warn(`No schemas found for ${serverConfig.bizName}`);
                }
            } catch (error) {
                throw error;
            }
        }
        LoggerService.succeed("数据解析完成");
        // 写入 schema.json
        writeFileSync(
            join(process.cwd(), "schema.json"),
            JSON.stringify(schemaDataJson, null, "\t"),
            "utf8"
        );
        // 写入 biz.json
        writeFileSync(
            join(process.cwd(), "biz.json"),
            JSON.stringify(pathsDataJson, null, "\t"),
            "utf8"
        );
    }
}

export default Service;
