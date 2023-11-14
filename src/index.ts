import { getStream } from './grpc/server';
import { Store } from './repository/store';
import postgresConfig from './repository/config';
import NetSlaveBot from './slaveBot/netSlaveBot';
import { NetMasterBot } from './masterBot/netMasterBot';
require('dotenv').config();

export const masterBotTokenLength = 8;

// time in seconds
export const streamReconnectTimeout = 1;

export const dbInstance = new Store(postgresConfig);

export const netSlaveBotInstance = new NetSlaveBot();

const masterBotToken = process.env.MASTER_BOT_TOKEN as string;

export const netMasterBotInstance = new NetMasterBot(masterBotToken);

export const streamInstance = getStream();
