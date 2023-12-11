import mime from 'mime';
import { Context, Scenes, Telegraf, session } from 'telegraf';
import { message } from 'telegraf/filters';
import {
    CustomContext,
    Event,
    Homework,
    ProtoMessageBase,
    ProtoMessageSend,
    ProtoSolution,
    RawFile,
    SendMessageTo
} from '../../types/interfaces';
import { dbInstance } from '../index';
import {
    HomeworkSceneBuilder,
    IHomeworkSceneController,
    solutionPayloadType,
} from '../scenes/homeworkScene';
import { RuntimeError, logger } from '../utils/logger';
import { changeHttpsToHttp } from '../utils/url';

export interface ISlaveBotController {
    sendMessageToClient: (message: ProtoMessageBase) => void;
    sendMessageWithAttachToClient: (message: ProtoMessageSend) => Promise<void>;
    getHomeworksInClass: (classID: number) => Promise<Homework[]>;
    sendSolutionToClient: (message: ProtoSolution) => Promise<void>;
    createChat: (studentid: number, classid: number) => Promise<number>;
    getEvents: (classID: number) => Promise<Event[]>;
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
    scenesStage: Scenes.Stage<CustomContext>;
    commands: { command: string, description: string; }[] = [
        {
            command: 'help',
            description: 'Решения возможных проблем'
        },
        {
            command: HomeworkSceneBuilder.sceneName,
            description: HomeworkSceneBuilder.sceneDescription,
        },
        {
            command: 'events',
            description: 'Показать ближайшие занятия'
        }
    ];

