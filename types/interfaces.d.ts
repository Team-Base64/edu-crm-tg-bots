export interface ProtoMessage {
    chatid: number;
    text: string;
    time?: number;
}

export interface ProtoAttachMessage extends ProtoMessage {
    mimetype: string;
    fileLink: string;
}
