import getConnect from './client';
import net from './server';
import {logger} from '../utils/logger';

const getStream = () => {
    const client = getConnect();

    // @ts-ignores
    const stream = client.startChatTG(function(error, newsStatus) {
        if (error) {
            logger.error(error);
        }
        logger.info('Stream success: ', newsStatus.success);
        client.close();
    });
    // @ts-ignores
    stream.on('data', function(response) {
        // console.log(response);
        logger.info({text: response.array[0], chatID: response.array[1]});
        net.sendMessageFromClient({text: response.array[0], chatID: response.array[1]});
    });
    stream.on('end', function() {
        logger.info('End grpc stream');
    });

    return stream;
};


export default getStream;
