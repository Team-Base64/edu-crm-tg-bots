const messages = require('../grpc/proto/model_pb');
require('dotenv').config();
import { ProtoAttachMessage, ProtoMessage } from '../../types/interfaces';
import Bots from './slaveBot';
import { logger } from '../utils/logger';
import { streamInstance } from '../grpc/server';

import client from '../grpc/client';

export default class Net {
    bots;

    constructor(tokens: Array<string>, chatIDs: Array<number>) {
        this.bots = new Bots(
            tokens,
            chatIDs,
            this.sendMessageToClient,
            this.sendMessageWithAttachToClient,
        );
        this.bots.launchBots();
    }

    sendMessageFromClient(message: ProtoAttachMessage) {
        const sendMessageTo = this.bots.context.get(message.chatid);
        if (sendMessageTo) {
            if (message.text) {
                this.bots.sendMessage(sendMessageTo, message.text);
            }
            if (message.fileLink) {
                if (message.mimetype.includes('image')) {
                    this.bots.sendPhoto(sendMessageTo, message.fileLink);
                } else {
                    this.bots.sendDocument(sendMessageTo, message.fileLink);
                }
            }
        } else {
            logger.error(
                `sendMessageFromClient error, no such chat id = ${message.chatid}`,
            );
        }
    }

    sendMessageToClient(message: ProtoMessage) {
        if (message.chatid !== undefined) {
            logger.info(
                `sendMessageToClient: chatID: ${message.chatid}, text = ${message.text}`,
            );
            const request = new messages.Message();
            request.setText(message.text);
            request.setChatid(message.chatid);
            streamInstance.self.write(request);
        } else {
            logger.error(
                `sendMessageToClient error, no such chat id = ${message.chatid}`,
            );
        }
    }

    sendMessageWithAttachToClient(message: ProtoAttachMessage) {
        if (message.chatid !== undefined) {
            logger.info(`sendMessageToClient: chatID: ${message.chatid}, text = ${message.text},
             mimeType: ${message.mimetype}, fileLink: ${message.fileLink}`);

            const request = new messages.FileUploadRequest();
            //request.setChatid(message.chatid);
            //request.setText(message.text);
            request.setMimetype(message.mimetype);
            request.setFileurl(message.fileLink);
            client.uploadFile(
                request,
                (error: string, response: { array: Array<string> }) => {
                    if (error) {
                        logger.error(error);
                    } else {
                        logger.info(
                            `response inner file url: ${response.array[1]}`,
                        );
                        const request2 = new messages.Message();
                        request2.setText(message.text);
                        request2.setChatid(message.chatid);
                        // нужно ставить тип сообщения
                        request2.setMessagetype('message');
                        request2.setAttachesurlsList([response.array[1]]);
                        // если это домашка, поставить id домашки
                        request2.setHomeworkid(-1);
                        streamInstance.self.write(request2);
                    }
                },
            );
        } else {
            logger.error(
                `sendMessageWithAttachToClient error, no such chat id = ${message.chatid}`,
            );
        }
    }
}
