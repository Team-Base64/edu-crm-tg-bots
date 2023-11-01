import client from './client';
import net from './server';

class GRPCstream {
    #stream: any;

    constructor() {
    }

    get self() {
        return this.#stream;
    }

    connect() {
        // @ts-ignores
        this.#stream = client.startChatTG((error, newsStatus) => {
            if (error) {
                console.error(error);
            }
            console.log('Stream success: ', newsStatus.success);
            client.close();
        });
        // @ts-ignores
        this.#stream.on('data', (response) => {
            // console.log(response);
            console.log('Message from backend: ', {text: response.array[0], chatID: response.array[1]});
            net.sendMessageFromClient({text: response.array[0], chatID: response.array[1]});
        });
        this.#stream.on('end', () => {
            console.log('End grpc stream');
            // this.#stream.();
            setTimeout(() => this.connect(), 1000);
            // this.connect();
        });
        // @ts-ignores
        this.#stream.on('error', (e) => {
            console.log('Error catch, stream:  ', e);
            // console.log("state22 ", state);
            // channel.watchConnectivityState(state, Infinity, () => {console.log("3!!", state)})
        });
    }
}

export default GRPCstream;
