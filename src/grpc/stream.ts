import { logger } from '../utils/logger';
import {
    dbInstance,
    netSlaveBotInstance,
    streamReconnectTimeout,
} from '../index';
import client from './client';

class GRPCstream {
    #stream: any;

    get self() {
        return this.#stream;
    }

    connect() {
        this.#stream = client.startChatTG(
            (error: string, newsStatus: { success: string }) => {
                if (error) {
                    console.error(error);
                }
                console.log('Stream success: ', newsStatus.success);
                client.close();
            },
        );
        this.#stream.on('data', (response: { array: Array<string> }) => {
            console.log('Message from backend: ', {
                text: response.array[0],
                chatID: response.array[1],
            });
            const chatid = Number(response.array[1]);
            dbInstance
                .getSlaveBotTokenAndUserIdByChatId(chatid)
                .then((sendMessageTo) => {
                    return sendMessageTo
                        ? netSlaveBotInstance.sendMessageFromClient(
                              {
                                  chatid,
                                  text: response.array[0],
                                  fileLink: '',
                                  mimetype: '',
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
