import { Update } from '@telegraf/types';
import { Context, Scenes } from 'telegraf';

export interface ProtoMessage {
    chatid: number;
    text: string;
    time?: number;
}

export interface ProtoAttachMessage extends ProtoMessage {
    mimetype: string;
    fileLink: string;
}

export interface ProtoSolutionData {
    text: string;
    attachList: {
        mimetype: string;
        fileLink: string;
    }[];
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
            waitSolution: boolean;
        };
    };
    educrm: {
        chatID: number;
        studentID: number;
    };
}

export interface Homework {
    homeworkid: number;
    title: string;
    description: string;
    attachmenturlsList: string[];
};

export type SendMessageTo = { botToken: string; telegramChatID: number; };
