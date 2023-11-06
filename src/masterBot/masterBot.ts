import { Context } from 'telegraf';
import { logger } from '../utils/logger';
import { updateContext } from '../../types/interfaces';
import { dbInstance } from '../index';
import SlaveBotBalancer from './slaveBotBalancer';

const { Telegraf } = require('telegraf');

type isValidFunType = (token: string) => {
    isvalid: boolean;
    classid: number;
};
type createWebChatFunType = (studentid: number, classid: number) => number;
type registerWeb = (name: string, avatar: string) => number;

export default class MasterBot {
    bot;
    slaveBots;
    verifyTokenWeb: isValidFunType;
    createChatWeb: createWebChatFunType;
    registerWeb: registerWeb;
    slaveBotBalancer: SlaveBotBalancer;

    constructor(
        token: string,
        verifyTokenWeb: isValidFunType,
        createChatWeb: createWebChatFunType,
        registerWeb: registerWeb,
    ) {
        this.verifyTokenWeb = verifyTokenWeb;
        this.createChatWeb = createChatWeb;
        this.registerWeb = registerWeb;

        this.slaveBotBalancer = new SlaveBotBalancer();

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

    launchBot() {
        this.bot
            .launch()
            .catch((reason: string) =>
                logger.fatal('bot.launch() error: ' + reason),
            );
        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    }

    sendMessage(ctx: Context, text: string) {
        ctx.reply(text).catch((reason: string) =>
            logger.fatal('bot.launch() error: ' + reason),
        );
    }

    #onStartCommand(ctx: Context) {
        ctx.reply('Отправьте мне код, чтобы подключиться к классу').catch(
            (reason: string) => logger.fatal('bot.start() error: ' + reason),
        );
    }

    #onHelpCommand(ctx: updateContext) {
        ctx.reply(
            'Отправьте сообщение с вашим кодом, ' +
                'чтобы получить бота для общения с преподавателем',
        ).catch((reason: string) => logger.fatal('bot.help error: ' + reason));
    }

    async #onTextMessage(ctx: updateContext) {
        if (ctx.message && Number.isInteger(Number(ctx.message.text))) {
            const { isvalid, classid } = this.verifyTokenWeb(ctx.message.text);
            if (isvalid) {
                let { userExists, chatid, studentid } =
                    (await dbInstance.checkIfUserExists(
                        ctx.message.from.id,
                        classid,
                    )) ?? { userExists: false };

                let slaveBotLink = '';
                if (!userExists) {
                    studentid = this.registerWeb(
                        (ctx.message.from.last_name ??
                            ctx.message.from.username) +
                            (ctx.message.from.last_name ?? ''),
                        '',
                    );

                    chatid = this.createChatWeb(studentid, classid);

                    slaveBotLink = await this.#getNewSlaveBot(
                        chatid,
                        ctx.message.from.id,
                        studentid,
                        classid,
                    );
                } else {
                    slaveBotLink = await dbInstance.getExistingSlaveBot(
                        chatid,
                        ctx.message.from.id,
                    );
                }

                ctx.reply(
                    'Ваш бот для общения с преподавателем: ' +
                        `*${slaveBotLink}*. ` +
                        'Нажмите */start*, когда перейдете в этот бот',
                    { parse_mode: 'Markdown' },
                ).catch((reason: string) =>
                    logger.fatal("bot.on(['text'] error: " + reason),
                );
            }
        } else {
            logger.warn("bot.on(['text']: no message / NaN");
            ctx.reply(
                'Токен может содержать только цифры. ' +
                    'Для отображения помощи используйте */help*',
                { parse_mode: 'Markdown' },
            ).catch((reason: string) =>
                logger.fatal("bot.on(['text'] error: " + reason),
            );
        }
    }

    async #getNewSlaveBot(
        chatid: number,
        userid: number,
        studentid: number,
        classid: number,
    ) {
        const currentSlaveBots =
            await dbInstance.getCurrentSlaveBotsForUser(userid);

        let botid = 0;
        let link = '';
        if (!currentSlaveBots) {
            const botData = await this.slaveBotBalancer.getFirstEverBotId();
            botid = botData.botid;
            link = botData.link;
        } else {
            const botData = this.slaveBotBalancer.getNextBot(currentSlaveBots);
            botid = botData.botid;
            link = botData.link;
        }
        await dbInstance.addUser(chatid, userid, studentid, classid, botid);

        return link;
    }
}
