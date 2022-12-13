"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchDownloads = exports.checkForUnPostedDownloads = exports.handler = exports.fetchTestDownloads = exports.checkForUnPostedTestDownloads = exports.testHandler = void 0;
const functions = require("firebase-functions");
const common_1 = require("./common");
const admin = require("firebase-admin");
/* eslint-disable  @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion*/
// * ON-CREATE HANDLER
const handler = async (snapshot) => {
    const { dailyAudio, dailyColor, description, plain_description, dailyThumbnail, dailyVideo, postedOn, hours, minute, second, } = snapshot.data();
    if (snapshot.id === null || snapshot.id.trim().length === 0)
        return;
    const downloadsRef = admin.firestore().collection(common_1.downloads);
    const date = Date.now();
    if (postedOn > date) {
        downloadsRef.doc(snapshot.id).update({ "posted": false });
    }
    else {
        const args = {
            title: "Check Out The Daily Download",
            message: plain_description,
            type: "daily_download",
            item: {
                dailyAudio: dailyAudio,
                dailyColor: dailyColor,
                description: description,
                dailyThumbnail: dailyThumbnail,
                dailyVideo: dailyVideo,
                postedOn: postedOn,
                plain_description: plain_description,
                hours: hours,
                minute: minute,
                second: second,
                key: snapshot.id,
            },
            id: postedOn.toString(),
        };
        await downloadsRef.doc(snapshot.id).update({ "posted": true });
        const result = await (0, common_1.sendMessage)(args, args.item);
        functions.logger.log(`${result}`);
    }
};
exports.handler = handler;
// * ON SCHEDULED OPERATION TIME REACHES
const checkForUnPostedDownloads = async () => {
    functions.logger.log("checking for un-posted downloads");
    const downloadsRef = admin.firestore().collection(common_1.downloads);
    const date = Date.now();
    const snapshot = await downloadsRef
        .where("posted", "==", false)
        .where("postedOn", "<=", date)
        .get();
    const items = getDocsDataFromFirestore(snapshot.docs, false);
    for (const item of items) {
        if (item.key === null || item.key.trim().length === 0)
            continue;
        const args = {
            title: "Check Out The Daily Download",
            message: item.plain_description,
            type: "daily_download",
            item: item,
            id: item.postedOn.toString(),
        };
        await downloadsRef.doc(item.key).update({ "posted": true });
        const result = await (0, common_1.sendMessage)(args, args.item);
        functions.logger.log(`${result}`);
    }
};
exports.checkForUnPostedDownloads = checkForUnPostedDownloads;
// ! TEST
// * ON-CREATE HANDLER
const testHandler = async (snapshot) => {
    const { dailyAudio, dailyColor, description, plain_description, dailyThumbnail, dailyVideo, postedOn, hours, minute, second, } = snapshot.data();
    if (snapshot.id === null || snapshot.id.trim().length === 0)
        return;
    const downloadsRef = admin.firestore().collection(common_1.testDownloads);
    const date = Date.now();
    if (postedOn > date) {
        downloadsRef.doc(snapshot.id).update({ "posted": false });
    }
    else {
        const args = {
            title: "Check Out The Daily Download",
            message: plain_description,
            type: "daily_download",
            item: {
                dailyAudio: dailyAudio,
                dailyColor: dailyColor,
                description: description,
                dailyThumbnail: dailyThumbnail,
                dailyVideo: dailyVideo,
                postedOn: postedOn,
                plain_description: plain_description,
                hours: hours,
                minute: minute,
                second: second,
                key: snapshot.id,
            },
            id: postedOn.toString(),
        };
        await downloadsRef.doc(snapshot.id).update({ "posted": true });
        const result = await (0, common_1.sendTestMessages)(args, args.item, postedOn);
        functions.logger.debug(`${result}`);
    }
};
exports.testHandler = testHandler;
// ! TEST
// * ON SCHEDULED OPERATION TIME REACHES
const checkForUnPostedTestDownloads = async () => {
    functions.logger.debug("checking for un-posted test downloads");
    const downloadsRef = admin.firestore().collection(common_1.testDownloads);
    const date = Date.now();
    const snapshot = await downloadsRef
        .where("posted", "==", false)
        .where("postedOn", "<=", date)
        .get();
    const items = getDocsDataFromFirestore(snapshot.docs, false);
    for (const item of items) {
        if (item.key === null || item.key.trim().length === 0)
            continue;
        const args = {
            title: "Check Out The Daily Download",
            message: item.plain_description,
            type: "daily_download",
            item: item,
            id: item.postedOn.toString(),
        };
        await downloadsRef.doc(item.key).update({ "posted": true });
        const result = await (0, common_1.sendTestMessages)(args, args.item, item.postedOn);
        functions.logger.debug(`${result}`);
    }
};
exports.checkForUnPostedTestDownloads = checkForUnPostedTestDownloads;
const fetchDownloads = async (_, res) => {
    const downloadsRef = admin.firestore().collection("dailyDownloads");
    try {
        const snapshot = await downloadsRef.get();
        const list = getDocsDataFromFirestore(snapshot.docs, true);
        res.status(200).send(list);
    }
    catch (error) {
        res.status(500).send({ "error": `${error}` });
    }
};
exports.fetchDownloads = fetchDownloads;
const fetchTestDownloads = async (_, res) => {
    const downloadsRef = admin.firestore().collection("test_daily_downloads");
    try {
        const snapshot = await downloadsRef.get();
        const list = getDocsDataFromFirestore(snapshot.docs, true);
        res.status(200).send(list);
    }
    catch (error) {
        res.status(500).send({ "error": `${error}` });
    }
};
exports.fetchTestDownloads = fetchTestDownloads;
const getDocsDataFromFirestore = (values, toAPI) => {
    const list = [];
    for (const doc of values) {
        const idData = toAPI ? { "id": doc.id } : { "key": doc.id };
        const data = Object.assign(Object.assign({}, doc.data()), idData);
        list.push(data);
    }
    return list;
};
//# sourceMappingURL=daily_downloads.js.map