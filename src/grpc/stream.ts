import client from './client';
//@ts-ignores
const stream = client.startChat(function(error, newsStatus) {
    if (error) {
      console.error(error);
    }
    console.log('Stream success: ', newsStatus.success);
  });

export default stream;