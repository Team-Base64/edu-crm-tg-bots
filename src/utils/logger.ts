const pino = require('pino');
require('dotenv').config();
export const logger = pino({
    transport: {
        target: 'pino-pretty',
    },
    // level: process.env.PINO_LOG_LEVEL || 'info',
    level: process.env.PINO_LOG_LEVEL || 'trace',
});
