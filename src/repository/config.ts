import { ClientConfig } from 'pg';

const postgresConfig: ClientConfig = {
    user: 'spuser',
    host: 'db',
    password: 'newpwd',
    port: 5432,
    database: 'tgBotsDb',
};

export default postgresConfig;
