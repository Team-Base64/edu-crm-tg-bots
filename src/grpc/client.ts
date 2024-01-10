import { credentials } from '@grpc/grpc-js';
import { CLIENT_HOST_TG_BOT } from '../config/envs';
import { ChatClient } from './proto/model_grpc_pb';

const client = new ChatClient(
    CLIENT_HOST_TG_BOT,
    credentials.createInsecure(),
);

export default client;
