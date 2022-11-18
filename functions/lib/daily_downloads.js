"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchDownloads = exports.checkForUnPostedDownloads = exports.handler = void 0;
const functions = require("firebase-functions");
const common_1 = require("./common");
const admin = require("firebase-admin");
// * ON-CREATE HANDLER
const handler = async (snapshot, __) => {
    const { dailyAudio, dailyColor, description, plain_description, dailyThumbnail, dailyVideo, postedOn, hours, minute, second, } = snapshot.data();
    if (snapshot.id === null || snapshot.id.trim().length === 0)
        return;
    const downloadsRef = admin.firestore().collection("dailyDownloads");
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
        };
        await downloadsRef.doc(snapshot.id).update({ "posted": true });
        const result = await (0, common_1.sendMessage)(args, args.item, postedOn);
        functions.logger.log(`${result}`);
    }
};
exports.handler = handler;
// * ON SCHEDULED OPERATION TIME REACHES
const checkForUnPostedDownloads = async (__) => {
    functions.logger.log("checking for un-posted downloads");
    const downloadsRef = admin.firestore().collection("dailyDownloads");
    const date = Date.now();
    const snapshot = await downloadsRef.where("posted", "==", false).get();
    const items = getDocsDataFromFirestore(snapshot.docs, false);
    for (const item of items) {
        if (item.key === null || item.key.trim().length === 0)
            continue;
        // if posting date is not yet reached skip
        if (item.postedOn > date)
            continue;
        const args = {
            title: "Check Out The Daily Download",
            message: item.plain_description,
            type: "daily_download",
            item: item,
        };
        await downloadsRef.doc(item.key).update({ "posted": true });
        const result = await (0, common_1.sendMessage)(args, args.item, item.postedOn);
        functions.logger.log(`${result}`);
    }
};
exports.checkForUnPostedDownloads = checkForUnPostedDownloads;
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