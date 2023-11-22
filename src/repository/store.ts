import { Client, ClientConfig } from 'pg';
import { logger } from '../utils/logger';
import { gracefulStop } from '../utils/gracefullStop';

const postgresLogger = logger.child({ class: 'PostgresStore' });

export class Store {
    #db: Client;

    constructor(config: ClientConfig) {
        this.#db = new Client(config);

        this.#start().catch((error) => {
            logger.fatal('db start error: ' + error);
        });

        gracefulStop(async () => {
            this.#stop.bind(this);
        });
    }

    async #start() {
        postgresLogger.info('Connecting to postgres db');
        return this.#db
            .connect()
            .then(() => {
                postgresLogger.info('Connected to postgres db');
                return;
            })
            .catch((error) => {
                postgresLogger.error('Postgres db connection error ' + error);
                return Promise.reject();
            });
    }

    async #stop() {
        postgresLogger.info('Disconnecting postgres db');
        return this.#db
            .end()
            .then(() => {
                postgresLogger.info('Disconnected postgres db');
                return;
            })
            .catch((error) => {
                postgresLogger.error('Postgres db disconnection error' + error);
                return;
            });
    }

    async getSlaveBotsNumber() {
        return this.#db
            .query(
                `select COUNT(token)
         from bots;`,
                [],
            )
            .then((data) => {
                if (!data.rows.length) {
                    return 0;
                }
                return data.rows[0].count;
            })
            .catch((error) => {
                postgresLogger.error('getSlaveBotsNumber: ' + error);
                return undefined;
            });
    }

    async getSlaveBotLink(id: number) {
        return this.#db
            .query(
                `select link
         from bots
         where id = $1;`,
                [id],
            )
            .then((data) => {
                if (!data.rows.length) {
                    return undefined;
                }
                return data.rows[0].link;
            })
            .catch((error) => {
                postgresLogger.error('getSlaveBotLink: ' + error);
                return undefined;
            });
    }

    async getSlaveBots() {
        return this.#db
            .query(
                `select link, id, token
         from bots;`,
                [],
            )
            .then((data) => {
                if (!data.rows.length) {
                    return [];
                }
                return data.rows.map((element) => {
                    return {
                        link: element.link,
                        id: element.id,
                        token: element.token,
                    };
                });
            })
            .catch((error) => {
                postgresLogger.error('getSlaveBots: ' + error);
                return undefined;
            });
    }

    async checkIfUserExists(userid: number, classid: number) {
        return this.#db
            .query(
                `select chat_id, student_id
         from users
         where user_id = $1
           and class_id = $2;`,
                [userid, classid],
            )
            .then((data) => {
                if (!data.rows.length) {
                    return {
                        userExists: false,
                        chatid: 0,
                        studentid: 0,
                    };
                }
                return {
                    userExists: true,
                    chatid: data.rows[0].chat_id,
                    studentid: data.rows[0].student_id,
                };
            })
            .catch((error) => {
                postgresLogger.error('checkIfUserExists: ' + error);
                return undefined;
            });
    }

    async getExistingSlaveBot(chatid: number, userid: number) {
        return this.#db
            .query(
                `select bots.link
         from bots
                  INNER JOIN users ON users.bot_id = bots.id
         where users.user_id = $1
           and users.chat_id = $2;`,
                [userid, chatid],
            )
            .then((data) => {
                if (!data.rows.length) {
                    return '';
                }
                return data.rows[0].link;
            })
            .catch((error) => {
                postgresLogger.error('getExistingSlaveBot: ' + error);
                return undefined;
            });
    }

    async getCurrentSlaveBotsForUser(userid: number) {
        return this.#db
            .query(
                `select bots.id, bots.link
         from bots
                  INNER JOIN users ON users.bot_id = bots.id
         where users.user_id = $1;`,
                [userid],
            )
            .then((data) => {
                const elements = new Map<number, string>();
                if (!data.rows.length) {
                    return elements;
                }

                data.rows.forEach((element) => {
                    elements.set(element.id, element.link);
                });
                return elements;
            })
            .catch((error) => {
                postgresLogger.error('getCurrentSlaveBot: ' + error);
                return undefined;
            });
    }

    async getSlaveBotTokenAndUserIdByChatId(chatid: number) {
        return this.#db
            .query(
                `select users.user_id, bots.token
                 from bots
                          INNER JOIN users ON users.bot_id = bots.id
                 where users.chat_id = $1;`,
                [chatid],
            )
            .then((data) => {
                if (!data.rows.length) {
                    return null;
                }
                return {
                    botToken: data.rows[0].token,
                    telegramChatID: data.rows[0].user_id,
                };
            })
            .catch((error) => {
                postgresLogger.error(
                    'getSlaveBotTokenAndUserIdByChatId: ' + error,
                );
                return undefined;
            });
    }

    async getSlaveBotChatIdByUserIdAndToken(userid: number, token: string) {
        return this.#db
            .query(
                `select users.chat_id
                 from users INNER JOIN bots ON users.bot_id = bots.id
                 where users.user_id = $1 AND bots.token = $2;`,
                [userid, token],
            )
            .then((data) => {
                if (!data.rows.length) {
                    return null;
                }
                return data.rows[0].chat_id;
            })
            .catch((error) => {
                postgresLogger.error('getSlaveBotChatIdByUserId: ' + error);
                return undefined;
            });
    }

    async getSlaveBotClassIdByChatId(chatid: number) {
        return this.#db
            .query(
                `select class_id
                 from users where chat_id = $1;`,
                [chatid],
            )
            .then((data) => {
                if (!data.rows.length) {
                    return null;
                }
                return data.rows[0].class_id;
            })
            .catch((error) => {
                postgresLogger.error('getSlaveBotClassIdByChatId: ' + error);
                return undefined;
            });
    }

    async addUser(
        chatid: number,
        userid: number,
        studentid: number,
        classid: number,
        botid: number,
    ) {
        return this.#db
            .query(
                `insert into users
                     (chat_id, user_id, student_id, class_id, bot_id)
                 values ($1, $2, $3, $4, $5)
                 returning id;`,
                [chatid, userid, studentid, classid, botid],
            )
            .then((data) => {
                if (!data.rows.length) {
                    return undefined;
                }
                return data.rows[0].id;
            })
            .catch((error) => {
                postgresLogger.error('getCurrentSlaveBot: ' + error);
                return undefined;
            });
    }

    async unlinkBot(linkToBot: string) {
        return this.#db
            .query(
                `delete
                 from users U USING bots B
                 where U.bot_id = B.id and B.link = $1;`,
                [linkToBot],
            )
            .then((data) => {
                return data.rowCount;
            })
            .catch((error) => {
                postgresLogger.error('getSlaveBotChatIdByUserId: ' + error);
                return undefined;
            });
    }
}
