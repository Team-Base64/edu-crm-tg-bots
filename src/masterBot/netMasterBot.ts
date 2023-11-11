import MasterBot, {
    createWebChatFunReturnType,
    isValidFunReturnType,
    registerWebReturnType,
} from './masterBot';
import client from '../grpc/client';

const messages = require('../grpc/proto/model_pb');
import { logger } from '../utils/logger';

export class NetMasterBot {
    masterBot: MasterBot;

    constructor(masterBotToken: string) {
        this.masterBot = new MasterBot(
            masterBotToken,
            this.verifyToken,
            this.createChat,
            this.register,
        );
        this.masterBot.launchBot();
    }

    /**
     *
     * @returns isvalid, classid
     * */
    async verifyToken(token: string) {
        const request = new messages.ValidateTokenRequest();
        request.setToken(token);
        logger.info('verifyToken req ' + token);
        return new Promise<isValidFunReturnType>((resolve, reject) =>
            client.validateToken(
                request,
                (err: string, response: { array: Array<string> }) => {
                    if (err) {
                        logger.error('Error:  ', err);
                        return reject({ isvalid: false, classid: -1 });
                    }
                    logger.info('verifyToken resp ' + response);
                    return resolve({
                        isvalid: true,
                        classid: Number(response.array[0]),
                    });
                },
            ),
        );
    }

    /**
     *
     * @returns chatid
     * */
    createChat(studentid: number, classid: number) {
        const request = new messages.CreateChatRequest();
        request.setStudentid(studentid);
        request.setClassid(classid);
        logger.info('createChat req ' + studentid + ' ' + classid);
        return new Promise<createWebChatFunReturnType>((resolve, reject) => {
            client.createChat(
                request,
                (err: string, response: { array: Array<number> }) => {
                    if (err) {
                        logger.error('Error:  ', err);
                        return reject({ chatid: -1 });
                    }
                    logger.info('createChat resp ' + response.array[0]);
                    const chatid = Number(response.array[0]);
                    return resolve({ chatid });
                },
            );
        });
    }

    /**
     *
     * @returns studentid
     * */
    register(name: string, avatar: string) {
        const tg = 'tg';
        const request = new messages.CreateStudentRequest();
        request.setName(name);
        request.setType(tg);
        request.setAvatarurl(avatar);
        logger.info('register req ' + name + ' ' + avatar);
        return new Promise<registerWebReturnType>((resolve, reject) => {
            client.createStudent(
                request,
                (err: string, response: { array: Array<number> }) => {
                    if (err) {
                        logger.error('Error:  ', err);
                        return reject({ studentid: -1 });
                    }
                    // logger.info('register resp ' + studentid);
                    // return resolve({ studentid });

                    logger.info('register resp ' + response.array[0]);
                    const studentid = Number(response.array[0]);
                    return resolve({ studentid });
                },
            );
        });
    }
}
