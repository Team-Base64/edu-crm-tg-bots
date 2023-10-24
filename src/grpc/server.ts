//import { ProtoMessage } from '../../types/interfaces';
import Net from '../index';
//import {ProtoMessage} from '../../types/interfaces';
// const grpc = require('@grpc/grpc-js');
// const services = require('./proto/model_grpc_pb');
// const messages = require('./proto/model_pb');

const tokens = [
    '1064016468:AAEaJJWW0Snm_sZsmQtgoEFbUTYj6pM60hk',
    '1290980811:AAEgopVWqb7o0I72cwdIGGZRsRyE0GGNkLA',
];

//@ts-ignores
const net = new Net(tokens, [0, 1]);

export default net

// function main() {
//     //@ts-ignores
//     //let client = new services.BotChatClient(
//     let client = new services.BotChatClient(
//         '127.0.0.1:8082',
//         grpc.credentials.createInsecure());
//     //@ts-ignores
//     const call = client.startChat(function(error, newsStatus) {
//         if (error) {
//           console.error(error);
//         }
//         console.log('Stream success: ', newsStatus.success);
//         client.close();
//       });
//       //let mes =  messages.chat.Message({chatID: 1, text:"hello client stream" })  
//       //const mes : services.Message =  {chatID: 1, text:"hello client stream" }  
//       //call.write(mes)
//     //call.write({text:"123", chatID:1})
//     var request = new messages.Message();                                                                                                                                                             
//     request.setText("foo");      
//     request.setChatid(1);                                                                                                                                                                                  

//     call.write(request);   
    
//     call.end();
//     // let employeeIdList = [1, 10, 2];
//     // _.each(employeeIdList, function (employeeId) {
//     //       call.write({ id: employeeId });
//     // })
//   //console.log(net)
//     //call.end();
//   }
  
//   main();
