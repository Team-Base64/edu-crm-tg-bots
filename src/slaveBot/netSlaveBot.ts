import {
    Homework,
    ProtoMessageBase,
    ProtoMessageRecieve,
    ProtoMessageSend,
    ProtoSolution,
    SendMessageTo,
    Task,
} from '../../types/interfaces';
import client from '../grpc/client';
import { logger } from '../utils/logger';

import { CreateChatRequest, FileUploadRequest, GetHomeworksRequest, Message, SendSolutionRequest, SolutionData } from '../grpc/proto/model_pb';
import { streamInstance } from '../index';
import SlaveBots, { ISlaveBotController } from './slaveBot';

export default class NetSlaveBot implements ISlaveBotController {
    bots;

    constructor() {
        this.bots = new SlaveBots(this);
    }

    sendMessageFromClient(
        message: ProtoMessageRecieve,
        sendMessageTo: SendMessageTo,
    ) {
        if (message.attachList.length > 0) {
            this.bots.sendAttaches(sendMessageTo, {
                text: message.text,
                atachList: message.attachList
            });
        } else if (message.text !== '') {
            this.bots.sendMessage(sendMessageTo, message.text);
        } else {
            logger.error('sendMessageFromClient: empty message');
        }
    }

    sendMessageToClient(message: ProtoMessageBase) {
        logger.info(
            `sendMessageToClient: chatID: ${message.chatid}, text = ${message.text}`,
        );
        const request = new Message();
        request.setText(message.text);
        request.setChatid(message.chatid);
        streamInstance.self.write(request);
        return true;
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
                        .map<Homework>((hw) => {
                            const tasks = hw.getTasksList().map<Task>(
                                task => {
                                    return {
                                        description: task.getDescription(),
                                        attachmenturlsList: task.getAttachmenturlsList()
                                    };
                                }
                            );
                            return {
                                homeworkid: hw.getHomeworkid(),
                                title: hw.getTitle(),
                                description: hw.getDescription(),
                                tasks
                            };
                        });
                    logger.info('getHomeworksInClass hws: ' + hws.length);
                    return resolve(hws);
                });
            });
    }

    sendMessageWithAttachToClient(message: ProtoMessageSend) {
        logger.info(`sendMessageToClient: chatID: ${message.chatid}, text = ${message.text},
             mimeType: ${message.file.mimeType}, fileLink: ${message.file.fileLink}`);

        const request = new FileUploadRequest();
        request.setMimetype(message.file.mimeType);
        request.setFileurl(message.file.fileLink);

        return new Promise<void>(
            (resolve, reject) => {
                client.uploadFile(
                    request,
                    (error, response) => {
                        if (error) {
                            logger.error("sendMessageWithAttachToClient: " + error);
                            reject();
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
                            console.log(streamInstance.self.write);
                            resolve();
                        }
                    },
                );
            }
        );
    }

    sendSolutionToClient(message: ProtoSolution) {
        logger.info(`sendSolutionToClient: homeworkID = ${message.homeworkID}, studentID = ${message.studentID}`);

        const promiseAttachList = message.data.attachList.map(
            attach => {
                const request = new FileUploadRequest();
                request.setMimetype(attach.mimeType);
                request.setFileurl(attach.fileLink);
                return new Promise<string>(
                    (resolve, reject) => {
                        client.uploadFile(
                            request,
                            (error, response) => {
                                if (error) {
                                    logger.error('sendSolutionToClient, uploadFile: ' + error);
                                    reject();
                                }
                                logger.info(
                                    `response inner file url: ${response.getInternalfileurl()}`,
                                );
                                return resolve(response.getInternalfileurl());
                            }
                        );
                    }
                );
            }
        );

        return Promise.all(promiseAttachList)
            .then(
                attachList => {
                    const request = new SendSolutionRequest();
                    request.setHomeworkid(message.homeworkID);
                    request.setStudentid(message.studentID);
                    const solData = new SolutionData();
                    solData.setText(message.data.text);
                    solData.setAttachmenturlsList(attachList);
                    request.setSolution(solData);
                    return new Promise<void>(
                        (resolve, reject) => {
                            client.sendSolution(
                                request,
                                (error) => {
                                    if (error) {
                                        logger.error('sendSolutionToClient, sendSolution: ' + error);
                                        reject();
                                    } else {
                                        resolve();
                                    }
                                }
                            );
                        }
                    );
                }
            );
    }

    createChat(studentid: number, classid: number) {
        const request = new CreateChatRequest();
        request.setStudentid(studentid);
        request.setClassid(classid);
        logger.info('createChat req ' + studentid + ' ' + classid);
        return new Promise<number>((resolve, reject) => {
            client.createChat(
                request,
                (err, response) => {
                    if (err) {
                        logger.error('Error:  ', err);
                        return reject(-1);
                    }
                    logger.info('createChat resp ' + response.getInternalchatid());
                    const chatid = response.getInternalchatid();
                    return resolve(chatid);
                },
            );
        });
    }
};
