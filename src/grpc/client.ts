const grpc = require('@grpc/grpc-js');
const services = require('./proto/model_grpc_pb');
require('dotenv').config();

const client = new services.BotChatClient(
    process.env.CLIENT_HOST_TG_BOT,
    //`host.docker.internal:8082`,
    grpc.credentials.createInsecure(),
);

export default client;
