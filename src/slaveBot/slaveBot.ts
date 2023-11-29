import mime from 'mime';
import { Context, Telegraf, session } from 'telegraf';
import { message } from "telegraf/filters";
import {
    CustomContext,
    Homework,
    ProtoMessageBase,
    ProtoMessageSend,
    ProtoSolution,
    RawFileType,
    SendMessageTo
} from '../../types/interfaces';
import { dbInstance } from '../index';
import { RuntimeError, logger } from '../utils/logger';
import { changeHttpsToHttp } from '../utils/url';
import { HomeworkScene, IHomeworkSceneController, solutionPayloadType } from './scenes';

export interface ISlaveBotController {
    sendMessageToClient: (message: ProtoMessageBase, sendMessageTo: SendMessageTo) => boolean;
    sendMessageWithAttachToClient: (message: ProtoMessageSend) => Promise<void>;
    getHomeworksInClass: (classID: number) => Promise<Homework[]>;
    sendSolutionToClient: (message: ProtoSolution) => Promise<void>;
}

export type SendMessageData = {
    text?: string;
    atachList: string[];
};

type AttachType = {
    fileLink: string;
    mimeType: string;
};

export default class SlaveBots implements IHomeworkSceneController {
    bots = new Map<string, Telegraf<CustomContext>>();
    controller: ISlaveBotController;
    sceneBuilder: HomeworkScene;

    constructor(
        controller: ISlaveBotController,
    ) {
        this.controller = controller;
        this.sceneBuilder = new HomeworkScene(this);

        this.createBots()
            .then(() => {
                this.initBots();
                this.launchBots();

                logger.info(`starting slave bots with ${logger.level} level.
                                Bots count: ${this.bots.size}`);
            })
            .catch((error) => {
                logger.fatal('createBots: ' + error);
            });
    }

    async createBots() {
        ((await dbInstance.getSlaveBots()) ?? []).forEach(({ token }) => {
            this.bots.set(token, new Telegraf<CustomContext>(token));
        });
        if (!this.bots.size) {
            throw Error('no bots in db');
        }
    }

    private initBots() {
        Array.from(this.bots.values()).forEach((bot) => {
            this.addAuthMiddleware(bot);

            bot.use(session());
            bot.use(this.sceneBuilder.initStage().middleware());

            bot.start(this.onStartCommand);
            bot.help(this.onHelpCommand);

            bot.telegram.setMyCommands([
                {
                    command: 'help',
                    description: 'Подсказки по пользованию нашим сервисом'
                },
                {
                    command: this.sceneBuilder.scenes.homeworks.name,
                    description: this.sceneBuilder.scenes.homeworks.description
                },
            ]);
            this.addHomeworkCommandHandler(bot);

            this.addTextMessageHandler(bot);
            this.addPhotoMessageHandler(bot);
            this.addDocumentMessageHandler(bot);

            bot.action(/.+/, ctx => {
                return ctx.answerCbQuery('Оу, не сейчас!');
            });
        });

    }

    private getBot(token: string) {
        const bot = this.bots.get(token);
        if (bot === undefined) {
            RuntimeError(`Not found bot with token: ${token}`);
        } else {
            return bot;
        }

    }

    private launchBots() {
        Array.from(this.bots.values()).forEach((bot) => {
            bot.launch().catch((error: string) => {
                logger.error('launchBots: ' + error);
                this.launchBots();
            });

            process.once('SIGINT', () => bot.stop('SIGINT'));
            process.once('SIGTERM', () => bot.stop('SIGTERM'));
        });
    }

    sendMessage({ botToken, telegramChatID }: SendMessageTo, text: string) {
        this.getBot(botToken).telegram.sendMessage(telegramChatID, text);
        logger.debug('sendMessage: ' + text);
    }

    sendDocument({ botToken, telegramChatID }: SendMessageTo, text: string) {
        this.getBot(botToken)
            .telegram.sendDocument(telegramChatID, text)
            .catch((error: string) => {
                logger.error('sendDocument: ' + error);
                this.getBot(botToken)
                    .telegram.sendMessage(
                        telegramChatID,
                        'Ошибка при отправке файла',
                    );
            });
        logger.debug('sendDocument: ' + text);
    }

    sendPhoto({ botToken, telegramChatID }: SendMessageTo, text: string) {
        this.getBot(botToken)
            .telegram.sendDocument(telegramChatID, text)
            .catch((error: string) => {
                logger.error('sendPhoto: ' + error);
                this.getBot(botToken)
                    .telegram.sendMessage(
                        telegramChatID,
                        'Ошибка при отправке фото',
                    );
            });

        logger.debug('sendPhoto: ' + text);
    }

