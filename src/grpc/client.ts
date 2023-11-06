const grpc = require('@grpc/grpc-js');
const services = require('./proto/model_grpc_pb');

export const getClient = () => {
    return new services.BotChatClient(
        '127.0.0.1:8082',
        grpc.credentials.createInsecure(),
    );
};
