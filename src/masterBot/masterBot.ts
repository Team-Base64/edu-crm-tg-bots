import {Context} from 'telegraf';
import {logger} from '../utils/logger';
import {SendMessageTo} from '../slaveBot/slaveBot';
import {updateContext} from '../../types/interfaces';
const {Telegraf} = require('telegraf');

class MasterBot {
    bots;

    constructor(tokens: Array<string>) {
        this.bots = new Map<string, typeof Telegraf>;

        this.createBots(tokens);
        this.initBots();

        logger.info(`starting Bots with ${logger.level} level`);
    }

    createBots(tokens: Array<string>) {
        tokens.forEach((token) => {
            this.bots.set(token, new Telegraf(token));
        });
    }
    initBots() {
        Array.from(this.bots.values()).forEach((bot) => {
            bot.start(this.#onStartCommand.bind(this));

            bot.help(this.#onHelpCommand);

            bot.on('message', this.#onTextMessage.bind(this));
            // bot.on(['text'], this.#onTextMessage.bind(this));
        });
    }

    launchBots() {
        Array.from(this.bots.values()).forEach((bot) => {
            bot.launch().catch((reason: string) => logger.fatal('bot.launch() error: ' + reason));
            process.once('SIGINT', () => bot.stop('SIGINT'));
            process.once('SIGTERM', () => bot.stop('SIGTERM'));
        });
    }

    sendMessage({botToken, telegramChatID}: SendMessageTo, text: string) {
        this.bots.get(botToken).telegram.sendMessage(telegramChatID, text);
    }

    // addChatID(chatID: number) {
    //
    // }

    #onStartCommand(ctx: Context) {
        ctx.reply('Отправьте мне токен, чтобы подключиться к классу').
            catch((reason: string) => logger.fatal('bot.start() error: ' + reason));

        // if (ctx.message && ctx.message.from.id) {
        //     this.context.set(
        //         chatID,
        //         {botToken: ctx.telegram.token, telegramChatID: ctx.message.from.id},
        //     );
        //
        //     this.senderChat.set(ctx.message.chat.id, chatID);
        // } else {
        //     logger.error('bot.start: ', 'no ctx.message && ctx.message.from.id');
        //     ctx.reply('error occurred. Try later.').
        //         catch((reason: string) => logger.error('bot.start() error: ' + reason));
        // }
    }

    #onHelpCommand(ctx: updateContext) {
        ctx.reply('Нажмите на команду */start*', {parse_mode: 'Markdown'}).
            catch((reason: string) => logger.fatal('bot.help error: ' + reason));
    }

    #onTextMessage(ctx: updateContext) {
        if (ctx.message) {
            ctx.reply(ctx.message.text).
                catch((reason: string) => logger.fatal('bot.on([\'text\'] error: ' + reason));
        } else {
            logger.warn('bot.on([\'text\']: no message');
        }
    }
}

const masterBotToken = ['6881067197:AAHLj70waoWo5PnS009QYyy8U3ka9SuZhWg'];

const masterBot = new MasterBot(masterBotToken);
masterBot.launchBots();
