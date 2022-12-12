"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.testHandler = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const common_1 = require("./common");
/* eslint-disable  @typescript-eslint/no-explicit-any */
const handler = async (snapshot) => {
    const { id, createdAt, position, type } = snapshot.data();
    try {
        const item = await _getItemFrom(id, type);
        let topic;
        if (type == "topic") {
            topic = await _getTopicFrom(id);
        }
        else {
            topic = await _getTopicFrom(item["topicID"]);
        }
        const category = await _getCategoryFrom(topic["categoryID"]);
        const description = _getDescription(type == "topic" ? topic : item, type, topic.topicName, category.name);
        const args = {
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
        };
        const result = await (0, common_1.sendMessage)(args, args.item, createdAt);
        functions.logger.log(`${result}`);
    }
    catch (error) {
        functions.logger.log(`error: ${error}`);
    }
};
exports.handler = handler;
const testHandler = async (snapshot) => {
    const { id, createdAt, position, type } = snapshot.data();
    try {
        const item = await _getItemFrom(id, type);
        let topic;
        if (type == "topic") {
            topic = await _getTopicFrom(id);
        }
        else {
            topic = await _getTopicFrom(item["topicID"]);
        }
        const category = await _getCategoryFrom(topic["categoryID"]);
        const description = _getDescription(type == "topic" ? topic : item, type, topic.topicName, category.name);
        const args = {
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
        };
        const result = await (0, common_1.sendTestMessages)(args, args.item, createdAt);
        functions.logger.log(`${result}`);
    }
    catch (error) {
        functions.logger.log(`error: ${error}`);
    }
};
exports.testHandler = testHandler;
const _getTitleFromType = (type, item) => {
    var _a;
    if (type == "recode") {
        return "Don’t Miss This Affirmation";
    }
    if (type == "topic") {
        return "Just In: New Topic";
    }
    if (type == "decode") {
        const isVideo = ((_a = item["decodeVideo"]) !== null && _a !== void 0 ? _a : "").trim().length !== 0;
        if (isVideo)
            return "Just Dropped: New Expert Video";
        return "Listen Up: New Audio!";
    }
    if (type == "stone") {
        return "New Product Just for You!";
    }
    if (type == "book") {
        return "Discover Today’s New Book";
    }
    throw Error("Unknown type!!!");
};
const _getItemFrom = async (id, type) => {
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
};
const _getRecodeFrom = async (id) => {
    const result = await admin.database().ref("recode").child(id).get();
    return _copyValueWithKey(result);
};
const _getBookFrom = async (id) => {
    const result = await admin.database().ref("books").child(id).get();
    return _copyValueWithKey(result);
};
const _getStoneFrom = async (id) => {
    const result = await admin.database().ref("energy").child(id).get();
    return _copyValueWithKey(result);
};
const _getDecodeFrom = async (id) => {
    const result = await admin.database().ref("decodingProblems").child(id).get();
    return _copyValueWithKey(result);
};
const _getTopicFrom = async (id) => {
    const result = await admin.database().ref("topics").child(id).get();
    return _copyValueWithKey(result);
};
const _getCategoryFrom = async (id) => {
    const result = await admin.database().ref("Categories").child(id).get();
    return _copyValueWithKey(result);
};
const _copyValueWithKey = (result) => {
    const value = result.val();
    value.key = result.key;
    return value;
};
const _getDescription = (item, type, topicName, categoryName) => {
    var _a;
    if (type == "recode") {
        return `${categoryName} - ${topicName}`;
    }
    if (type == "topic") {
        return `${categoryName} - ${topicName}`;
    }
    if (type == "decode") {
        const expert = item["decodingTitle"];
        const isVideo = ((_a = item["decodeVideo"]) !== null && _a !== void 0 ? _a : "").trim().length !== 0;
        if (isVideo)
            return `Hear What ${expert} Has To Say`;
        return `${categoryName} - ${topicName}`;
    }
    if (type == "stone") {
        return item["stoneName"];
    }
    if (type == "book") {
        return item["bookName"];
    }
};
//# sourceMappingURL=whats_new.js.map