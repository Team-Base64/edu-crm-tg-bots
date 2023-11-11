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

export default class SlaveBots {
    bots;
    sendMessageToClient;
    sendMessageWithAttachToClient;

    constructor(
        sendMessageToClient: (
            message: ProtoMessage,
            sendMessageTo: SendMessageTo,
        ) => void,
        sendMessageWithAttachToClient: (message: ProtoAttachMessage) => void,
    ) {
        this.bots = new Map<string, typeof Telegraf>();
        this.sendMessageToClient = sendMessageToClient;
        this.sendMessageWithAttachToClient = sendMessageWithAttachToClient;

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

            bot.on(['text'], this.#onTextMessage.bind(this));
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

    async #onTextMessage(ctx: updateContext) {
        if (ctx.message) {
            const chatid = await dbInstance.getSlaveBotChatIdByUserIdAndToken(
                ctx.message.chat.id,
                ctx.telegram.token,
            );

            if (chatid) {
                const sendMessageTo =
                    await dbInstance.getSlaveBotTokenAndUserIdByChatId(chatid);
                if (sendMessageTo) {
                    this.sendMessageToClient(
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
}
