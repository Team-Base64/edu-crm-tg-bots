import { Context } from 'telegraf';
import { logger } from '../utils/logger';
import { updateContext } from '../../types/interfaces';
import { dbInstance, masterBotTokenLength } from '../index';
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

        logger.info(`starting master bot with ${logger.level} level`);
    }

    initBots() {
        this.bot.start(this.#onStartCommand.bind(this));

        this.bot.help(this.#onHelpCommand);

        this.bot.on('message', this.#onTextMessage.bind(this));
    }

    launchBot() {
        this.bot
            .launch()
            .catch((reason: string) =>
                logger.fatal('master bot.launch() error: ' + reason),
            );
        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
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
        if (ctx.message && ctx.message.text.length === masterBotTokenLength) {
            const { isvalid, classid } = this.verifyTokenWeb(ctx.message.text);
            if (isvalid) {
                let { userExists, chatid, studentid } =
                    (await dbInstance.checkIfUserExists(
                        ctx.message.from.id,
                        classid,
                    )) ?? { userExists: false };

                logger.debug('#onTextMessage, userExists: ' + userExists);

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
                    ).catch((error) => {
                        logger.warn(error.message);
                        ctx.reply(
                            'К сожалению Вам сейчас недоступно создание бота. ' +
                                'Отвяжите активный бот и попробуйте снова',
                        );
                        return '';
                    });
                    logger.trace('new, slaveBotLink: ' + slaveBotLink);
                } else {
                    slaveBotLink = await dbInstance.getExistingSlaveBot(
                        chatid,
                        ctx.message.from.id,
                    );
                    logger.trace('exist, slaveBotLink: ' + slaveBotLink);
                }

                if (slaveBotLink) {
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
                logger.info("bot.on(['text']: invalid token");
                ctx.reply(
                    'Неверный токен. ' +
                        'Для отображения помощи используйте */help*',
                    { parse_mode: 'Markdown' },
                ).catch((reason: string) =>
                    logger.fatal("bot.on(['text'] error: " + reason),
                );
            }
        } else {
            logger.info("bot.on(['text']: wrong symbols count");
            ctx.reply(
                `Токен может содержать только ${masterBotTokenLength} символов. ` +
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

        logger.debug('currentSlaveBots: ' + currentSlaveBots);

        let botid = 0;
        let link = '';
        if (!currentSlaveBots) {
            const botData = await this.slaveBotBalancer.getFirstEverBotId();
            logger.trace('getFirstEverBotId' + JSON.stringify(botData));
            botid = botData.botid;
            link = botData.link;
        } else if (
            currentSlaveBots.size === this.slaveBotBalancer.allBots.length
        ) {
            return Promise.reject(new Error('no free bots available'));
        } else {
            const botData = this.slaveBotBalancer.getNextBot(currentSlaveBots);
            logger.trace('getNextBot' + JSON.stringify(botData));
            botid = botData.botid;
            link = botData.link;
        }
        await dbInstance.addUser(chatid, userid, studentid, classid, botid);

        return link;
    }
}
