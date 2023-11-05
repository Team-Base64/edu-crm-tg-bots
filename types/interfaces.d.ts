export interface ProtoMessage {
    chatID: number,
    text: string,
    time?: number
}

export interface ProtoAttachMessage extends ProtoMessage{
    file: File,
    mimeType: string
}
