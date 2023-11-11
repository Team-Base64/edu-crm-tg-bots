const messages = require('../grpc/proto/model_pb');
require('dotenv').config();

import { ProtoAttachMessage, ProtoMessage } from '../../types/interfaces';
import SlaveBots, { SendMessageTo } from './slaveBot';
import { logger } from '../utils/logger';
import client from '../grpc/client';

import { streamInstance } from '../index';

export default class NetSlaveBot {
    bots;

    constructor() {
        this.bots = new SlaveBots(
            this.sendMessageToClient,
            this.sendMessageWithAttachToClient,
        );
    }

    sendMessageFromClient(
        message: ProtoAttachMessage,
        sendMessageTo: SendMessageTo,
    ) {
        if (sendMessageTo) {
            if (message.fileLink) {
                if (message.mimetype.includes('image')) {
                    this.bots.sendPhoto(sendMessageTo, message.fileLink);
                } else {
                    this.bots.sendDocument(sendMessageTo, message.fileLink);
                }
            }
            if (message.text) {
                this.bots.sendMessage(sendMessageTo, message.text);
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
            request.setMimetype(message.mimetype);
            request.setFileurl(message.fileLink);
            client.uploadFile(
                request,
                (error: string, response: { array: Array<string> }) => {
                    if (error) {
                        logger.error(error);
                    } else {
                        logger.info(
                            `response inner file url: ${response.array[0]}`,
                        );
                        const request2 = new messages.Message();
                        request2.setText(message.text);
                        request2.setChatid(message.chatid);
                        // нужно ставить тип сообщения
                        //request2.setMessagetype('message');
                        request2.setAttachmenturlsList([response.array[0]]);
                        // если это домашка, поставить id домашки
                        //request2.setHomeworkid(-1);
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