    sendAttaches({ botToken, telegramChatID }: SendMessageTo, data: SendMessageData) {
        logger.debug(`sendMedia: text - ${data.text}, attaches - ${data.atachList.length}`);
        this.getBot(botToken).telegram.sendMediaGroup(
            telegramChatID,
            data.atachList.map(
                (attach, idx) => {
                    return {
                        media: attach,
                        type: 'document',
                        caption: idx === data.atachList.length - 1 ? data.text : undefined,
                    };;
                }
            )
        ).catch((error: string) => {
            logger.error('sendMedia: ' + error);
            this.getBot(botToken)
                .telegram.sendMessage(
                    telegramChatID,
                    'Ошибка при отправке сообщения',
                );
        });
    }

    private async onStartCommand(ctx: CustomContext) {
        await ctx.reply(
            'Все готово! Можете начинать общаться с преподавателем.',
        ).catch((error) => logger.error('onStartCommand: ' + error));
    }

    private async onHelpCommand(ctx: CustomContext) {
        await ctx.replyWithMarkdownV2(
            'Добро пожаловать в TG бота сервиса EDUCRM\\!\n' +
            'Важные замечания:\n' +
            '\\- В нашем сервисе можно пожаловать только *картинки* и *pdf*'
        );
    }

    private addAuthMiddleware(bot: Telegraf<CustomContext>) {
        bot.use(async (ctx, next) => {
            ctx.educrm ??= {
                chatID: -1,
                studentID: -1
            };
            if (ctx.chat) {
                const chatID = await dbInstance.getSlaveBotChatIdByUserIdAndToken(
                    ctx.chat.id,
                    ctx.telegram.token,
                );
                if (typeof chatID == 'number') {
                    ctx.educrm.chatID = chatID;
                } else {
                    logger.error('AuthMiddleware, no chatID');
                    return this.replyErrorMsg(ctx);
                }

                const studentID = await dbInstance.getStudentIdByChatId(chatID);
                if (typeof studentID == 'number') {
                    ctx.educrm.studentID = studentID;
                } else {
                    logger.error('AuthMiddleware, no studentID');
                    return this.replyErrorMsg(ctx);
                }
            }
            return next();
        });
    }

    private addTextMessageHandler(bot: Telegraf<CustomContext>) {
        bot.on(
            message("text"),
            async ctx => {
                if (ctx.message) {
                    const chatid = await dbInstance.getSlaveBotChatIdByUserIdAndToken(
                        ctx.message.chat.id,
                        ctx.telegram.token,
                    );

                    if (chatid) {
                        const sendMessageTo =
                            await dbInstance.getSlaveBotTokenAndUserIdByChatId(chatid);
                        if (sendMessageTo) {
                            this.controller.sendMessageToClient(
                                {
                                    chatid,
                                    text: ctx.message.text,
                                },
                                sendMessageTo,
                            );
                            logger.debug(
                                'slave, #onTextMessage, text: ' + ctx.message.text,
                            );
                        } else {
                            ctx.reply('Возникла ошибка, попробуйте позже').catch(
                                (error) =>
                                    logger.error(
                                        '#onTextMessage, no sendMessageTo: ' + error,
                                    ),
                            );
                        }
                    } else {
                        ctx.reply('Возникла ошибка, попробуйте позже').catch((error) =>
                            logger.error('#onTextMessage, no chatid: ' + error),
                        );
                    }
                } else {
                    logger.warn("bot.on(['text']: no message");
                }
            }
        );
    }

    private addPhotoMessageHandler(bot: Telegraf<CustomContext>) {
        bot.on(
            message("photo"),
            async ctx => {
                if (ctx.message && ctx.message.photo) {
                    const fileID = ctx.message.photo.pop()?.file_id;
                    if (fileID === undefined) {
                        logger.error('addPhotoMessageHandler: fileID === undefined');
                        return this.replyErrorMsg(ctx);
                    }
                    const file = await this.prepareFileUpload(ctx.telegram.token, { fileID });
                    if (file === undefined) {
                        logger.error('addPhotoMessageHandler: file === undefined');
                        return this.replyErrorMsg(ctx);
                    }

                    await this.controller.sendMessageWithAttachToClient({
                        chatid: ctx.educrm.chatID,
                        text: ctx.message.caption ?? '',
                        file: {
                            mimeType: file.mimeType,
                            fileLink: changeHttpsToHttp(file.fileLink),
                        }
                    }).catch(
                        () => {
                            logger.error("addPhotoMessageHandler: sendMessageWithAttachToClient error");
                            return this.replyErrorMsg(ctx);
                        }
                    );
                } else {
                    logger.error("addPhotoMessageHandler: no message or photo");
                    return this.replyErrorMsg(ctx);
                }
            }
        );
    }

