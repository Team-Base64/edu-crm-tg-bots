import Net from '../index';
import {ProtoMessage} from '../../types/interfaces';
const grpc = require('@grpc/grpc-js');
const services = require('./proto/model_grpc_pb');

const server = new grpc.Server();

const Recieve = (
    call : {request: ProtoMessage},
    callback: (status: unknown, response: {isSuccessful: boolean}) => void,
) => {
    console.log(new Date(), call.request);
    net.sendMessageFromClient(call.request);
    callback(null, {isSuccessful: true});
};

server.addService(services.BotChatService, {Recieve: Recieve});

server.bindAsync(
    '127.0.0.1:50051',
    grpc.ServerCredentials.createInsecure(),
    (error: unknown, port:number) => {
        console.log(`Server running at ${port}`);
        console.log('error: ', error);
        server.start();
    },
);

const tokens = [
    '1064016468:AAEaJJWW0Snm_sZsmQtgoEFbUTYj6pM60hk',
    '1290980811:AAEgopVWqb7o0I72cwdIGGZRsRyE0GGNkLA',
];

const net = new Net(tokens, [0, 1]);
