/* eslint-disable  @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion*/

export interface TokenMessageArguments {
    title: string,
    message: string,
    type: string,
    collapseID: string,
}

export interface DownloadItem {
    key: string,
    dailyAudio: string,
    dailyColor: string,
    description: string,
    dailyThumbnail: string,
    plain_description: string,
    dailyVideo: string,
    postedOn: number,
    posted?: boolean,
    hours: string,
    minute: string,
    second: string,
}

export interface DownloadItemNotification extends TokenMessageArguments {
    item: DownloadItem,
    id: string,
}

export interface WhatsNewNotification extends TokenMessageArguments {
    item: WhatsNew,
    id: string,
}

export type Notification = WhatsNewNotification | DownloadItemNotification;

export interface WhatsNew {
    id: string,
    createdAt: string,
    position: number,
    type: string,
    topic: Topic,
    category: Category,
    book?: Book,
    recode?: Recode,
    decode?: Decode,
    stone?: Stone,
}

export interface Topic {
    key: string,
    categoryID: string,
    created_at: string,
    overdue: string,
    read: boolean,
    status: string,
    topicColor: string,
    topicIcon: string,
    topicName: string,
    topicPosition: string
}

export interface Category {
    key: string,
    categoryColor: string,
    categoryIcon: string,
    categoryPosition: string,
    category_image: string,
    name: string,
    status: string,
}

export interface Book {
    key: string,
    authorName: string,
    bookColor: string,
    bookName: string,
    bookUrl: string,
    bookUrliOS: string,
    bookpicture: string,
    categoryID: string,
    status: string,
    topicID: string,
}

export interface Stone {
    key: string,
    categoryID: string,
    status: string,
    stoneColor: string,
    stoneDescription: string,
    stoneIMage: string,
    stoneName: string,
    stoneURL: string,
    topicID: string,
}

export interface Recode {
    key: string,
    categoryID: string,
    recodeAudio: string,
    recodeAudioSecond: string,
    recodeColor: string,
    recodeDescription: string,
    recodeSecondDescription: string,
    secondColor: string,
    status: string,
    topicID: string
}

export interface Decode {
    key: string,
    categoryID: string,
    decodeAudio: string,
    decodeVideo: string,
    decodecolor: string,
    decodethumbnail: string,
    decodingName: string,
    decodingTitle: string,
    hours: string,
    minute: string,
    second: string,
    status: string,
    topicID: string
}

export interface PayloadArguments {
    token: string;
    title: string;
    message: string;
    type: string;
    badge: number;
    item: any;
    collapseID: string;
}

export interface Device {
    badge: number;
    token: string;
    id: string;
    notifications?: Array<string>;
}
