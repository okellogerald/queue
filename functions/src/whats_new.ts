import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { QueryDocumentSnapshot } from "firebase-functions/v1/firestore";
import { sendMessage, sendTestMessages, TokenMessageArguments } from "./common";
import { DataSnapshot } from "firebase-admin/database";
/* eslint-disable  @typescript-eslint/no-explicit-any */

const handler = async (snapshot: QueryDocumentSnapshot) => {
    const { id, createdAt, position, type } = snapshot.data();

    try {
        const item = await _getItemFrom(id, type);
        let topic: Topic;
        if (type == "topic") {
            topic = await _getTopicFrom(id);
        } else {
            topic = await _getTopicFrom(item["topicID"]);
        }

        const category = await _getCategoryFrom(topic["categoryID"]);
        const description = _getDescription(type == "topic" ? topic : item, type, topic.topicName, category.name,);

        const args: TokenArgumentsWithWhatsNew = {
            title: _getTitleFromType(type, item),
            message: description,
            type: "whats_new",
            item: {
                createdAt: createdAt,
                id: id,
                position: position,
                type: type,
                topic: topic,
                category: category,
                book: type == "book" ? item : null,
                recode: type == "recode" ? item : null,
                decode: type == "decode" ? item : null,
                stone: type == "stone" ? item : null,
            },
        }

        const result = await sendMessage(args, args.item, createdAt);
        functions.logger.log(`${result}`);
    } catch (error) {
        functions.logger.log(`error: ${error}`);
    }
}

export const testHandler = async (snapshot: QueryDocumentSnapshot) => {
    const { id, createdAt, position, type } = snapshot.data();

    try {
        const item = await _getItemFrom(id, type);
        let topic: Topic;
        if (type == "topic") {
            topic = await _getTopicFrom(id);
        } else {
            topic = await _getTopicFrom(item["topicID"]);
        }

        const category = await _getCategoryFrom(topic["categoryID"]);
        const description = _getDescription(type == "topic" ? topic : item, type, topic.topicName, category.name,);

        const args: TokenArgumentsWithWhatsNew = {
            title: _getTitleFromType(type, item),
            message: description,
            type: "whats_new",
            item: {
                createdAt: createdAt,
                id: id,
                position: position,
                type: type,
                topic: topic,
                category: category,
                book: type == "book" ? item : null,
                recode: type == "recode" ? item : null,
                decode: type == "decode" ? item : null,
                stone: type == "stone" ? item : null,
            },
        }

        const result = await sendTestMessages(args, args.item, createdAt);
        functions.logger.log(`${result}`);
    } catch (error) {
        functions.logger.log(`error: ${error}`);
    }
}

const _getTitleFromType = (type: string, item: any): string => {
    if (type == "recode") {
        return "Don’t Miss This Affirmation";
    }
    if (type == "topic") {
        return "Just In: New Topic";
    }
    if (type == "decode") {
        const isVideo = ((item["decodeVideo"] ?? "") as string).trim().length !== 0;
        if (isVideo) return "Just Dropped: New Expert Video";
        return "Listen Up: New Audio!";
    }
    if (type == "stone") {
        return "New Product Just for You!";
    }
    if (type == "book") {
        return "Discover Today’s New Book";
    }
    throw Error("Unknown type!!!");
}

const _getItemFrom = async (id: string, type: string): Promise<any> => {
    if (type == "recode") {
        return await _getRecodeFrom(id);
    }
    if (type == "decode") {
        return await _getDecodeFrom(id);
    }
    if (type == "book") {
        return await _getBookFrom(id);
    }
    if (type == "stone") {
        return await _getStoneFrom(id);
    }
}

const _getRecodeFrom = async (id: string): Promise<Recode> => {
    const result = await admin.database().ref("recode").child(id).get();
    return _copyValueWithKey(result);
}

const _getBookFrom = async (id: string): Promise<Book> => {
    const result = await admin.database().ref("books").child(id).get();
    return _copyValueWithKey(result);
}

const _getStoneFrom = async (id: string): Promise<Stone> => {
    const result = await admin.database().ref("energy").child(id).get();
    return _copyValueWithKey(result);
}

const _getDecodeFrom = async (id: string): Promise<Decode> => {
    const result = await admin.database().ref("decodingProblems").child(id).get();
    return _copyValueWithKey(result);
}

const _getTopicFrom = async (id: string): Promise<Topic> => {
    const result = await admin.database().ref("topics").child(id).get();
    return _copyValueWithKey(result);
}

const _getCategoryFrom = async (id: string): Promise<Category> => {
    const result = await admin.database().ref("Categories").child(id).get();
    return _copyValueWithKey(result);
}

const _copyValueWithKey = (result: DataSnapshot) => {
    const value = result.val();
    value.key = result.key;
    return value;
}

const _getDescription = (item: any, type: string, topicName: string, categoryName: string) => {
    if (type == "recode") {
        return `${categoryName} - ${topicName}`;
    }
    if (type == "topic") {
        return `${categoryName} - ${topicName}`;
    }
    if (type == "decode") {
        const expert = item["decodingTitle"];
        const isVideo = ((item["decodeVideo"] ?? "") as string).trim().length !== 0;
        if (isVideo) return `Hear What ${expert} Has To Say`;
        return `${categoryName} - ${topicName}`;
    }
    if (type == "stone") {
        return item["stoneName"];
    }
    if (type == "book") {
        return item["bookName"];
    }
}

interface TokenArgumentsWithWhatsNew extends TokenMessageArguments {
    item: WhatsNew,
}

interface WhatsNew {
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

interface Topic {
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

interface Category {
    key: string,
    categoryColor: string,
    categoryIcon: string,
    categoryPosition: string,
    category_image: string,
    name: string,
    status: string,
}

interface Book {
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

interface Stone {
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

interface Recode {
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

interface Decode {
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


export { handler }
