import ora from "ora";
import pc from "picocolors";

/**
 * @description 处理日志和错误信息服务
 */
class LoggerService {
    private spinner = ora();

    /**
     * @description 开始旋转
     * @param message 日志信息
     */
    public start(message: string) {
        this.spinner.start(pc.cyan(message));
    }

    /**
     * @description 成功完成并显示成功消息
     * @param message 日志信息
     */
    public succeed(message: string) {
        this.spinner.succeed(pc.green(message));
    }

    /**
     * @description 失败并显示错误消息
     * @param message 日志信息
     */
    public fail(message: string) {
        this.spinner.fail(pc.red(message));
    }

    /**
     * @description 显示错误消息
     * @param message 日志信息
     */
    public logError(error: any) {
        console.error(pc.red(error));
    }
}

export default new LoggerService();
