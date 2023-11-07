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
            request.setChatid(message.chatid);
            request.setText(message.text);
            request.setMimetype(message.mimetype);
            request.setFilelink(message.fileLink);
            client.uploadAttachesTG(request, (error: string) => {
                if (error) {
                    logger.error(error);
                }
            });
        } else {
            logger.error(
                `sendMessageWithAttachToClient error, no such chat id = ${message.chatid}`,
            );
        }
    }
}
