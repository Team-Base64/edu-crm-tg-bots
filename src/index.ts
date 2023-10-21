// import client from './grpc/client';
import {ProtoMessage} from '../types/interfaces';
import {Context} from 'telegraf';
import {Message, Update} from '@telegraf/types';
import NonChannel = Update.NonChannel;
import New = Update.New;
import TextMessage = Message.TextMessage;
const {Telegraf} = require('telegraf');

interface updateContext extends Context {
    message: (New & NonChannel & TextMessage & Message) | undefined,
}

class Bots {
    bots: Array<typeof Telegraf>;
    context;
    sendMessageToClient;
    senderChat;

    constructor(
        tokens: Array<string>, chatIDs: Array<number>,
        sendMessageToClient: (message: ProtoMessage) => void,
    ) {
        this.bots = [];
        this.context = new Map<number, (text: string) => unknown>();
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
            bot.start((ctx: Context) => {
                // this.ctx.push()
                ctx.reply('Run /addClass command').
                    catch((reason: string) => console.error('bot.start() error: ' + reason));

                console.log(
                    JSON.stringify(
                        // @ts-ignore
                        this.#getSendTextFunction(ctx.telegram.sendMessage, ctx.message.from.id)));

                if (ctx.message && ctx.message.from.id) {
                    this.context.set(
                        chatIDs[index],
                        this.#getSendTextFunction(ctx.telegram.sendMessage, ctx.message.from.id),
                    );
                    this.senderChat.set(ctx.message.chat.id, chatIDs[index]);
                } else {
                    console.error('bot.start: ', 'no ctx.message && ctx.message.from.id');
                }
            });

            bot.help((ctx: updateContext) =>
                ctx.reply('Run /addClass command to send me a token from your teacher!'));

            bot.command('addClass', Telegraf.reply('token'));

            bot.on(['text'], (
                ctx: updateContext,
            ) => {
                if (ctx.message) {
                    ctx.reply(ctx.message.text).
                        catch((reason: string) => console.error('bot.on([\'text\'] error: ' + reason));
                    // ctx.telegram.sendMessage(ctx.update.message.chat.id, ctx.message.text);
                    if (this.senderChat.has(ctx.message.chat.id)) {
                        this.sendMessageToClient(
                            {
                                chatID: this.senderChat.get(ctx.message.chat.id) as number,
                                text: ctx.message.text,
                            },
                        );
                    }
                } else {
                    console.warn('bot.on([\'text\']', 'no message');
                }
            });
        });
    }

    launchBots() {
        this.bots.forEach((bot) => {
            bot.launch().catch((reason: string) => console.error('bot.launch() error: ' + reason));
            process.once('SIGINT', () => bot.stop('SIGINT'));
            process.once('SIGTERM', () => bot.stop('SIGTERM'));
        });
    }

    #getSendTextFunction(paramFunc: typeof Telegraf.sendMessage, id: number) {
        return (text: string) => paramFunc(id, text);
    }
}

export default class Net {
    bots;

    constructor(tokens: Array<string>, chatIDs: Array<number>) {
        this.bots = new Bots(tokens, chatIDs, this.sendMessageToClient);
        this.bots.launchBots();
    }

    sendMessageFromClient(message: ProtoMessage) {
        const sendMessage = this.bots.context.get(message.chatID);
        if (sendMessage) {
            sendMessage(message.text);
        } else {
            console.error('sendMessageFromClient error, no such chat id');
        }
    }

    sendMessageToClient(message: ProtoMessage) {
        if (message.chatID !== undefined) {
            console.log('sendMessageToClient, text:', message.text);
            // client.Recieve(message, function(creationFailed: string, productCreated: string) {
            //     console.log('On Success:', productCreated);
            //     console.log('On Failure:', creationFailed);
            // });
        } else {
            console.error('sendMessageToClient error, no such chat id');
        }
    }
}
