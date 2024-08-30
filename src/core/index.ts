import { writeFileSync } from "fs-extra";
import { join } from "path";
import ConfigService from "./service/configService";
import SwaggerService from "./service/swaggerService";
import SchemaService from "./service/schemaService";
import LoggerService from "./service/loggerService";
import { Config, SwaggerData } from "./types/config";

class Service {
    private configService = new ConfigService();
    private swaggerService = new SwaggerService();
    private schemaService = new SchemaService();

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
        let schemaDataJson = {}
        for (const swagger of swaggerData) {
            try {
                const { components, bizName } = swagger;
                const schemas = components?.schemas || null;
                if (schemas) {
                    let schemaData = await this.schemaService.schemasDataHandler(schemas);
                    schemaDataJson = { ...schemaDataJson, [bizName]: schemaData };
                } else {
                    console.warn(`No schemas found for ${bizName}`);
                }
            } catch (error) {
                throw error;
            }
        }
        LoggerService.succeed("数据解析完成");
        // 写入 schema.json
        writeFileSync(
            join(process.cwd(), 'schema.json'),
            JSON.stringify(schemaDataJson, null, '\t'),
            'utf8'
        );
    }
}

export default Service;
