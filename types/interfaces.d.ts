import { Update } from '@telegraf/types';
import { Context, Scenes } from 'telegraf';

export type SendMessageTo = {
    botToken: string;
    telegramChatID: number;
};

export interface ProtoMessageBase {
    chatid: number;
    text: string;
}

export interface ProtoMessageRecieve extends ProtoMessageBase {
    attachList: string[];
}

export interface ProtoAttach {
    mimeType: string;
    fileLink: string;
}

export interface ProtoMessageSend extends ProtoMessageBase {
    attachList: ProtoAttach[];
}

export interface ProtoSolutionData {
    text: string;
    attachList: ProtoAttach[];
}

export interface ProtoSolution {
    data: ProtoSolutionData;
    homeworkID: number;
    studentID: number;
}

export interface CustomContext extends Context<Update> {
    scene: Scenes.SceneContextScene<CustomContext, Scenes.WizardSessionData>;
    wizard: Scenes.WizardContextWizard<CustomContext> & {
        state: {
            homeworks: Homework[];
            targetHomeworkID: number;
            curretSolution: {
                text: string;
                rawAttachList: RawFile[];
                isWaitGroup: boolean;
            };
        };
    };
    educrm: {
        chatID: number;
        studentID: number;
        classID: number;
    };

}

export interface Task {
    description: string;
    attachmenturlsList: string[];
}

export interface Homework {
    homeworkid: number;
    title: string;
    description: string;
    createDate: Date;
    deadlineDate: Date;
    tasks: Task[];
}

export interface RawFile {
    fileID: string;
    fileName?: string;
    mimeType?: string;
};

export interface Event {
    title: string;
    description: string;
    startDate: string;
    endDate: string;
};
