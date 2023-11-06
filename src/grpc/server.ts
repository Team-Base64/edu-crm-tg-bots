import GRPCstream from './stream';
import { logger } from '../utils/logger';
import client from './client';

export const getStream = () => {
    logger.info('starting stream');
    const stream = new GRPCstream();

    stream.connect();

    try {
        const channel = client.getChannel();
        const state = channel.getConnectivityState(false);
        logger.info('starting channel with state: ', state);
        channel.watchConnectivityState(2, Infinity, () => {
            logger.info('state ready change', state);
            if (channel.getConnectivityState(false) === 3) {
                stream.connect();
            }
        });
    } catch (error) {
        logger.fatal(error);
    } finally {
        // setInterval(() => {
        //     logger.trace('state from setInt: ', client.getChannel().getConnectivityState(false));
        // }, 5000);
    }

    return stream;
};
