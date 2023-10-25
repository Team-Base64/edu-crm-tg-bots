const grpc = require('@grpc/grpc-js');
const services = require('./proto/model_grpc_pb');

const client = new services.BotChatClient(
    'chat:8082',
    grpc.credentials.createInsecure(),
);

export default client;
