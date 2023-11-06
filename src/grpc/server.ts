import GRPCstream from './stream';
import { logger } from '../utils/logger';
import { clientInstance } from '../index';

export const getStream = () => {
    logger.info('called main');
    const stream = new GRPCstream();

    // stream.connect();

    try {
        const channel = clientInstance.getChannel();
        const state = channel.getConnectivityState(false);
        logger.info('state ', state);
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
