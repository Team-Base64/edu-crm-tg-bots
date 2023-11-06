import { dbInstance } from '../index';
import { logger } from '../utils/logger';

class SlaveBotBalancer {
    #lastBot: number;
    #botCount: number;
    constructor() {
        this.#lastBot = 0;
        this.#botCount = 0;

        this.init().catch((error) => {
            logger.fatal(error);
        });
    }

    async init() {
        this.#botCount = await dbInstance.getSlaveBotsNumber();
    }

    async getFirstEverBotId() {
        this.#lastBot += 1;
        const id = this.#lastBot % this.#botCount;
        return { botid: id, link: await dbInstance.getSlaveBotLink(id) };
    }

    getNextBot(bots: Array<{ botid: number; link: string }>) {
        this.#lastBot += 1;
        const index = this.#lastBot % bots.length;
        return { botid: bots[index].botid, link: bots[index].link };
    }
}

export default SlaveBotBalancer;
