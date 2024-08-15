import Cli from "./cli";
import { Config } from "./cli/types/config";

export function defineConfig(config: Config | Config[]): Config[] {
    return Array.isArray(config) ? config : [config];
}

function main() {
    const cli = new Cli();
    cli.run();
}

main();
