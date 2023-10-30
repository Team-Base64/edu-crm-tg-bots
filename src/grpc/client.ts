import {ServiceClient} from '@grpc/grpc-js/build/src/make-client';

const grpc = require('@grpc/grpc-js');
const services = require('./proto/model_grpc_pb');

let client: ServiceClient;
const getConnect = () => {
    console.log(grpc.status);
    if (grpc.status !== grpc.status.OK) {
        client.close();
        client = new services.BotChatClient(
            'chat:8082',
            grpc.credentials.createInsecure(),
        );
        client.waitForReady(5000, (() => console.log('lol')));
    }
    return client;
};

export default getConnect;