    private addDocumentMessageHandler(bot: Telegraf<CustomContext>) {
        bot.on(
            message("document"),
            async ctx => {
                if (ctx.message && ctx.message.document) {
                    const file = await this.prepareFileUpload(ctx.telegram.token, {
                        fileID: ctx.message.document.file_id,
                        fileName: ctx.message.document.file_name,
                        mimeType: ctx.message.document.mime_type
                    });
                    if (file === undefined) {
                        logger.error('addDocumentMessageHandler: file === undefined');
                        return this.replyErrorMsg(ctx);
                    }

                    await this.controller.sendMessageWithAttachToClient({
                        chatid: ctx.educrm.chatID,
                        text: ctx.message.caption ?? '',
                        file: {
                            mimeType: file.mimeType,
                            fileLink: changeHttpsToHttp(file.fileLink),
                        }
                    }).catch(
                        () => {
                            logger.error("addDocumentMessageHandler: sendMessageWithAttachToClient error");
                            return this.replyErrorMsg(ctx);
                        }
                    );

                } else {
                    logger.warn("addDocumentMessageHandler: no message");
                }
            }
        );
    }

    private addHomeworkCommandHandler(bot: Telegraf<CustomContext>) {
        bot.command(
            this.sceneBuilder.scenes.homeworks.name,
            async ctx => {
                ctx.scene.enter(this.sceneBuilder.scenes.homeworks.name);
            }
        );
    }

    async getHomeworks(ctx: CustomContext): Promise<Homework[]> {
        if (ctx.message === undefined) {
            logger.error('getHomeworksInClass: нет message');
            await this.replyErrorMsg(ctx);
            return [];
        }

        const classid = await dbInstance.getSlaveBotClassIdByChatId(ctx.educrm.chatID);
        if (typeof classid !== 'number') {
            logger.error('addHomeworkCommandHandler: classid - ' + classid);
            await this.replyErrorMsg(ctx);
            return [];
        }
        return await this.controller.getHomeworksInClass(classid).catch((error) => {
            logger.error('addHomeworkCommandHandler: ' + error);
            return [];
        });;
    }

    async sendSolution(solution: solutionPayloadType) {
        // const file = await this.prepareFileUpload(solution.token, {
        //     fileID: solution.file.fileID,
        //     fileName: solution.file.fileName,
        //     mimeType: solution.file.mimeType
        // });
        // if (file === undefined) {
        //     logger.error('addDocumentMessageHandler: file === undefined');
        //     return false;
        // }

        const attachList: AttachType[] = [];
        for (const rawFile of solution.files) {
            const file = await this.prepareFileUpload(solution.token, rawFile);
            if (file === undefined) {
                logger.error('addDocumentMessageHandler: file === undefined');
                continue;
            }
            file.fileLink = changeHttpsToHttp(file.fileLink);
            attachList.push(file);
        }
        if (attachList.length !== solution.files.length) {
            return false;
        }

        return await this.controller.sendSolutionToClient({
            homeworkID: solution.homeworkID,
            data: {
                text: solution.text,
                attachList
            },
            studentID: solution.studentID
        })
            .then(() => true)
            .catch(() => false);
    }

    private async prepareFileUpload(token: string, file: RawFileType): Promise<AttachType | undefined> {
        const fileLink = await this.getBot(token)
            .telegram.getFileLink(file.fileID)
            .then(url => url.toString())
            .catch((err: unknown) => {
                logger.error('prepareFileUpload, getFileLink: ' + err);
                return undefined;
            });
        if (fileLink === undefined) {
            return undefined;
        }

        const mimeType = file.mimeType ?? mime.getType(file.fileName ?? fileLink);
        if (mimeType === null) {
            logger.error("prepareFileUpload: mimetype === null");
            return undefined;
        }
        return { fileLink, mimeType };
    }

    private async replyErrorMsg(ctx: Context) {
        await ctx.reply(
            'Что-то пошло не так. Попробуйте через некоторое время. /help для справки',
        );
    }
}
