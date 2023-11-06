import MasterBot from './masterBot';

export class NetMasterBot {
    masterBot: MasterBot;

    constructor(masterBotToken: string) {
        this.masterBot = new MasterBot(
            masterBotToken,
            this.verifyToken,
            this.createChat,
            this.register,
        );
        this.masterBot.launchBot();
    }

    /**
     *
     * @returns isvalid, classid
     * */
    verifyToken(token: string) {
        return { isvalid: true, classid: 1 };
    }

    /**
     *
     * @returns chatid
     * */
    createChat(studentid: number, classid: number) {
        return 1;
    }

    /**
     *
     * @returns studentid
     * */
    register(name: string, avatar: string) {
        return 1;
    }
}
