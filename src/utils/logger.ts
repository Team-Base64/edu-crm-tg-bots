import pino from 'pino';
import { exit } from 'process';
// import { PINO_LOG_LEVEL } from '../config/envs';

export const logger = pino({
    transport: {
        target: 'pino-pretty',
    },
    level: 'trace',
});

export const RuntimeError: (message: string) => never = (
    msg: string,
): never => {
    logger.fatal(msg);
    exit(1);
};
