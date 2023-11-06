import { Context } from 'telegraf';
import { Message, Update } from '@telegraf/types';
import NonChannel = Update.NonChannel;
import New = Update.New;
import TextMessage = Message.TextMessage;
import DocumentMessage = Message.DocumentMessage;
import PhotoMessage = Message.PhotoMessage;

export interface ProtoMessage {
    chatid: number;
    text: string;
    time?: number;
}

export interface ProtoAttachMessage extends ProtoMessage {
    mimetype: string;
    fileLink: string;
}

export interface updateContext extends Context {
    message:
        | (New &
              NonChannel &
              TextMessage &
              Message &
              DocumentMessage &
              PhotoMessage)
        | undefined;
}
