import { logger } from './logger';

type ExitHandler = (...args: any) => unknown;

const handlers: ExitHandler[] = [];
const timeout = 5000; // 5 sec

const wrapper = async () => {
    setTimeout(() => {
        logger.info('Exitted by timeout');
        process.exit(0);
    }, timeout);

    for (const h of handlers) {
        await h();
    }

    logger.info('Exitted normally');
    process.exit(0);
};

[
    'SIGHUP',
    'SIGINT',
    'SIGQUIT',
    'SIGILL',
    'SIGTRAP',
    'SIGABRT',
    'SIGBUS',
    'SIGFPE',
    'SIGUSR1',
    'SIGSEGV',
    'SIGUSR2',
    'SIGTERM',
    'exit',
].forEach((signal) => {
    process.on(signal, wrapper);
});

export const gracefulStop = (handler: ExitHandler) => {
    handlers.push(handler);
};
