import {
    ProtoAttachMessage,
    ProtoMessage,
    updateContext,
} from '../../types/interfaces';
import { Context } from 'telegraf';

import { logger } from '../utils/logger';
import { changeHttpsToHttps } from '../utils/url';

const { Telegraf } = require('telegraf');
const mime = require('mime');

type SendMessageTo = { botToken: string; telegramChatID: number };

export default class Bots {
    bots;
    context;
    sendMessageToClient;
    sendMessageWithAttachToClient;
    senderChat;

    constructor(
        tokens: Array<string>,
        chatIDs: Array<number>,
        sendMessageToClient: (message: ProtoMessage) => void,
        sendMessageWithAttachToClient: (message: ProtoAttachMessage) => void,
    ) {
        this.bots = new Map<string, typeof Telegraf>();
        this.context = new Map<number, SendMessageTo>();
        this.senderChat = new Map<number, number>();
        this.sendMessageToClient = sendMessageToClient;
        this.sendMessageWithAttachToClient = sendMessageWithAttachToClient;

        this.createBots(tokens);
        this.initBots(chatIDs);

        logger.info(`starting Bots with ${logger.level} level`);
    }

    createBots(tokens: Array<string>) {
        tokens.forEach((token) => {
            this.bots.set(token, new Telegraf(token));
        });
    }

    initBots(chatIDs: Array<number>) {
        Array.from(this.bots.values()).forEach((bot, index) => {
            bot.start(this.#onStartCommand.bind(this, chatIDs[index]));

            bot.help(this.#onHelpCommand);

            bot.on(['text'], this.#onTextMessage.bind(this));
            bot.on(['photo'], this.#onPhotoAttachmentSend.bind(this));
            bot.on(['document'], this.#onFileAttachmentSend.bind(this));
        });
    }

    launchBots() {
        Array.from(this.bots.values()).forEach((bot) => {
            bot.launch().catch((reason: string) =>
                logger.error('bot.launch() error: ' + reason),
            );
            process.once('SIGINT', () => bot.stop('SIGINT'));
            process.once('SIGTERM', () => bot.stop('SIGTERM'));
        });
    }

    sendMessage({ botToken, telegramChatID }: SendMessageTo, text: string) {
        this.bots.get(botToken).telegram.sendMessage(telegramChatID, text);
    }

    sendDocument({ botToken, telegramChatID }: SendMessageTo, text: string) {
        this.bots.get(botToken).telegram.sendDocument(telegramChatID, text);
    }

    sendPhoto({ botToken, telegramChatID }: SendMessageTo, text: string) {
        this.bots.get(botToken).telegram.sendDocument(telegramChatID, text);
    }

    #getBot({ telegram }: updateContext) {
        return this.bots.get(telegram.token);
    }

    #onStartCommand(chatID: number, ctx: Context) {
        ctx.reply('Run /addClass command').catch((reason: string) =>
            logger.error('bot.start() error: ' + reason),
        );

        if (ctx.message && ctx.message.from.id) {
            this.context.set(chatID, {
                botToken: ctx.telegram.token,
                telegramChatID: ctx.message.from.id,
            });

            this.senderChat.set(ctx.message.chat.id, chatID);
        } else {
            logger.error(
                'bot.start: ',
                'no ctx.message && ctx.message.from.id',
            );
            ctx.reply('error occurred. Try later.').catch((reason: string) =>
                logger.error('bot.start() error: ' + reason),
            );
        }
    }

    #onHelpCommand(ctx: updateContext) {
        ctx.reply(
            'Run /addClass command to send me a token from your teacher!',
        ).catch((reason: string) => logger.error('bot.help error: ' + reason));
    }

    #onTextMessage(ctx: updateContext) {
        if (ctx.message) {
            if (this.senderChat.has(ctx.message.chat.id)) {
                this.sendMessageToClient({
                    chatid: this.senderChat.get(ctx.message.chat.id) ?? 1,
                    text: ctx.message.text,
                });
            }
        } else {
            logger.warn("bot.on(['text']: no message");
        }
    }

    async #onPhotoAttachmentSend(ctx: updateContext) {
        if (ctx.message && ctx.message.photo) {
            const fileLink = await this.#getBot(ctx)
                .telegram.getFileLink(ctx.message.photo.at(-1)?.file_id)
                .catch((err: unknown) => logger.error(err));

            this.sendMessageWithAttachToClient({
                chatid: this.senderChat.get(ctx.message.chat.id) ?? 1,
                text: ctx.message.text ?? '',
                mimetype: mime.getType(fileLink),
                fileLink: changeHttpsToHttps(fileLink),
            });
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

            this.sendMessageWithAttachToClient({
                chatid: this.senderChat.get(ctx.message.chat.id) ?? 1,
                text: ctx.message.text ?? '',
                mimetype:
                    ctx.message.document.mime_type ??
                    mime.getType(ctx.message.document.file_name ?? fileLink),
                fileLink: changeHttpsToHttps(fileLink),
            });
        } else {
            logger.warn("bot.on(['text']: no message");
        }
    }
}
