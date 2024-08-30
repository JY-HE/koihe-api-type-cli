import inquirer from "inquirer";
import { existsSync } from "fs-extra";
import { OpenAPIV3 } from "openapi-types";

/**
 * @description 判断是否创建配置文件
 * @params filePath 文件路径
 * @returns boolean
 */
export const isCreateFile = async (filePath: string): Promise<boolean> => {
    try {
        // 判断文件是否存在
        if (existsSync(filePath)) {
            const { isOverwrite } = await inquirer.prompt<{
                isOverwrite: boolean;
            }>([
                {
                    type: "list",
                    name: "isOverwrite",
                    message: "目标文件已存在，请选择操作",
                    choices: [
                        { name: "覆盖文件", value: true },
                        { name: "取消", value: false },
                    ],
                },
            ]);
            return isOverwrite;
        } else {
            return true;
        }
    } catch (error) {
        console.error("判断是否创建配置文件发生错误:", error);
        return false;
    }
};

/**
 * @description 格式化描述
 * @param description 描述
 * @param descReg 正则表达式
 * @returns 格式化之后的描述
 */
export const cleanDescription = (description: string, descReg: RegExp): string => {
    return description.replace(descReg, "");
}


/**
 * @description 判断是否是引用类型
 * @param obj 对象
 * @returns 返回是否是引用类型
 */
export const isReferenceObject = (obj: any): obj is OpenAPIV3.ReferenceObject => {
    return "$ref" in obj;
};

/**
 * @description 判断是否是基本数据类型
 * @param type 类型
 * @returns 返回是否是基本数据类型
 */
export const isPrimitiveType = (type: string): boolean => {
    return ["number", "integer", "string", "boolean"].includes(type);
}