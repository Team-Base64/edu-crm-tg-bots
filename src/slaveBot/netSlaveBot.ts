import {
    Homework,
    ProtoAttachMessage,
    ProtoMessage,
    ProtoSolution,
    SendMessageTo
} from '../../types/interfaces';
import client from '../grpc/client';
import { logger } from '../utils/logger';

import { FileUploadRequest, GetHomeworksRequest, Message, SendSolutionRequest, SolutionData } from '../grpc/proto/model_pb';
import { streamInstance } from '../index';
import SlaveBots, { ISlaveBotController } from './slaveBot';

export default class NetSlaveBot implements ISlaveBotController {
    bots;

    constructor() {
        this.bots = new SlaveBots(this);
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
            const request = new Message();
            request.setText(message.text);
            request.setChatid(message.chatid);
            streamInstance.self.write(request);
        } else {
            logger.error(
                `sendMessageToClient error, no such chat id = ${message.chatid}`,
            );
        }
    }

    async getHomeworksInClass(classid: number) {
        logger.info(`getHomeworksInClass: classid: ${classid}`);
        const request = new GetHomeworksRequest()
            .setClassid(classid);
        return new Promise<Homework[]>(
            (resolve, reject) => {
                client.getHomeworks(request, (err, response) => {
                    if (err) {
                        logger.error('getHomeworksInClass: ', err);
                        return reject([]);
                    }
                    const hws = response
                        .getHomeworksList()
                        .map((hw) => {
                            return {
                                homeworkid: hw.getHomeworkid(),
                                title: hw.getTitle(),
                                description: hw.getDescription(),
                                attachmenturlsList: hw.getAttachmenturlsList(),
                            };
                        });
                    logger.info('getHomeworksInClass hws: ' + hws.length);
                    return resolve(hws);
                });
            });
    }

    sendMessageWithAttachToClient(message: ProtoAttachMessage) {
        if (message.chatid !== undefined) {
            logger.info(`sendMessageToClient: chatID: ${message.chatid}, text = ${message.text},
             mimeType: ${message.mimetype}, fileLink: ${message.fileLink}`);

            const request = new FileUploadRequest();
            request.setMimetype(message.mimetype);
            request.setFileurl(message.fileLink);
            client.uploadFile(
                request,
                (error, response) => {
                    if (error) {
                        logger.error(error);
                    } else {
                        logger.info(
                            `response inner file url: ${response.getInternalfileurl()}`,
                        );
                        const request2 = new Message();
                        request2.setText(message.text);
                        request2.setChatid(message.chatid);
                        // нужно ставить тип сообщения
                        //request2.setMessagetype('message');
                        request2.setAttachmenturlsList([response.getInternalfileurl()]);
                        // если это домашка, поставить id домашки
                        // request2.setHomeworkid(-1);
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

    sendSolutionToClient(message: ProtoSolution) {
        logger.info(`sendSolutionToClient: homeworkID: ${message.homeworkID}, studentID = ${message.studentID}`);

        const request = new FileUploadRequest();
        // TODO
        request.setMimetype(message.data.attachList[0].mimetype);
        request.setFileurl(message.data.attachList[0].fileLink);
        client.uploadFile(
            request,
            (error, response) => {
                if (error) {
                    logger.error(error);
                } else {
                    logger.info(
                        `response inner file url: ${response.getInternalfileurl()}`,
                    );
                    const request2 = new SendSolutionRequest();
                    request2.setHomeworkid(message.homeworkID);
                    request2.setStudentid(message.studentID);
                    const solData = new SolutionData();
                    solData.setText(message.data.text);
                    solData.setAttachmenturlsList([response.getInternalfileurl()]);
                    request2.setSolution(solData);
                    client.sendSolution(
                        request2,
                        (error) => {
                            if (error) {
                                logger.error(error);
                            } else {
                                logger.info('succes add solution');
                            }
                        }
                    );
                }
            },
        );
    }
};
