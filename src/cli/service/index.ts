import { isExistsFile } from "../utils";

class Service {
    /**
     * @description 初始化配置文件
     */
    async init() {
        const res = await isExistsFile();
        if (!res) return;
        console.log("🚀 ~ index.ts:10 ~ res:", res);
    }
}

export default Service;
