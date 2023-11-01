// import client from './grpc/client';
const messages = require('./grpc/proto/model_pb');
//import getStream from './grpc/stream';
import stream from './grpc/stream';
require('dotenv').config();
import {ProtoMessage} from '../types/interfaces';
import Bots from './bot';
import {logger} from './utils/logger';

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
        // if (message.chatID !== undefined) {
        //     logger.debug(`sendMessageToClient: chatID: ${message.chatID}, text = ${message.text}`);
        //     client.recieve(message, function(creationFailed: string, productCreated: unknown) {
        //         console.log('On Success:', productCreated);
        //         console.log('On Failure:', creationFailed);
        //     });
        // } else {
        //     logger.error(`sendMessageToClient error, no such chat id = ${message.chatID}`);
        // }
        if (message.chatID !== undefined) {
            logger.debug(`sendMessageToClient: chatID: ${message.chatID}, text = ${message.text}`);
            console.log(`sendMessageToClient: chatID: ${message.chatID}, text = ${message.text}`);
            const request = new messages.Message();
            request.setText(message.text);
            request.setChatid(message.chatID);
            stream.write(request);
            // stream.send(message, function(creationFailed: string, productCreated: unknown) {
            //     console.log('On Success:', productCreated);
            //     console.log('On Failure:', creationFailed);
            // });
            // stream.write(message)
        } else {
            logger.error(`sendMessageToClient error, no such chat id = ${message.chatID}`);
        }
    }
}
