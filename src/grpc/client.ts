const grpc = require('@grpc/grpc-js');
const services = require('./proto/model_grpc_pb');
require('dotenv').config();

const client = new services.BotChatClient(
    //'127.0.0.1:8082',
    process.env.CLIENT_HOST_TG_BOT,
    grpc.credentials.createInsecure(),
);

export default client;
