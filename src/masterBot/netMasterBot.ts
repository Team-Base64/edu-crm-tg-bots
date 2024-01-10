import client from '../grpc/client';
import MasterBot, {
    isValidFunReturnType,
    registerWebReturnType,
} from './masterBot';

import messages from '../grpc/proto/model_pb';
import { logger } from '../utils/logger';
import mime from 'mime';

export class NetMasterBot {
    masterBot: MasterBot;

    constructor(masterBotToken: string) {
        this.masterBot = new MasterBot(
            masterBotToken,
            this.verifyToken,
            // this.createChat,
            this.register,
            this.uploadAvatar,
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
            client.validateToken(request, (err, response) => {
                if (err) {
                    logger.error('Error:  ', err);
                    return reject({ isvalid: false, classid: -1 });
                }
                logger.info('verifyToken resp ' + response);
                return resolve({
                    isvalid: true,
                    classid: response.getClassid(),
                });
            }),
        );
    }

    /**
     *
     * @returns chatid
     * */
    // createChat(studentid: number, classid: number) {
    //     const request = new messages.CreateChatRequest();
    //     request.setStudentid(studentid);
    //     request.setClassid(classid);
    //     logger.info('createChat req ' + studentid + ' ' + classid);
    //     return new Promise<createWebChatFunReturnType>((resolve, reject) => {
    //         client.createChat(
    //             request,
    //             (err, response) => {
    //                 if (err) {
    //                     logger.error('Error:  ', err);
    //                     return reject({ chatid: -1 });
    //                 }
    //                 logger.info('createChat resp ' + response.getInternalchatid());
    //                 const chatid = response.getInternalchatid();
    //                 return resolve({ chatid });
    //             },
    //         );
    //     });
    // }

    uploadAvatar(rawLink: string) {
        return new Promise<
            { internalURL: string; mimetype: string } | undefined
        >((resolve, reject) => {
            const mimetype = mime.getType(rawLink);
            if (!mimetype) {
                logger.error('Upload Avatar Error:  no mimetyme');
                return reject(undefined);
            }

            const request = new messages.FileUploadRequest();
            request.setFileurl(rawLink.replace('https', 'http'));
            request.setMimetype(mimetype);

            client.uploadFile(request, (err, response) => {
                if (err) {
                    logger.error('Upload Avatar Error:  ', err);
                    return reject(undefined);
                }

                logger.info(
                    'upload avatar resp ' + response.getInternalfileurl(),
                );
                return resolve({
                    internalURL: response.getInternalfileurl(),
                    mimetype: mimetype,
                });
            });
        });
    }

    /**
     *
     * @returns studentid
     * */
    register(name: string, classid: number, avatar: string) {
        const tg = 'tg';
        const request = new messages.CreateStudentRequest();
        request.setName(name);
        request.setType(tg);
        request.setAvatarurl(avatar);
        request.setClassid(classid);
        logger.info('register req ' + name + ' ' + avatar + ' ' + classid);
        return new Promise<registerWebReturnType>((resolve, reject) => {
            client.createStudent(request, (err, response) => {
                if (err) {
                    logger.error('Error:  ', err);
                    return reject({ studentid: -1 });
                }
                // logger.info('register resp ' + studentid);
                // return resolve({ studentid });

                logger.info('register resp ' + response.getStudentid());
                const studentid = response.getStudentid();
                return resolve({ studentid });
            });
        });
    }
}
