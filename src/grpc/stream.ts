import {
    dbInstance,
    netSlaveBotInstance,
    streamReconnectTimeout,
} from '../index';
import { logger } from '../utils/logger';
import client from './client';

class GRPCstream {
    #stream: any;

    get self() {
        return this.#stream;
    }

    connect() {
        this.#stream = client.startChatTG();
        this.#stream.on('data', (response: { array: Array<any>; }) => {
            console.log('Message from backend: ', {
                text: response.array[1],
                chatID: response.array[0],
                attaches: response.array[2],
            });
            const chatid = Number(response.array[0]);
            dbInstance
                .getSlaveBotTokenAndUserIdByChatId(chatid)
                .then((sendMessageTo) => {
                    return sendMessageTo
                        ? netSlaveBotInstance.sendMessageFromClient(
                            {
                                chatid,
                                text: response.array[1] ?? '',
                                attachList: response.array[2]
                            },
                            sendMessageTo,
                        )
                        : new Error(
                            "this.#stream.on('data'),  no sendMessageTo: ",
                        );
                })
                .catch((error) => logger.error(error));
        });
        this.#stream.on('end', () => {
            logger.info('End grpc stream');
            setTimeout(() => this.connect(), streamReconnectTimeout * 1000);
        });
        this.#stream.on('error', (error: string) => {
            logger.error('Error catch, stream:  ', error);
        });
    }
}

export default GRPCstream;
