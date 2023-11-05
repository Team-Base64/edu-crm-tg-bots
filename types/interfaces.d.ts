export interface ProtoMessage {
    chatID: number,
    text: string,
    time?: number
}

export interface ProtoAttachMessage extends ProtoMessage{
    // file: Blob,
    mimetype: string
    fileLink: string
}
