import { ClientConfig } from 'pg';
import {
    POSTGRES_DB,
    POSTGRES_HOST,
    POSTGRES_PASSWORD,
    POSTGRES_PORT,
    POSTGRES_USER,
} from '../config/envs';

const postgresConfig: ClientConfig = {
    user: POSTGRES_USER,
    host: POSTGRES_HOST,
    password: POSTGRES_PASSWORD,
    port: Number(POSTGRES_PORT),
    database: POSTGRES_DB,
};

console.log('postgresConfig:', postgresConfig);

export default postgresConfig;
