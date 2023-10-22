import {Context} from 'telegraf';
import {Message} from '@telegraf/types';

export interface ProtoMessage {
    chatID: number,
    text: string,
    time?: number
}

export interface updateContext extends Context {
    message: (New & NonChannel & TextMessage & Message) | undefined,
}
