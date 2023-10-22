import {ProtoMessage} from '../types/interfaces';
import {Context} from 'telegraf';
import {Message, Update} from '@telegraf/types';
import NonChannel = Update.NonChannel;
import New = Update.New;
import TextMessage = Message.TextMessage;
import {logger} from './utils/logger';
const {Telegraf} = require('telegraf');


interface updateContext extends Context {
    message: (New & NonChannel & TextMessage & Message) | undefined,
}

type SendMessageTo = {botToken: string, telegramChatID: number};

export default class Bots {
    bots;
    context;
    sendMessageToClient;
    senderChat;

    constructor(
        tokens: Array<string>, chatIDs: Array<number>,
        sendMessageToClient: (message: ProtoMessage) => void,
    ) {
        this.bots = new Map<string, typeof Telegraf>;
        this.context = new Map<number, SendMessageTo>();
        this.senderChat = new Map<number, number>();
        this.sendMessageToClient = sendMessageToClient;

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

            bot.command('addClass', Telegraf.reply('token'));

            bot.on(['text'], this.#onTextMessage.bind(this));
        });
    }

    launchBots() {
        Array.from(this.bots.values()).forEach((bot) => {
            bot.launch().catch((reason: string) => logger.error('bot.launch() error: ' + reason));
            process.once('SIGINT', () => bot.stop('SIGINT'));
            process.once('SIGTERM', () => bot.stop('SIGTERM'));
        });
    }

    sendMessage({botToken, telegramChatID}: SendMessageTo, text: string) {
        this.bots.get(botToken).telegram.sendMessage(telegramChatID, text);
    }

    addChatID(chatID: number) {

    }

    #onStartCommand(chatID: number, ctx: Context) {
        ctx.reply('Run /addClass command').
            catch((reason: string) => logger.error('bot.start() error: ' + reason));

        if (ctx.message && ctx.message.from.id) {
            this.context.set(
                chatID,
                {botToken: ctx.telegram.token, telegramChatID: ctx.message.from.id},
            );

            this.senderChat.set(ctx.message.chat.id, chatID);
        } else {
            logger.error('bot.start: ', 'no ctx.message && ctx.message.from.id');
            ctx.reply('error occurred. Try later.').
                catch((reason: string) => logger.error('bot.start() error: ' + reason));
        }
    }

    #onHelpCommand(ctx: updateContext) {
        ctx.reply('Run /addClass command to send me a token from your teacher!').
            catch((reason: string) => logger.error('bot.help error: ' + reason));
    }

    #onTextMessage(ctx: updateContext) {
        if (ctx.message) {
            logger.trace(`this.senderChat ${this.senderChat}`);
            logger.trace(`ctx.message.chat.id ${ctx.message.chat.id}`);
            logger.trace(`this.senderChat.get(ctx.message.chat.id) 
            ${this.senderChat.get(ctx.message.chat.id)}`);

            ctx.reply(ctx.message.text).
                catch((reason: string) => logger.error('bot.on([\'text\'] error: ' + reason));

            if (this.senderChat.has(ctx.message.chat.id)) {
                this.sendMessageToClient(
                    {
                        chatID: this.senderChat.get(ctx.message.chat.id) as number,
                        text: ctx.message.text,
                    },
                );
            }
        } else {
            logger.warn('bot.on([\'text\']: no message');
        }
    }
}
