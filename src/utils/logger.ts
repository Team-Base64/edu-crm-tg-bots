const pino = require('pino');
export const logger = pino({
    transport: {
        target: 'pino-pretty',
    },
    level: process.env.PINO_LOG_LEVEL || 'info',
});
