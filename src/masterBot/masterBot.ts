import {Context} from 'telegraf';
import {logger} from '../utils/logger';
import {updateContext} from '../../types/interfaces';

const {Telegraf} = require('telegraf');

class MasterBot {
    bot;
    slaveBots;

    constructor(token: string) {
        this.bot = new Telegraf(token);

        this.initBots();

        this.slaveBots = ['https://t.me/GG222bot', 'https://t.me/Aintttbot'];

        logger.info(`starting Bots with ${logger.level} level`);
    }

    initBots() {
        this.bot.start(this.#onStartCommand.bind(this));

        this.bot.help(this.#onHelpCommand);

        this.bot.on('message', this.#onTextMessage.bind(this));

        // this.bot.command('', (ctx) => ctx.reply('Hey there'));
    }

    launchBots() {
        this.bot.launch().catch((reason: string) => logger.fatal('bot.launch() error: ' + reason));
        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    }

    sendMessage(ctx: Context, text: string) {
        ctx.reply(text).catch((reason: string) => logger.fatal('bot.launch() error: ' + reason));
    }

    // addChatID(chatID: number) {
    //
    // }

    #onStartCommand(ctx: Context) {
        ctx.reply('Отправьте мне код, чтобы подключиться к классу').
            catch((reason: string) => logger.fatal('bot.start() error: ' + reason));
    }

    #onHelpCommand(ctx: updateContext) {
        ctx.reply('Отправьте сообщение с вашим кодом, '+
            'чтобы получить бота для общения с преподавателем').
            catch((reason: string) => logger.fatal('bot.help error: ' + reason));
    }

    #onTextMessage(ctx: updateContext) {
        if (ctx.message && Number.isInteger(Number(ctx.message.text))) {
            ctx.reply('Ваш бот для общения с преподавателем: ' +
                `*${this.slaveBots[ctx.message.text % this.slaveBots.length]}*. ` +
                'Нажмите */start*, когда перейдете в этот бот',
            {parse_mode: 'Markdown'},
            ).
                catch((reason: string) => logger.fatal('bot.on([\'text\'] error: ' + reason));
        } else {
            logger.warn('bot.on([\'text\']: no message / NaN');
            ctx.reply(
                'Токен может содержать только цифры. '+
                'Для отображения помощи используйте */help*',
                {parse_mode: 'Markdown'},
            ).
                catch((reason: string) => logger.fatal('bot.on([\'text\'] error: ' + reason));
        }
    }
}

const masterBotToken = '6881067197:AAHLj70waoWo5PnS009QYyy8U3ka9SuZhWg';

const masterBot = new MasterBot(masterBotToken);
masterBot.launchBots();
