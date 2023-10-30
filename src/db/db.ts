import {createClient} from 'redis';
import {logger} from '../utils/logger';

class Database {
    client;
    constructor() {
        this.client = createClient();
        this.client.on('error',
            (err) => logger.fatal('Redis Client Error: '+ err),
        );

        this.connect();

        process.once('SIGINT', () => this.client.quit());
        process.once('SIGTERM', () => this.client.quit());
    }
    connect() {
        this.client.connect().
            catch((error) => logger.fatal('db connect: '+ error));
    }

    setValue(key: string, value: string) {
        this.client.set(key, value).
            catch((error) => logger.fatal('db set: '+ error));
    }

    getValue(key: string) {
        return this.client.get(key).then(((value) => value)).
            catch((error) => logger.fatal('db get: '+ error));
    }

    setObject(key: string, value: any) {
        this.client.hSet(key, value).
            catch((error) => logger.fatal('db hSet: '+ error));
    }

    getObject(key: unknown) {
        return this.client.hGet(key).then(((value) => value)).
            catch((error) => logger.fatal('db hGet: '+ error));
    }
}

const db = new Database();

db.setObject('try', {ind: 1, lol: '123'});

logger.trace(db.getObject('try'));


