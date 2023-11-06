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
        if (token === '12345679') return { isvalid: true, classid: 2 };
        if (token === '12345678') return { isvalid: true, classid: 3 };
        if (token === '12345670') return { isvalid: true, classid: 4 };
        return { isvalid: true, classid: 1 };
    }

    /**
     *
     * @returns chatid
     * */
    createChat(studentid: number, classid: number) {
        if (classid === 2) return 2;
        if (classid === 3) return 3;
        if (classid === 4) return 4;
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
