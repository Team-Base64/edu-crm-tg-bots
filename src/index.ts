import { getStream } from './grpc/server';
import { Store } from './repository/store';
import postgresConfig from './repository/config';
import NetSlaveBot from './slaveBot/netSlaveBot';
import { NetMasterBot } from './masterBot/netMasterBot';
import { MASTER_BOT_TOKEN } from './config/envs';

export const masterBotTokenLength = 8;

// time in seconds
export const streamReconnectTimeout = 1;
export const dbInstance = new Store(postgresConfig);
export const netSlaveBotInstance = new NetSlaveBot();
export const netMasterBotInstance = new NetMasterBot(MASTER_BOT_TOKEN);
export const streamInstance = getStream();
