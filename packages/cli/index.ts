import { cac } from "cac";
import { version } from "../../package.json";

// 创建一个命令行应用程序实例，指定调用该应用程序的名称为 boat
const cli = cac("apit");

// 设置版本号，可通过 --version 标志来获取应用程序的版本信息
cli.version(version);

cli.parse();
