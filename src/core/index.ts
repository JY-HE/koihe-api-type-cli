import { writeFileSync } from "fs-extra";
import { join } from "path";
import ConfigService from "./service/configService";
import SwaggerService from "./service/swaggerService";
import SchemaService from "./service/schemaService";
import LoggerService from "./service/loggerService";
import PathsService from "./service/pathsService";
import CreateTsFileService from "./service/createTsFileService";
import { Config, SwaggerData, ProcessedSchemas } from "./types/config";
import { ProcessedPath } from "./types/paths";

class Service {
    private configService = new ConfigService();
    private swaggerService = new SwaggerService();
    private schemaService = new SchemaService();
    private pathsService = new PathsService();
    private createTsFileService = new CreateTsFileService();
    private schemaDataJson: {
        [bizName: string]: ProcessedSchemas;
    };
    private pathsDataJson: {
        [bizName: string]: ProcessedPath[];
    };

    constructor() {
        this.schemaDataJson = {};
        this.pathsDataJson = {};
    }

    public async initConfigFile(): Promise<void> {
        await this.configService.initConfigFile();
    }

    public async getConfigFile(): Promise<Config> {
        return await this.configService.getConfigFile();
    }

    public async getSwaggerData(config: Config): Promise<SwaggerData[]> {
        return await this.swaggerService.getSwaggerData(config);
    }

    public async parseSwaggerData(swaggerData: SwaggerData[], config: Config): Promise<void> {
        LoggerService.start("正在解析数据...\n");
        for (const swagger of swaggerData) {
            try {
                const { components, paths, serverConfig } = swagger;
                const schemas = components?.schemas || null;
                if (schemas) {
                    const schemaData = await this.schemaService.schemasDataHandler(schemas);
                    this.schemaDataJson = {
                        ...this.schemaDataJson,
                        [serverConfig.bizName]: schemaData,
                    };
                    if (Object.keys(paths).length) {
                        const pathsData = await this.pathsService.pathsDataHandler(
                            paths,
                            schemaData,
                            serverConfig
                        );
                        this.pathsDataJson = {
                            ...this.pathsDataJson,
                            [serverConfig.bizName]: pathsData,
                        };
                    }
                } else {
                    console.warn(`No schemas found for ${serverConfig.bizName}`);
                }
            } catch (error) {
                throw error;
            }
        }
        LoggerService.succeed("数据解析完成");
        // 写入 schemasData.json
        writeFileSync(
            join(process.cwd(), "schemasData.json"),
            JSON.stringify(this.schemaDataJson, null, "\t"),
            "utf8"
        );
        // 写入 pathsData.json
        writeFileSync(
            join(process.cwd(), "pathsData.json"),
            JSON.stringify(this.pathsDataJson, null, "\t"),
            "utf8"
        );
        LoggerService.start("正在写入文件...\n");
        for (const key in this.pathsDataJson) {
            await this.createTsFileService.startup(key, this.pathsDataJson[key], config);
        }
        LoggerService.succeed("写入文件完成");
    }
}

export default Service;
