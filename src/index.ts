import client from './grpc/client';
import {Message} from '../types/interfaces';
import {Context} from 'telegraf';
const {Telegraf} = require('telegraf');

type tempContext = {message: {text: string}, update: {message: {chat: {id: number}}}, reply: (std: string) => void};

class Bots {
    bots: Array<typeof Telegraf>;
    context;
    sendMessageToClient;
    senderChat;

    constructor(tokens: Array<string>, chatIDs: Array<number>, sendMessageToClient: Function) {
        this.bots = [];
        this.context = new Map<number, object>();
        this.senderChat = new Map<number, number>();
        this.sendMessageToClient = sendMessageToClient;
        this.createBots(tokens);
        this.initBots(chatIDs);
    }

    createBots(tokens: Array<string>) {
        tokens.forEach((token) => {
            this.bots.push(new Telegraf(token));
        });
    }

    initBots(chatIDs: Array<number>) {
        this.bots.forEach((bot, index: number) => {
            bot.start((ctx: tempContext) => {
                // this.ctx.push()
                ctx.reply('Run /addClass command');
                this.context.set(chatIDs[index], ctx);
                this.senderChat.set(ctx.update.message.chat.id, chatIDs[index]);
                // console.log(ctx.botInfo);
                // console.log(ctx.update); // update info
                // console.log(ctx.state); // empty -_-
            });
            bot.help((ctx: Context) =>
                ctx.reply('Run /addClass command to send me a token from your teacher!'));
            bot.command('addClass', Telegraf.reply('token'));
            bot.hears('hi', (ctx: Context) => this.sendMessage(ctx, `date is  ${new Date()}`));

            bot.on(['text'], (
                ctx: tempContext,
            ) => {
                this.sendMessage(ctx as Context, ctx.message.text);
                this.sendMessageToClient(
                    {
                        chatID: this.senderChat.get(ctx.update.message.chat.id), text: ctx.message.text,
                    },
                );
            });
        });
        console.log(this.context.entries());
    }

    launchBots() {
        this.bots.forEach((bot) => {
            bot.launch();

            process.once('SIGINT', () => bot.stop('SIGINT'));
            process.once('SIGTERM', () => bot.stop('SIGTERM'));
        });
    }

    sendMessage(ctx: Context, text: string) {
        console.log(ctx);
        ctx.reply(text);
        // Telegraf.reply();
    }
}

export default class Net {
    bots;

    constructor(tokens: Array<string>, chatIDs: Array<number>) {
        this.bots = new Bots(tokens, chatIDs, this.sendMessageToClient);
        this.bots.launchBots();
    }

    sendMessageFromClient(message: Message) {
        if (this.bots.context.has(message.chatID)) {
            this.bots.sendMessage(this.bots.context.get(message.chatID) as Context, message.text);
        } else {
            console.error('sendMessageFromClient error, no such chat id');
        }
    }

    sendMessageToClient(message: Message) {
        if (message.chatID !== undefined) {
            console.log('sendMessageToClient, text:', message.text);
            client.Recieve(message, function(creationFailed: string, productCreated: string) {
                console.log('On Success:', productCreated);
                console.log('On Failure:', creationFailed);
            });
        } else {
            console.error('sendMessageToClient error, no such chat id');
        }
    }
}
