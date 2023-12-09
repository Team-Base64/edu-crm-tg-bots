import {credentials} from '@grpc/grpc-js';
import {BotChatClient} from './proto/model_grpc_pb';
import { CLIENT_HOST_TG_BOT } from '../config/envs';

const client = new BotChatClient(
    CLIENT_HOST_TG_BOT,
    credentials.createInsecure(),
);

export default client;
