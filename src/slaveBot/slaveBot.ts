import mime from 'mime';
import { Context, Telegraf, session } from 'telegraf';
import { message } from "telegraf/filters";
import {
    CustomContext,
    Homework,
    ProtoAttachMessage,
    ProtoMessage,
    ProtoSolution,
    SendMessageTo
} from '../../types/interfaces';
import { dbInstance } from '../index';
import { RuntimeError, logger } from '../utils/logger';
import { changeHttpsToHttp } from '../utils/url';
import { HomeworkScene, IHomeworkSceneController, solutionPayloadType } from './scenes';

export interface ISlaveBotController {
    sendMessageToClient: (message: ProtoMessage, sendMessageTo: SendMessageTo) => void;
    sendMessageWithAttachToClient: (message: ProtoAttachMessage) => void;
    getHomeworksInClass: (classID: number) => Promise<Homework[]>;
    sendSolutionToClient: (message: ProtoSolution) => void;
}

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
            this.bots.set(token, new Telegraf<CustomContext>(token));
        });
        if (!this.bots.size) {
            throw Error('no bots in db');
        }
    }

    initBots() {
        Array.from(this.bots.values()).forEach((bot) => {
            this.addAuthMiddleware(bot);

            bot.use(session());
            bot.use(this.sceneBuilder.initStage().middleware());

            bot.start(this.onStartCommand);
            bot.help(this.#onHelpCommand);

            bot.telegram.setMyCommands([
                {
                    command: this.sceneBuilder.scenes.homeworks.name,
                    description: this.sceneBuilder.scenes.homeworks.description
                },
            ]);
            this.addHomeworkCommandHandler(bot);

            this.addTextMessageHandler(bot);
            this.addPhotoMessageHandler(bot);
            this.addDocumentMessageHandler(bot);
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

    private async onStartCommand(ctx: CustomContext) {
        await ctx.reply(
            'Все готово! Можете начинать общаться с преподавателем.',
        ).catch((error) => logger.error('onStartCommand: ' + error));
    }

    async #onHelpCommand(ctx: CustomContext) {
        ctx.reply('still in dev...').catch((reason: string) =>
            logger.error('bot.help error: ' + reason),
        );
    }

    private addAuthMiddleware(bot: Telegraf<CustomContext>) {
        bot.use(async (ctx, next) => {
            ctx.educrm ??= {
                chatID: -1,
                studentID: -1
            };
            if (ctx.message) {
                const chatID = await dbInstance.getSlaveBotChatIdByUserIdAndToken(
                    ctx.message.chat.id,
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
                    const fileLink = await this.getBot(ctx.telegram.token)
                        .telegram.getFileLink(ctx.message.photo.at(-1)!.file_id) // TODO !
                        .catch((err: string) => {
                            logger.error('#onPhotoAttachmentSend, getFileLink: ' + err);
                            return undefined;
                        },
                        );
                    if (fileLink === undefined) {
                        // TODO
                        logger.error("#onPhotoAttachmentSend, get filelink broken");
                        return;
                    }
                    console.log(ctx.telegram.token);
                    console.log(ctx);

                    const chatid = await dbInstance.getSlaveBotChatIdByUserIdAndToken(
                        ctx.message.chat.id,
                        ctx.telegram.token,
                    );

                    const mimetype = mime.getType(fileLink.toString());
                    if (mimetype === null) {
                        // TODO
                        logger.error("#onPhotoAttachmentSend, get filelink with error mine type");
                        return;
                    }

                    if (chatid) {
                        this.controller.sendMessageWithAttachToClient({
                            chatid,
                            text: '', // TODO ctx.message.text ?? '',
                            mimetype: mimetype,
                            fileLink: changeHttpsToHttp(fileLink.toString()),
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
        );
    }

    private addDocumentMessageHandler(bot: Telegraf<CustomContext>) {
        bot.on(
            message("document"),
            async ctx => {
                if (ctx.message && ctx.message.document) {
                    logger.trace(
                        this.getBot(ctx.telegram.token).telegram.getFile(
                            ctx.message.document.file_id,
                        ),
                    );
                    const fileLink = await this.getBot(ctx.telegram.token)
                        .telegram.getFileLink(ctx.message.document.file_id)
                        .catch((err: unknown) => {
                            logger.error(err);
                            return undefined;
                        });
                    if (fileLink === undefined) {
                        // TODO
                        logger.error("addDocumentMessageHandler, get filelink broken");
                        return;
                    }
                    const chatid = await dbInstance.getSlaveBotChatIdByUserIdAndToken(
                        ctx.message.chat.id,
                        ctx.telegram.token,
                    );

                    const mimetype = ctx.message.document.mime_type ?? mime.getType(ctx.message.document.file_name ?? fileLink.toString());
                    if (mimetype === null) {
                        // TODO
                        logger.error("addDocumentMessageHandler, get filelink with error mine type");
                        return;
                    }

                    if (chatid) {
                        this.controller.sendMessageWithAttachToClient({
                            chatid: chatid,
                            text: '', // TODO with text
                            mimetype: mimetype,
                            fileLink: changeHttpsToHttp(fileLink.toString()),
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
        const fileLink = await this.getBot(solution.token)
            .telegram.getFileLink(solution.file.fileID)
            .catch((err: unknown) => {
                logger.error(err);
                return undefined;
            });
        if (fileLink === undefined) {
            // TODO
            logger.error("addDocumentMessageHandler, get filelink broken");
            return false;
        }

        const mimetype = solution.file.mimeType ?? mime.getType(solution.file.fileName ?? fileLink.toString());
        if (mimetype === null) {
            // TODO
            logger.error("addDocumentMessageHandler, get filelink with error mine type");
            return false;
        }

        this.controller.sendSolutionToClient({
            homeworkID: solution.homeworkID,
            data: {
                text: '', // TODO with text
                attachList: [
                    {
                        mimetype: mimetype,
                        fileLink: changeHttpsToHttp(fileLink.toString()),
                    }
                ]
            },
            studentID: solution.studentID
        });

        return true;
    }

    private async replyErrorMsg(ctx: Context) {
        await ctx.reply(
            'Что-то пошло не так. Попробуйте через некоторое время.',
        );
    }
}
