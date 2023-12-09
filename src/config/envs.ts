import 'dotenv/config';
import { RuntimeError } from '../utils/logger';

function getEnvVariable(key: string): string {
    const value = process.env[key];

    if (value === undefined) {
        RuntimeError(`Environment variable ${key} is not set.`);
    }

    return value;
}

export const MASTER_BOT_TOKEN = getEnvVariable('MASTER_BOT_TOKEN');
export const PINO_LOG_LEVEL = getEnvVariable('PINO_LOG_LEVEL');
export const CLIENT_HOST_TG_BOT = getEnvVariable('CLIENT_HOST_TG_BOT');
export const POSTGRES_USER = getEnvVariable('POSTGRES_USER');
export const POSTGRES_HOST = getEnvVariable('POSTGRES_HOST');
export const POSTGRES_PASSWORD = getEnvVariable('POSTGRES_PASSWORD');
export const POSTGRES_PORT = getEnvVariable('POSTGRES_PORT');
export const POSTGRES_DB = getEnvVariable('POSTGRES_DB');
