// import client from './grpc/client';
const messages = require('./grpc/proto/model_pb');
// import getStream from './grpc/stream';
// import stream from './grpc/stream';
require('dotenv').config();
import {ProtoMessage} from '../types/interfaces';
import Bots from './bot';
import {logger} from './utils/logger';
import {streamInstance} from './grpc/server';

export default class Net {
    bots;

    constructor(tokens: Array<string>, chatIDs: Array<number>) {
        this.bots = new Bots(tokens, chatIDs, this.sendMessageToClient);
        this.bots.launchBots();
    }

    sendMessageFromClient(message: ProtoMessage) {
        const sendMessageTo = this.bots.context.get(message.chatID);
        if (sendMessageTo) {
            this.bots.sendMessage(sendMessageTo, message.text);
        } else {
            logger.error(`sendMessageFromClient error, no such chat id = ${message.chatID}`);
        }
    }

    sendMessageToClient(message: ProtoMessage) {
        if (message.chatID !== undefined) {
            logger.info(`sendMessageToClient: chatID: ${message.chatID}, text = ${message.text}`);
            const request = new messages.Message();
            request.setText(message.text);
            request.setChatid(message.chatID);
            streamInstance.self.write(request);
        } else {
            logger.error(`sendMessageToClient error, no such chat id = ${message.chatID}`);
        }
    }
}
