import { ClientConfig } from 'pg';
require('dotenv').config();

const postgresConfig: ClientConfig = {
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    password: process.env.POSTGRES_PASSWORD,
    port: Number(process.env.POSTGRES_PORT),
    database: process.env.POSTGRES_DB,
};

console.log('postgresConfig:', postgresConfig);

export default postgresConfig;
