import { dbInstance } from '../index';
import { logger } from '../utils/logger';

class SlaveBotBalancer {
    #lastBot: number;
    #botCount: number;
    allBots: Array<{ link: string; id: number }>;
    constructor() {
        this.#lastBot = 0;
        this.#botCount = 0;
        this.allBots = [];

        this.init().catch((error) => {
            logger.fatal(error);
        });
    }

    async init() {
        this.#botCount = await dbInstance.getSlaveBotsNumber();
        this.allBots = (await dbInstance.getSlaveBotsLinksAndId()) ?? [];
    }

    async getFirstEverBotId() {
        this.#lastBot += 1;
        const id = this.#lastBot % this.#botCount;
        return { botid: id, link: await dbInstance.getSlaveBotLink(id) };
    }

    getNextBot(bots: Map<number, string>) {
        this.#lastBot += 1;
        const unusedBots = this.allBots.filter(
            (element) => !bots.has(element.id),
        );

        logger.info('unusedBots: ' + unusedBots.toString());

        const index = this.#lastBot % unusedBots.length;
        logger.trace('index: ' + index);

        return { botid: unusedBots[index].id, link: unusedBots[index].link };
    }
}

export default SlaveBotBalancer;
