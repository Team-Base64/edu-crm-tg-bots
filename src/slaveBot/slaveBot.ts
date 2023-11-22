import {
    ProtoAttachMessage,
    ProtoMessage,
    updateContext,
} from '../../types/interfaces';
import { Context } from 'telegraf';

import { logger } from '../utils/logger';
import { changeHttpsToHttps } from '../utils/url';
import { dbInstance } from '../index';

const { Telegraf } = require('telegraf');
const mime = require('mime');

export type SendMessageTo = { botToken: string; telegramChatID: number };

export type HomeworkData = {
    homeworkid: number;
    title: string;
    description: string;
    attachmenturlsList: Array<string>;
};

type getHWsFunType = (classid: number) => Promise<{ hws: Array<HomeworkData> }>;

export type getHWsReturnType = Awaited<ReturnType<getHWsFunType>>;

export default class SlaveBots {
    bots;
    sendMessageToClient;
    sendMessageWithAttachToClient;
    HWCommand;

    constructor(
        sendMessageToClient: (
            message: ProtoMessage,
            sendMessageTo: SendMessageTo,
        ) => void,
        sendMessageWithAttachToClient: (message: ProtoAttachMessage) => void,
        HWCommand: getHWsFunType,
    ) {
        this.bots = new Map<string, typeof Telegraf>();
        this.sendMessageToClient = sendMessageToClient;
        this.sendMessageWithAttachToClient = sendMessageWithAttachToClient;
        this.HWCommand = HWCommand;

        this.createBots()
            .then(() => {
                this.initBots();
                this.#launchBots();

                logger.info(`starting slave bots with ${logger.level} level. 
        Bots count: ${this.bots.size}`);
            })
            .catch((error) => {
                logger.fatal('createBots: ' + error);
            });
    }

    async createBots() {
        ((await dbInstance.getSlaveBots()) ?? []).forEach(({ token }) => {
            this.bots.set(token, new Telegraf(token));
        });
        if (!this.bots.size) {
            throw Error('no bots in db');
        }
    }

    initBots() {
        Array.from(this.bots.values()).forEach((bot) => {
            bot.start(this.#onStartCommand);

            bot.help(this.#onHelpCommand);

            bot.telegram.setMyCommands([
                //{ command: 'help', description: 'Developing...' },
                { command: 'hw', description: 'Send your solution' },
            ]);
            bot.command('hw', this.#onHWCommand.bind(this));
            //bot.command('echo', (ctx: Context) => ctx.reply('Hello'));

            //bot.on(['text'], this.#onTextMessage.bind(this));
            bot.on(['photo'], this.#onPhotoAttachmentSend.bind(this));
            bot.on(['document'], this.#onFileAttachmentSend.bind(this));
        });
    }

    #launchBots() {
        Array.from(this.bots.values()).forEach((bot) => {
            bot.launch().catch((error: string) => {
                logger.error('bot.launch() error: ' + error);
                this.#launchBots();
            });

            process.once('SIGINT', () => bot.stop('SIGINT'));
            process.once('SIGTERM', () => bot.stop('SIGTERM'));
        });
    }

    sendMessage({ botToken, telegramChatID }: SendMessageTo, text: string) {
        this.bots.get(botToken).telegram.sendMessage(telegramChatID, text);
        logger.debug('sendMessage: ' + text);
    }

    sendDocument({ botToken, telegramChatID }: SendMessageTo, text: string) {
        this.bots
            .get(botToken)
            .telegram.sendDocument(telegramChatID, text)
            .catch((error: string) => {
                logger.error('sendDocument: ' + error);
                this.bots
                    .get(botToken)
                    .telegram.sendMessage(
                        telegramChatID,
                        'Ошибка при отправке файла',
                    );
            });
        logger.debug('sendDocument: ' + text);
    }

    sendPhoto({ botToken, telegramChatID }: SendMessageTo, text: string) {
        this.bots
            .get(botToken)
            .telegram.sendDocument(telegramChatID, text)
            .catch((error: string) => {
                logger.error('sendPhoto: ' + error);
                this.bots
                    .get(botToken)
                    .telegram.sendMessage(
                        telegramChatID,
                        'Ошибка при отправке фото',
                    );
            });

        logger.debug('sendPhoto: ' + text);
    }

    #getBot({ telegram }: updateContext) {
        return this.bots.get(telegram.token);
    }

    #onStartCommand(ctx: Context) {
        ctx.reply(
            'Все готово! Можете начинать общаться с преподавателем.',
        ).catch((error) => logger.error('bot.start() error: ' + error));
    }

    #onHelpCommand(ctx: updateContext) {
        ctx.reply('still in dev...').catch((reason: string) =>
            logger.error('bot.help error: ' + reason),
        );
    }

    // async #onTextMessage(ctx: updateContext) {
    //     if (ctx.message) {
    //         const chatid = await dbInstance.getSlaveBotChatIdByUserIdAndToken(
    //             ctx.message.chat.id,
    //             ctx.telegram.token,
    //         );

    //         if (chatid) {
    //             const sendMessageTo =
    //                 await dbInstance.getSlaveBotTokenAndUserIdByChatId(chatid);
    //             if (sendMessageTo) {
    //                 this.sendMessageToClient(
    //                     {
    //                         chatid,
    //                         text: ctx.message.text,
    //                     },
    //                     sendMessageTo,
    //                 );
    //                 logger.debug(
    //                     'slave, #onTextMessage, text: ' + ctx.message.text,
    //                 );
    //             } else {
    //                 ctx.reply('Возникла ошибка, попробуйте позже').catch(
    //                     (error) =>
    //                         logger.error(
    //                             '#onTextMessage, no sendMessageTo: ' + error,
    //                         ),
    //                 );
    //             }
    //         } else {
    //             ctx.reply('Возникла ошибка, попробуйте позже').catch((error) =>
    //                 logger.error('#onTextMessage, no chatid: ' + error),
    //             );
    //         }
    //     } else {
    //         logger.warn("bot.on(['text']: no message");
    //     }
    // }

    async #onPhotoAttachmentSend(ctx: updateContext) {
        if (ctx.message && ctx.message.photo) {
            const fileLink = await this.#getBot(ctx)
                .telegram.getFileLink(ctx.message.photo.at(-1)?.file_id)
                .catch((err: string) =>
                    logger.error('#onPhotoAttachmentSend, getFileLink: ' + err),
                );
            console.log(ctx.telegram.token);
            console.log(ctx);

            const chatid = await dbInstance.getSlaveBotChatIdByUserIdAndToken(
                ctx.message.chat.id,
                ctx.telegram.token,
            );

            if (chatid) {
                this.sendMessageWithAttachToClient({
                    chatid,
                    text: ctx.message.text ?? '',
                    mimetype: mime.getType(fileLink),
                    fileLink: changeHttpsToHttps(fileLink),
                });
            } else {
                ctx.reply('Возникла ошибка, попробуйте позже').catch((error) =>
                    logger.error('#onPhotoAttachmentSend, no chatid: ' + error),
                );
            }
        } else {
            logger.warn("bot.on(['text']: no message");
        }
    }

