import MasterBot from './masterBot';
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
    verifyToken(token: string) {
        // const func1 = (err: string, response: number) => {
        //     if (err) {
        //         logger.error('Error:  ', err);
        //         return { isvalid: false, classid: -1 };
        //     }
        //     logger.info('verifyToken resp ' + response);
        //     return { isvalid: true, classid: response };
        // };
        // const newfunc = func1.bind(this);
        // // if (token === '12345679') return { isvalid: true, classid: 2 };
        // // if (token === '12345678') return { isvalid: true, classid: 3 };
        // // if (token === '12345670') return { isvalid: true, classid: 4 };
        // logger.info('verifyToken ' + token);
        // const request = new messages.ValidateTokenRequest();
        // request.setToken(token);
        // const result = client.validateToken(request);
        // logger.info('verifyToken result ' + result);
        // return result;

        // if (token === '12345679') return { isvalid: true, classid: 2 };
        // if (token === '12345678') return { isvalid: true, classid: 3 };
        // if (token === '12345670') return { isvalid: true, classid: 4 };
        logger.info('verifyToken ' + token);
        const request = new messages.ValidateTokenRequest();
        request.setToken(token);
        const result = client
            .validateToken(request, (err: string, response: number) => {
                if (err) {
                    logger.error('Error:  ', err);
                    return { isvalid: false, classid: -1 };
                }
                logger.info('verifyToken resp ' + response);
                return { isvalid: true, classid: response };
            })
            .then((response: { isvalid: number; classid: number }) => response)
            .catch((error: string) => logger.error(error));
        logger.info('verifyToken result ' + JSON.stringify(result));
        return result;
    }

    /**
     *
     * @returns chatid
     * */
    createChat(studentid: number, classid: number) {
        // if (classid === 2) return 2;
        // if (classid === 3) return 3;
        // if (classid === 4) return 4;
        logger.info('createChat ' + studentid + ' ' + classid);
        const request = new messages.CreateChatRequest();
        request.setStudentid(studentid);
        request.setClassid(classid);
        const result = client.createChat(
            request,
            (err: string, response: number) => {
                if (err) {
                    logger.error('Error:  ', err);
                    return -1;
                }
                logger.info('createChat resp ' + response);
                return response;
            },
        );
        return result;
    }

    /**
     *
     * @returns studentid
     * */
    register(name: string, avatar: string) {
        //return 1;
        logger.info('register ' + name + ' ' + avatar);
        const tg = 'tg';
        const request = new messages.CreateStudentRequest();
        request.setName(name);
        request.setType(tg);
        request.setAvatarurl(avatar);
        const result = client.createStudent(
            request,
            (err: string, response: number) => {
                if (err) {
                    logger.error('Error:  ', err);
                    return -1;
                }
                logger.info('register resp ' + response);
                return response;
            },
        );
        return result;
    }
}