    constructor(controller: ISlaveBotController) {
        this.controller = controller;
        this.scenesStage = new Scenes.Stage<CustomContext>([
            new HomeworkSceneBuilder(this).build()
        ]);

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
            bot.use(this.scenesStage.middleware());

            bot.start(this.onStartCommand);
            bot.help(this.onHelpCommand);

            bot.telegram.setMyCommands(this.commands);
            this.addHomeworkCommandHandler(bot);
            this.addEventCommandHandler(bot);

            this.addTextMessageHandler(bot);
            this.addPhotoMessageHandler(bot);
            this.addDocumentMessageHandler(bot);

            bot.action(/.+/, (ctx) => {
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

    sendAttaches(
        { botToken, telegramChatID }: SendMessageTo,
        data: SendMessageData,
    ) {
        logger.debug(
            `sendMedia: text - ${data.text}, attaches - ${data.atachList.length}`,
        );
        this.getBot(botToken)
            .telegram.sendMediaGroup(
                telegramChatID,
                data.atachList.map((attach, idx) => {
                    return {
                        media: attach,
                        type: 'document',
                        caption:
                            idx === data.atachList.length - 1
                                ? data.text
                                : undefined,
                    };
                }),
            )
            .catch((error: string) => {
                logger.error('sendMedia: ' + error);
                this.getBot(botToken).telegram.sendMessage(
                    telegramChatID,
                    'Ошибка при отправке сообщения',
                );
            });
    }

    async getHomeworks(ctx: CustomContext): Promise<Homework[]> {
        if (ctx.message === undefined) {
            logger.error('getHomeworksInClass: нет message');
            await this.replyErrorMsg(ctx);
            return [];
        }

        const classid = await dbInstance.getSlaveBotClassIdByChatId(
            ctx.educrm.chatID,
        );
        if (typeof classid !== 'number') {
            logger.error('addHomeworkCommandHandler: classid - ' + classid);
            await this.replyErrorMsg(ctx);
            return [];
        }
        return await this.controller
            .getHomeworksInClass(classid)
            .catch((error) => {
                logger.error('addHomeworkCommandHandler: ' + error);
                return [];
            });
    }

    async sendSolution(solution: solutionPayloadType) {
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

        return await this.controller
            .sendSolutionToClient({
                homeworkID: solution.homeworkID,
                data: {
                    text: solution.text,
                    attachList,
                },
                studentID: solution.studentID,
            })
            .then(() => true)
            .catch(() => false);
    }

    private async onStartCommand(ctx: CustomContext) {
        await ctx
            .reply('Все готово! Можете начинать общаться с преподавателем.')
            .catch((error) => logger.error('onStartCommand: ' + error));
    }

    private async onHelpCommand(ctx: CustomContext) {
        await ctx.replyWithMarkdownV2(
            'Добро пожаловать в TG бота сервиса EDUCRM\\!\n' +
            'Важные замечания:\n' +
            '\\- В нашем сервисе можно пожаловать только *картинки* и *pdf*',
        );
    }

    private addAuthMiddleware(bot: Telegraf<CustomContext>) {
        bot.use(async (ctx, next) => {
            ctx.educrm ??= {
                chatID: -1,
                studentID: -1,
                classID: -1,
            };
            if (ctx.chat) {
                const info =
                    await dbInstance.getSlaveBotInfoByUserIdAndToken(
                        ctx.chat.id,
                        ctx.telegram.token,
                    );
                if (typeof info === 'undefined') {
                    return ctx.reply(
                        'Этот бот не зарегистрирован для Вас. Продолжите работу в мастер боте - https://t.me/educrmmaster2bot',
                    );
                }

                switch (typeof info.chatID) {
                    case 'object': {
                        const newChatID = await this.controller.createChat(
                            info.studentID,
                            info.classID,
                        );
                        if (newChatID === -1) {
                            logger.error(
                                'AuthMiddleware, createChat: chatID === -1',
                            );
                            return this.replyErrorMsg(ctx);
                        }
                        if (
                            !(await dbInstance.updateChatIdInByStudentAndClassId(
                                newChatID,
                                info.studentID,
                                info.classID,
                            ))
                        ) {
                            logger.error(
                                'AuthMiddleware, updateChatIdInByStudentAndClassId: false',
                            );
                            return this.replyErrorMsg(ctx);
                        }
                        ctx.educrm.chatID = newChatID;
                        break;
                    }
                    case 'number': {
                        ctx.educrm.chatID = info.chatID;
                        break;
                    }
                }
                ctx.educrm.studentID = info.studentID;
                ctx.educrm.classID = info.classID;
            }
            return next();
        });
    }

    private addTextMessageHandler(bot: Telegraf<CustomContext>) {
        bot.on(message('text'), async (ctx) => {
            this.controller.sendMessageToClient({
                chatid: ctx.educrm.chatID,
                text: ctx.message.text,
            });
        });
    }

    private addPhotoMessageHandler(bot: Telegraf<CustomContext>) {
        bot.on(message('photo'), async (ctx) => {
            if (ctx.message && ctx.message.photo) {
                const fileID = ctx.message.photo.pop()?.file_id;
                if (fileID === undefined) {
                    logger.error(
                        'addPhotoMessageHandler: fileID === undefined',
                    );
                    return this.replyErrorMsg(ctx);
                }
                const file = await this.prepareFileUpload(ctx.telegram.token, {
                    fileID,
                });
                if (file === undefined) {
                    logger.error('addPhotoMessageHandler: file === undefined');
                    return this.replyErrorMsg(ctx);
                }

                await this.controller
                    .sendMessageWithAttachToClient({
                        chatid: ctx.educrm.chatID,
                        text: ctx.message.caption ?? '',
                        file: {
                            mimeType: file.mimeType,
                            fileLink: changeHttpsToHttp(file.fileLink),
                        },
                    })
                    .catch(() => {
                        logger.error(
                            'addPhotoMessageHandler: sendMessageWithAttachToClient error',
                        );
                        return this.replyErrorMsg(ctx);
                    });
            } else {
                logger.error('addPhotoMessageHandler: no message or photo');
                return this.replyErrorMsg(ctx);
            }
        });
    }

    private addDocumentMessageHandler(bot: Telegraf<CustomContext>) {
        bot.on(message('document'), async (ctx) => {
            if (ctx.message && ctx.message.document) {
                const file = await this.prepareFileUpload(ctx.telegram.token, {
                    fileID: ctx.message.document.file_id,
                    fileName: ctx.message.document.file_name,
                    mimeType: ctx.message.document.mime_type,
                });
                if (file === undefined) {
                    logger.error(
                        'addDocumentMessageHandler: file === undefined',
                    );
                    return this.replyErrorMsg(ctx);
                }

                await this.controller
                    .sendMessageWithAttachToClient({
                        chatid: ctx.educrm.chatID,
                        text: ctx.message.caption ?? '',
                        file: {
                            mimeType: file.mimeType,
                            fileLink: changeHttpsToHttp(file.fileLink),
                        },
                    })
                    .catch(() => {
                        logger.error(
                            'addDocumentMessageHandler: sendMessageWithAttachToClient error',
                        );
                        return this.replyErrorMsg(ctx);
                    });
            } else {
                logger.warn('addDocumentMessageHandler: no message');
            }
        });
    }

    private addHomeworkCommandHandler(bot: Telegraf<CustomContext>) {
        bot.command(this.commands[1].command, async (ctx) => {
            ctx.scene.enter(HomeworkSceneBuilder.sceneName);
        });
    }

    private addEventCommandHandler(bot: Telegraf<CustomContext>) {
        bot.command(this.commands[2].command, async (ctx) => {
            const events = await this.controller.getEvents(ctx.educrm.classID)
                .catch(err => {
                    logger.error(
                        'addEventCommandHandler, getEvents: ', err
                    );
                    return [];
                });
            if (events.length === 0) {
                return await ctx.replyWithMarkdownV2('Вам не назначены занятия в ближайшие 2 недели');
            }
            let msg = 'Ближайшие занятия:\n';
            events.forEach((event, idx) => {
                msg += `${idx + 1}\\. ${this.escapeForMDV2(event.title)}\n`;
                msg += `Описание: ${this.escapeForMDV2(event.description)}\n`;
                const startDate = new Date(event.startDate);
                const duration = Math.abs(Date.parse(event.endDate) - Date.parse(event.startDate));

                msg += `Дата занятия: ${this.escapeForMDV2(startDate
                    .toLocaleString('ru-RU', { timeZone: "Europe/Moscow" })
                    .slice(0, -3)
                    .replace(',', ' в'))} по МСК\n`;
                msg += `Продолжительность: ${new Date(duration).getHours()}:${new Date(duration).getMinutes()}\n`;
                msg += '\n';
            });
            return await ctx.replyWithMarkdownV2(msg.slice(0, -2));
        });
    }

    private escapeForMDV2(input: string): string {
        return input.replace(/([_*\[\]()~`>#+=|{}.!-])/g, '\\$1');
    }

    private async prepareFileUpload(
        token: string,
        file: RawFile,
    ): Promise<AttachType | undefined> {
        const fileLink = await this.getBot(token)
            .telegram.getFileLink(file.fileID)
            .then((url) => url.toString())
            .catch((err: unknown) => {
                logger.error('prepareFileUpload, getFileLink: ' + err);
                return undefined;
            });
        if (fileLink === undefined) {
            return undefined;
        }

        const mimeType =
            file.mimeType ?? mime.getType(file.fileName ?? fileLink);
        if (mimeType === null) {
            logger.error('prepareFileUpload: mimetype === null');
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
