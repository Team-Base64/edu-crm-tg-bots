const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const PROTO_PATH = 'proto/model.proto';

const options = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
};

const packageDefinition = protoLoader.loadSync(PROTO_PATH, options);
const MessageProto = grpc.loadPackageDefinition(packageDefinition).chat;

const client = new MessageProto.BotChat(
    '127.0.0.1:8081',
    grpc.credentials.createInsecure(),
);
export default client;
