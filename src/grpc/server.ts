//import { ProtoMessage } from '../../types/interfaces';
import Net from '../index';
//import {ProtoMessage} from '../../types/interfaces';
const grpc = require('@grpc/grpc-js');
const services = require('./proto/model_grpc_pb');
var messages = require('./proto/model_pb');

// const server = new grpc.Server();

// // const Recieve = (
// //     call : {request: ProtoMessage},
// //     callback: (status: unknown, response: {isSuccessful: boolean}) => void,
// // ) => {
// //     console.log(new Date(), call.request);
// //     net.sendMessageFromClient(call.request);
// //     callback(null, {isSuccessful: true});
// // };

// const StartChat = () => {console.log(new Date(), net);};

// //server.addService(services.BotChatService, {Recieve: Recieve});
// server.addService(services.BotChatService, {StartChat: StartChat});

// server.bindAsync(
//     '127.0.0.1:5001',
//     grpc.ServerCredentials.createInsecure(),
//     (error: unknown, port:number) => {
//         console.log(`Server running at ${port}`);
//         console.log('error: ', error);
//         server.start();
//     },
// );


const tokens = [
    '1064016468:AAEaJJWW0Snm_sZsmQtgoEFbUTYj6pM60hk',
    '1290980811:AAEgopVWqb7o0I72cwdIGGZRsRyE0GGNkLA',
];

//@ts-ignores
const net = new Net(tokens, [0, 1]);


function main() {
    //@ts-ignores
    //let client = new services.BotChatClient(
    let client = new services.BotChatClient(
        '127.0.0.1:8082',
        grpc.credentials.createInsecure());
    //@ts-ignores
    const call = client.startChat(function(error, newsStatus) {
        if (error) {
          console.error(error);
        }
        console.log('Stream success: ', newsStatus.success);
        client.close();
      });
      //let mes =  messages.chat.Message({chatID: 1, text:"hello client stream" })  
      //const mes : services.Message =  {chatID: 1, text:"hello client stream" }  
      //call.write(mes)
    //call.write({text:"123", chatID:1})
    var request = new messages.Message();                                                                                                                                                             
    request.setText("foo");      
    request.setChatid(1);                                                                                                                                                                                  

    call.write(request);   
    
    call.end();
    // let employeeIdList = [1, 10, 2];
    // _.each(employeeIdList, function (employeeId) {
    //       call.write({ id: employeeId });
    // })
  //console.log(net)
    //call.end();
  }
  
  main();


// import Net from '../index';
// //import {ProtoMessage} from '../../types/interfaces';
// const grpc = require('@grpc/grpc-js');
// //const services = require('./proto/model_grpc_pb');

// const PROTO_PATH = __dirname + './proto/model.proto';

// //var grpc = require('@grpc/grpc-js');
// const protoLoader = require('@grpc/proto-loader');
// const packageDefinition = protoLoader.loadSync(
//     PROTO_PATH,
//     {keepCase: true,
//      longs: String,
//      enums: String,
//      defaults: true,
//      oneofs: true
//     });

// const chat_proto = grpc.loadPackageDefinition(packageDefinition).chat;
// const server = new grpc.Server();

// // const Recieve = (
// //     call : {request: ProtoMessage},
// //     callback: (status: unknown, response: {isSuccessful: boolean}) => void,
// // ) => {
// //     console.log(new Date(), call.request);
// //     net.sendMessageFromClient(call.request);
// //     callback(null, {isSuccessful: true});
// // };

// const StartChat = () => {console.log(new Date(), net);};

// //server.addService(services.BotChatService, {Recieve: Recieve});
// server.addService(chat_proto.BotChat.BotChatService, {StartChat: StartChat});

// server.bindAsync(
//     '127.0.0.1:5001',
//     grpc.ServerCredentials.createInsecure(),
//     (error: unknown, port:number) => {
//         console.log(`Server running at ${port}`);
//         console.log('error: ', error);
//         server.start();
//     },
// );

// const tokens = [
//     '1064016468:AAEaJJWW0Snm_sZsmQtgoEFbUTYj6pM60hk',
//     '1290980811:AAEgopVWqb7o0I72cwdIGGZRsRyE0GGNkLA',
// ];

// const net = new Net(tokens, [0, 1]);