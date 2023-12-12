import {
    Event,
    Homework,
    ProtoAttach,
    ProtoMessageBase,
    ProtoMessageRecieve,
    ProtoMessageSend,
    ProtoSolution,
    SendMessageTo,
    Task
} from '../../types/interfaces';
import client from '../grpc/client';
import { logger } from '../utils/logger';

import {
    CreateChatRequest,
    FileUploadRequest,
    GetEventsRequest,
    GetHomeworksRequest,
    Message,
    SendSolutionRequest,
    SolutionData,
} from '../grpc/proto/model_pb';
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
                atachList: message.attachList,
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
    }

    async getHomeworksInClass(classid: number) {
        logger.info(`getHomeworksInClass: classid: ${classid}`);
        const request = new GetHomeworksRequest().setClassid(classid);
        return new Promise<Homework[]>((resolve, reject) => {
            client.getHomeworks(request, (err, response) => {
                if (err) {
                    logger.error('getHomeworksInClass: ', err);
                    return reject([]);
                }
                const hws = response.getHomeworksList().map<Homework>((hw) => {
                    const tasks = hw.getTasksList().map<Task>((task) => {
                        return {
                            description: task.getDescription(),
                            attachmenturlsList: task.getAttachmenturlsList(),
                        };
                    });
                    return {
                        homeworkid: hw.getHomeworkid(),
                        title: hw.getTitle(),
                        description: hw.getDescription(),
                        createDate: new Date(hw.getCreatedate()),
                        deadlineDate: new Date(hw.getDeadlinedate()),
                        tasks,
                    };
                });
                logger.info('getHomeworksInClass hws: ' + hws.length);
                return resolve(hws);
            });
        });
    }

    uploadAttach(attach: ProtoAttach) {
        const request = new FileUploadRequest();
        request.setMimetype(attach.mimeType);
        request.setFileurl(attach.fileLink);
        return new Promise<string>((resolve, reject) => {
            client.uploadFile(request, (error, response) => {
                if (error) {
                    logger.error(
                        'sendSolutionToClient, uploadFile: ' + error,
                    );
                    reject();
                }
                logger.info(
                    `response inner file url: ${response.getInternalfileurl()}`,
                );
                return resolve(response.getInternalfileurl());
            });
        });
    }

    async sendMessageWithAttachToClient(message: ProtoMessageSend) {
        logger.info(`sendMessageWithAttachToClient: chatID: ${message.chatid}, text = ${message.text},
             files: ${message.attachList.length}`);

        const promiseAttachList = message.attachList.map((attach) => this.uploadAttach(attach));
        const attachList = await Promise.all(promiseAttachList);
        const request = new Message();
        request.setText(message.text);
        request.setChatid(message.chatid);
        request.setAttachmenturlsList(attachList);
        streamInstance.self.write(request);

        // return new Promise<void>((resolve, reject) => {
        //     client.uploadFile(request, (error, response) => {
        //         if (error) {
        //             logger.error('sendMessageWithAttachToClient: ' + error);
        //             reject();
        //         } else {
        //             logger.info(
        //                 `response inner file url: ${response.getInternalfileurl()}`,
        //             );
        //             const request2 = new Message();
        //             request2.setText(message.text);
        //             request2.setChatid(message.chatid);
        //             // нужно ставить тип сообщения
        //             //request2.setMessagetype('message');
        //             request2.setAttachmenturlsList([
        //                 response.getInternalfileurl(),
        //             ]);
        //             // если это домашка, поставить id домашки
        //             // request2.setHomeworkid(-1);
        //             streamInstance.self.write(request2);
        //             console.log(streamInstance.self.write);
        //             resolve();
        //         }
        //     });
        // });
    }

    async sendSolutionToClient(message: ProtoSolution) {
        logger.info(
            `sendSolutionToClient: homeworkID = ${message.homeworkID}, studentID = ${message.studentID}`,
        );

        const promiseAttachList = message.data.attachList.map((attach) => this.uploadAttach(attach));

        const attachList = await Promise.all(promiseAttachList);
        const request_2 = new SendSolutionRequest();
        request_2.setHomeworkid(message.homeworkID);
        request_2.setStudentid(message.studentID);
        const solData = new SolutionData();
        solData.setText(message.data.text);
        solData.setAttachmenturlsList(attachList);
        request_2.setSolution(solData);
        return await new Promise<void>((resolve_1, reject_1) => {
            client.sendSolution(request_2, (error_1) => {
                if (error_1) {
                    logger.error(
                        'sendSolutionToClient, sendSolution: ' + error_1);
                    reject_1();
                } else {
                    resolve_1();
                }
            });
        });
    }

    createChat(studentid: number, classid: number) {
        const request = new CreateChatRequest();
        request.setStudentid(studentid);
        request.setClassid(classid);
        logger.info('createChat req ' + studentid + ' ' + classid);
        return new Promise<number>((resolve, reject) => {
            client.createChat(request, (err, response) => {
                if (err) {
                    logger.error('createChat: ', err);
                    return reject(-1);
                }
                logger.info('createChat resp ' + response.getInternalchatid());
                const chatid = response.getInternalchatid();
                return resolve(chatid);
            });
        });
    }

    getEvents(classID: number): Promise<Event[]> {
        const request = new GetEventsRequest();
        request.setClassid(classID);
        return new Promise<Event[]>((resolve, reject) => {
            client.getEvents(request, (err, response) => {
                if (err) {
                    logger.error('getEvents:  ', err);
                    return reject(err);
                }
                const events = response.getEventsList().map<Event>(
                    eventData => {
                        return {
                            title: eventData.getTitle(),
                            description: eventData.getDescription(),
                            startDate: eventData.getStartdate(),
                            endDate: eventData.getEnddate()
                        };
                    }
                );
                return resolve(events);
            });
        });
    }
}
