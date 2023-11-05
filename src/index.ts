const messages = require('./grpc/proto/model_pb');
require('dotenv').config();
import {ProtoAttachMessage, ProtoMessage} from '../types/interfaces';
import Bots from './bot';
import {logger} from './utils/logger';
import {streamInstance} from './grpc/server';

import client from './grpc/client';
// import fs from 'fs';


// const {Duplex} = require('stream');

export default class Net {
    bots;

    constructor(tokens: Array<string>, chatIDs: Array<number>) {
        this.bots = new Bots(tokens, chatIDs,
            this.sendMessageToClient, this.sendMessageWithAttachToClient);
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

    sendMessageWithAttachToClient(message: ProtoAttachMessage) {
        if (message.chatID !== undefined) {
            logger.info(`sendMessageToClient: chatID: ${message.chatID}, text = ${message.text},
             mimeType: ${message.mimetype}, fileLink: ${message.fileLink}`);
            // const request = new messages.Message();
            // request.setText(message.text);
            // request.setChatid(message.chatID);
            // streamInstance.self.write(request);
        } else {
            logger.error(`sendMessageWithAttachToClient error, no such chat id = ${message.chatID}`);
        }
        const request = new messages.FileUploadRequest();
        request.setChatid(message.chatID);
        request.setText(message.text);
        request.setMimetype(message.mimetype);
        request.setFilelink('https://api.telegram.org/file/bot1290980811'+
        ':AAEgopVWqb7o0I72cwdIGGZRsRyE0GGNkLA/photos/file_2285.jpg');
        client.uploadAttachesTG(request, (error: string) => {
            if (error) {
                console.error(error);
            }
        // console.log('Stream success: ', newsStatus.success);
        // client.close();
        });


        // const uploadStream = client.uploadAttachesTG((error: string) => {
        //     if (error) {
        //         console.error(error);
        //     }
        // // console.log('Stream success: ', newsStatus.success);
        // // client.close();
        // });

        // uploadStream.on('end', () => {
        //     logger.info('End grpc stream');
        // // setTimeout(() => this.connect(), 1000);
        // });
        // uploadStream.on('error', (error: string) => {
        //     logger.error('Error catch, stream:  ', error);
        // });

        // // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // // @ts-ignore
        // // function bufferToStream(myBuffer) {
        // //     const tmp = new Duplex();
        // //     tmp.push(myBuffer);
        // //     tmp.push(null);
        // //     return tmp;
        // // }

        // // const file = bufferToStream(message.file);

        // // const file = fs.createReadStream(myReadableStream);
        // // if (message.file instanceof Blob) console.log('!!!');
        // const fileUrl = new URL(URL.createObjectURL(message.file));
        // console.log(fileUrl);

        // // const fileU = fs.readFileSync(fileUrl);
        // // const file = fs.createReadStream(fileU);
        // const file = message.file.stream();
        // // const file = fs.createReadStream(URL.createObjectURL(message.file));
        // // const file = fs.createReadStream(URL.createObjectURL(new Blob(message.file)));
        // // const file = request(
        // //     'http://api.telegram.org/file/bot1290980811' +
        // //     ':AAEgopVWqb7o0I72cwdIGGZRsRyE0GGNkLA/photos/file_2285.jpg')
        // //     .pipe(fs.createWriteStream('random.jpg'));
        // // const file = fs.createReadStream(
        // //     '/home/art/Рабочий стол/TP/edu-crm-tg-slave-bot/src/Delovaya_kommunikatsia.pdf');

        // // const formattedUrl = new url.URL('http://api.telegram.org/file/bot1290980811' +
        // //      ':AAEgopVWqb7o0I72cwdIGGZRsRyE0GGNkLA/photos/file_2285.jpg');

        // // http.get(formattedUrl, (stream) => {
        // //     stream.pipe(res);
        // // }).on('error', (err) => {
        // //     // send some sort of error response here
        // // });
        // for await (const chunk of file) {
        //     const request = new messages.FileUploadRequest();
        //     request.setChatid(message.chatID);
        //     request.setText(message.text);
        //     request.setMimetype('image/jpeg');
        //     // request.setMimetype('application/pdf');
        //     request.setChunk(chunk);

        //     uploadStream.write(request);
        // }

        // // file.on('data', (chunk) => {
        // //     const request = new messages.FileUploadRequest();
        // //     request.setChatid(message.chatID);
        // //     request.setText(message.text);
        // //     request.setMimetype('image/jpeg');
        // //     // request.setMimetype('application/pdf');
        // //     request.setChunk(chunk);

        // //     uploadStream.write(request);

        // //     // uploadStream.write({
        // //     //     chatID: message.chatID,
        // //     //     text: message.text,
        // //     //     mimetype: message.mimetype,
        // //     //     chunk: chunk,
        // //     // });
        // // });

        // // // Once all chunks have been sent, end the gRPC call
        // // file.on('end', () => {
        // //     uploadStream.end();
        // // });
    }
}