    async #onFileAttachmentSend(ctx: updateContext) {
        if (ctx.message && ctx.message.document) {
            logger.trace(
                this.#getBot(ctx).telegram.getFile(
                    ctx.message.document.file_id,
                ),
            );
            const fileLink = await this.#getBot(ctx)
                .telegram.getFileLink(ctx.message.document.file_id)
                .catch((err: unknown) => logger.error(err));

            const chatid = await dbInstance.getSlaveBotChatIdByUserIdAndToken(
                ctx.message.chat.id,
                ctx.telegram.token,
            );

            if (chatid) {
                this.sendMessageWithAttachToClient({
                    chatid: chatid,
                    text: ctx.message.text ?? '',
                    mimetype:
                        ctx.message.document.mime_type ??
                        mime.getType(
                            ctx.message.document.file_name ?? fileLink,
                        ),
                    fileLink: changeHttpsToHttps(fileLink),
                });
            } else {
                ctx.reply('Возникла ошибка, попробуйте позже').catch((error) =>
                    logger.error('#onFileAttachmentSend, no chatid: ' + error),
                );
            }
        } else {
            logger.warn("bot.on(['text']: no message");
        }
    }

    async #onHWCommand(ctx: updateContext) {
        if (ctx.message) {
            const chatid = await dbInstance.getSlaveBotChatIdByUserIdAndToken(
                ctx.message.chat.id,
                ctx.telegram.token,
            );
            if (chatid) {
                const classid =
                    await dbInstance.getSlaveBotClassIdByChatId(chatid);
                if (classid) {
                    const HWCommandResp = await this.HWCommand(classid).catch(
                        (error) => {
                            logger.error('onHWCommand, result: ' + error);
                            return error;
                        },
                    );
                    logger.debug(
                        'slave, #onHWCommand, HWCommandResp: ' + HWCommandResp,
                    );
                    const hwList: Array<HomeworkData> = HWCommandResp?.hws;
                    // logger.debug('slave, #onHWCommand, classid: ' + classid);
                    // logger.debug('slave, #onHWCommand, hwList: ' + hwList);
                    // logger.debug(
                    //     'slave, #onHWCommand, hwListSize: ' + hwList.length,
                    // );
                    // logger.debug(
                    //     'slave, #onHWCommand, hwList[0]: ' +
                    //         hwList[0] +
                    //         hwList[0].homeworkid +
                    //         hwList[0].title +
                    //         hwList[0].description +
                    //         hwList[0].attachmenturlsList,
                    // );
                    let textMes = 'Список домашних заданий: \n';
                    hwList.forEach((elem: HomeworkData, index: number) => {
                        textMes +=
                            index +
                            '. ' +
                            elem.title +
                            '\n' +
                            elem.description +
                            '\n\n';
                    });
                    textMes +=
                        'Введите номер задания, для которого хотите  отправить решение: ';
                    ctx.reply(textMes).catch((error) =>
                        logger.error(
                            '#onHWCommand, err send message: ' + error,
                        ),
                    );
                } else {
                    ctx.reply('Возникла ошибка, попробуйте позже').catch(
                        (error) =>
                            logger.error('#onHWCommand, no classid: ' + error),
                    );
                }
            } else {
                ctx.reply('Возникла ошибка, попробуйте позже').catch((error) =>
                    logger.error('#onHWCommand, no chatid: ' + error),
                );
            }
        } else {
            logger.warn('bot #onHWCommand: no message');
        }
    }
}
