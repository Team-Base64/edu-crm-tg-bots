import { getStream } from './grpc/server';
import { Store } from './repository/store';
import postgresConfig from './repository/config';
import NetSlaveBot from './slaveBot/netSlaveBot';
import { NetMasterBot } from './masterBot/netMasterBot';

export const dbInstance = new Store(postgresConfig);

export const masterBotTokenLength = 8;

const slaveTokens = [
    '1064016468:AAEaJJWW0Snm_sZsmQtgoEFbUTYj6pM60hk',
    '1290980811:AAEgopVWqb7o0I72cwdIGGZRsRyE0GGNkLA',
];
export const netSlaveBotInstance = new NetSlaveBot(slaveTokens, [0, 1]);

const masterBotToken = '6881067197:AAHLj70waoWo5PnS009QYyy8U3ka9SuZhWg';

export const netMasterBotInstance = new NetMasterBot(masterBotToken);

export const streamInstance = getStream();
