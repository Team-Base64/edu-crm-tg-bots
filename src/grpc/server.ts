// import { ProtoMessage } from '../../types/interfaces';
import Net from '../index';
// import {ProtoMessage} from '../../types/interfaces';
// const grpc = require('@grpc/grpc-js');
// const services = require('./proto/model_grpc_pb');
// import stream from './stream';
import client from './client';
import GRPCstream from './stream';
// import GRPCstream from './stream.ts';
// const messages = require('./proto/model_pb');

const tokens = [
    '1064016468:AAEaJJWW0Snm_sZsmQtgoEFbUTYj6pM60hk',
    '1290980811:AAEgopVWqb7o0I72cwdIGGZRsRyE0GGNkLA',
];

// @ts-ignores
const net = new Net(tokens, [0, 1]);

export default net;

// const client = new services.BotChatClient(
//     '127.0.0.1:8082',
//     grpc.credentials.createInsecure());

// const kickChannel = () => {
//     const state = channel.getConnectivityState(true);
//     channel.watchConnectivityState(state, Infinity, kickChannel);
//   }
//   kickChannel();

function main() {
    console.log('called main');
    const stream = new GRPCstream();

    stream.connect();
    // @ts-ignores
    // let client = new services.BotChatClient(

    // //@ts-ignores
    // const stream = client.startChatTG(function(error, newsStatus) {
    //     if (error) {
    //       console.error(error);
    //     }
    //     console.log('Stream success: ', newsStatus.success);
    //     client.close();
    //   });
    //   //let mes =  messages.chat.Message({chatID: 1, text:"hello client stream" })
    //   //const mes : services.Message =  {chatID: 1, text:"hello client stream" }
    //   //call.write(mes)
    // //call.write({text:"123", chatID:1})
    // var request = new messages.Message();
    // request.setText("foo");
    // request.setChatid(1);

    // stream.write(request);

    // stream.end();
    // console.log("stream end");
    // console.log(stream);

    try {
        // @ts-ignores
        //   const stream = client.startChatTG(function(error, newsStatus) {
        //   if (error) {
        //     console.error(error);
        //   }
        //   console.log('Stream success: ', newsStatus.success);
        //   client.close();
        // });
        //   //@ts-ignores
        //   stream.on('data',function(response){
        //         console.log(response);
        //         console.log("Message from backend: ", {text:response.array[0], chatID:response.array[1]});
        //         //net.sendMessageFromClient({text:response.array[0], chatID:response.array[1]})
        //       });
        //   stream.on('end',function(){
        //       console.log('End grpc stream');

        //      // channel.watchConnectivityState(state, Infinity, () => {console.log("4!!", state)})
        // });
        // //@ts-ignores
        // stream.on('error',function(e){
        //   console.log('Error', e);
        //   console.log("state22 ", state);
        //   //channel.watchConnectivityState(state, Infinity, () => {console.log("3!!", state)})
        // });

        const channel = client.getChannel();
        const state = channel.getConnectivityState(false);
        console.log('state ', state);
        channel.watchConnectivityState(2, Infinity, () => {
            console.log('state ready change', state);
            if (channel.getConnectivityState(false) === 3) {
                stream.connect();
            }
        });

        // channel.watchConnectivityState(2, Infinity, () => {console.log("2!!", state)})
        // let mes =  messages.chat.Message({chatID: 1, text:"hello client stream" })
        // const mes : services.Message =  {chatID: 1, text:"hello client stream" }
        // call.write(mes)
        // call.write({text:"123", chatID:1})

        // var request = new messages.Message();
        // request.setText("foo1");
        // request.setChatid(1);

        // stream.write(request);

        // stream.write(request);
        // stream.write(request);
        // setInterval(() => {console.log(channel.getConnectivityState(false))}, 5000)
    } catch (e) {
        console.log(e);
        // setInterval(() => {console.log("123")}, 5000)
    } finally {
        setInterval(() => {
            console.log('state from setInt: ', client.getChannel().getConnectivityState(false));
        }, 5000);
    }
    // channel.watchConnectivityState(channel.getConnectivityState(true), Infinity, () => {console.log("!!", channel.getConnectivityState(true))})
    // stream.end();
    // console.log("stream end");

    // console.log(stream);


    // let employeeIdList = [1, 10, 2];
    // _.each(employeeIdList, function (employeeId) {
    //       call.write({ id: employeeId });
    // })
    // console.log(net)
    // call.end();

    return stream;
}

// @ts-ignore
// const intervalID = setInterval(main, 2500);
export const streamInstance = main();

