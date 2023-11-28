import { Context } from 'telegraf';
import { dbInstance, masterBotTokenLength } from '../index';
import { logger } from '../utils/logger';
import SlaveBotBalancer from './slaveBotBalancer';

import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';

export type isValidFunReturnType = Awaited<ReturnType<isValidFunType>>;
export type createWebChatFunReturnType = Awaited<
    ReturnType<createWebChatFunType>
>;
export type registerWebReturnType = Awaited<ReturnType<registerWeb>>;

type isValidFunType = (token: string) => Promise<{
    isvalid: boolean;
    classid: number;
}>;
type createWebChatFunType = (
    studentid: number,
    classid: number,
) => Promise<{ chatid: number; }>;
type registerWeb = (
    name: string,
    classid: number,
    avatar: string,
) => Promise<{ studentid: number; }>;

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

        this.bot = new Telegraf(token);;

        this.initBots();

        this.slaveBots = ['https://t.me/GG222bot', 'https://t.me/Aintttbot'];

        logger.info(`starting master bot with ${logger.level} level`);
    }

    initBots() {
        this.bot.start(this.#onStartCommand.bind(this));

        // this.bot.help(this.#onDeleteBot.bind(this));

        // this.bot.command('/deleteBot', this.#onDeleteBot.bind(this));
        // this.bot.hears('/deleteBot', this.#onDeleteBot.bind(this));

        this.addTextMessageHandler(this.bot);
    }

    launchBot() {
        this.bot.launch().catch((reason: string) => {
            logger.fatal('master bot.launch() error: ' + reason);
            this.launchBot();
        });
        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    }

    #onStartCommand(ctx: Context) {
        ctx.reply('Отправьте мне код, чтобы подключиться к классу').catch(
            (reason: string) => logger.fatal('bot.start() error: ' + reason),
        );
    }

    // #onHelpCommand(ctx: updateContext) {
    //     ctx.replyWithMarkdownV2(
    //         'Отправьте сообщение с вашим кодом, ' +
    //             'чтобы получить бота для общения с преподавателем',
    //     ).catch((reason: string) => logger.fatal('bot.help error: ' + reason));
    // }

    private async addTextMessageHandler(bot: Telegraf) {
        bot.on(
            message('text'),
            async ctx => {
                if (ctx.message && ctx.message.text.length === masterBotTokenLength) {
                    const { isvalid, classid } = await this.verifyTokenWeb(
                        ctx.message.text,
                    ).catch((error) => {
                        logger.error('verifyTokenWeb err: ' + error);
                        return error;
                    });
                    logger.info(
                        '#onTextMessage, verifyTokenWeb, res: ' +
                        JSON.stringify({ isvalid, classid }),
                    );
                    if (isvalid) {
                        let { userExists, chatid, studentid } =
                            (await dbInstance.checkIfUserExists(
                                ctx.message.from.id,
                                classid,
                            )) ?? { userExists: false };

                        logger.debug('#onTextMessage, userExists: ' + userExists);

                        let slaveBotLink = '';
                        if (!userExists) {
                            const registerWebResponse = await this.registerWeb(
                                (ctx.message.from.first_name ??
                                    ctx.message.from.username) +
                                ' ' +
                                (ctx.message.from.last_name ?? ''),
                                classid,
                                '',
                            ).catch((error) => {
                                logger.error('registerWeb, result: ' + error);
                                return error;
                            });

                            studentid = registerWebResponse?.studentid;

                            if (studentid != -1) {
                                const createChatWebResponse = await this.createChatWeb(
                                    studentid,
                                    classid,
                                ).catch((error) => {
                                    logger.error('createChatWeb, result: ' + error);
                                    return error;
                                });

                                chatid = createChatWebResponse?.chatid;

                                slaveBotLink = await this.#getNewSlaveBot(
                                    chatid,
                                    ctx.message.from.id,
                                    studentid,
                                    classid,
                                ).catch((error) => {
                                    logger.warn(error.message);
                                    ctx.reply(
                                        'К сожалению Вам сейчас недоступно создание бота. ' +
                                        'Отвяжите активный бот c помощью */help* и попробуйте снова',
                                        { parse_mode: 'Markdown' },
                                    );
                                    return '';
                                });
                                logger.trace('new, slaveBotLink: ' + slaveBotLink);
                            } else {
                                logger.info("bot.on(['text']: error create student");
                                ctx.reply('Ошибка сервера. ' + 'Попробуйте еще раз', {
                                    parse_mode: 'Markdown',
                                }).catch((reason: string) =>
                                    logger.fatal("bot.on(['text'] error: " + reason),
                                );
                            }
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
        );

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

    //     async #onDeleteBot(ctx: CustomContext) {
    //         logger.debug('#onDeleteBot, text: ' + ctx.message?.text);
    //         if (ctx.message && ctx.message.text) {
    //             await dbInstance
    //                 .unlinkBot(ctx.message?.text.replace('/help ', ''))
    //                 .then((response) => {
    //                     ctx.reply(
    //                         response
    //                             ? 'Бот успешно отвязан'
    //                             : 'Бот с такой ссылкой не найден. ' +
    //                             `Если вы хотите отвязать бот, Вы должны ввести команду
    // */help <ссылка на бот для удаления>*`,
    //                         { parse_mode: 'Markdown' },
    //                     );
    //                 })
    //                 .catch((error) =>
    //                     logger.error('#onDeleteBot, error: ' + error),
    //                 );
    //         } else {
    //             ctx.reply('Возникало ошибка. Попробуйте позже').catch((error) =>
    //                 logger.error('#onDeleteBot, no message: ' + error),
    //             );
    //         }
    //     }
}
