import { isExistsFile } from "../utils";
import { CONFIG_FILE_NAME, CONFIG_FILE_CONTENT } from "../const";
import { outputFile } from 'fs-extra';
import path from 'path';
import pc from 'picocolors';

class Service {
    /**
     * @description 初始化配置文件
     */
    public async initConfigFile() {
        // 检查文件是否存在
        const isOverwrite = await isExistsFile(CONFIG_FILE_NAME);
        if (!isOverwrite) return;
        try {
            const configFile = path.join(process.cwd(), CONFIG_FILE_NAME);
            // 生成初始化配置文件
            await outputFile(configFile, CONFIG_FILE_CONTENT, 'utf-8');
            console.log(pc.green('配置文件生成成功。'));
        } catch (error) {
            console.error('配置文件生成失败:', error);
        }
    }
}

export default Service;
