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

        return new Promise<isValidFunReturnType>((resolve, reject) =>
            client.validateToken(request, (err: string, response: number) => {
                if (err) {
                    logger.error('Error:  ', err);
                    return reject({ isvalid: false, classid: -1 });
                }
                logger.info('verifyToken resp ' + response);
                return resolve({ isvalid: true, classid: response });
            }),
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
        return new Promise<createWebChatFunReturnType>((resolve, reject) => {
            client.createChat(request, (err: string, chatid: number) => {
                if (err) {
                    logger.error('Error:  ', err);
                    return reject({ chatid: -1 });
                }
                logger.info('createChat resp ' + chatid);
                return resolve({ chatid });
            });
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
        return new Promise<registerWebReturnType>((resolve, reject) => {
            client.createStudent(request, (err: string, studentid: number) => {
                if (err) {
                    logger.error('Error:  ', err);
                    return reject({ studentid: -1 });
                }
                logger.info('register resp ' + studentid);
                return resolve({ studentid });
            });
        });
    }
}
