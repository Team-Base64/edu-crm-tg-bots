import Net from '../slaveBot';
import client from './client';
import GRPCstream from './stream';
import { logger } from '../utils/logger';

const tokens = [
    '1064016468:AAEaJJWW0Snm_sZsmQtgoEFbUTYj6pM60hk',
    '1290980811:AAEgopVWqb7o0I72cwdIGGZRsRyE0GGNkLA',
];

const net = new Net(tokens, [0, 1]);

export default net;
const run = () => {
    logger.info('called main');
    const stream = new GRPCstream();

    stream.connect();

    try {
        const channel = client.getChannel();
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

export const streamInstance = run();
