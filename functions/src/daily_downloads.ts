import * as functions from "firebase-functions";
import { downloads, sendMessage, sendTestMessages, testDownloads, TokenMessageArguments } from "./common";
import * as admin from "firebase-admin";
import { QueryDocumentSnapshot } from "firebase-functions/v1/firestore";

/* eslint-disable  @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion*/

// * ON-CREATE HANDLER
const handler = async (snapshot: QueryDocumentSnapshot) => {
    const { dailyAudio,
        dailyColor,
        description,
        plain_description,
        dailyThumbnail,
        dailyVideo,
        postedOn,
        hours,
        minute,
        second,
    } = snapshot.data();

    if (snapshot.id === null || snapshot.id.trim().length === 0) return;

    const downloadsRef = admin.firestore().collection(downloads);

    const date = Date.now();
    if (postedOn > date) {
        downloadsRef.doc(snapshot.id).update({ "posted": false });
    } else {
        const args: TokenArgumentsWithDownloadItem = {
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
        }

        await downloadsRef.doc(snapshot.id).update({ "posted": true });
        const result = await sendMessage(args, args.item);
        functions.logger.log(`${result}`);
    }
}

// * ON SCHEDULED OPERATION TIME REACHES
const checkForUnPostedDownloads = async () => {
    functions.logger.log("checking for un-posted downloads");

    const downloadsRef = admin.firestore().collection(downloads);

    const date = Date.now();
    const snapshot = await downloadsRef
        .where("posted", "==", false)
        .where("postedOn", "<=", date)
        .get();
    const items = getDocsDataFromFirestore(snapshot.docs, false);

    for (const item of items) {
        if (item.key === null || item.key.trim().length === 0) continue;

        const args: TokenArgumentsWithDownloadItem = {
            title: "Check Out The Daily Download",
            message: item.plain_description,
            type: "daily_download",
            item: item,
            id: item.postedOn.toString(),
        }

        await downloadsRef.doc(item.key).update({ "posted": true });
        const result = await sendMessage(args, args.item);
        functions.logger.log(`${result}`);
    }
}

// ! TEST
// * ON-CREATE HANDLER
export const testHandler = async (snapshot: QueryDocumentSnapshot) => {
    const { dailyAudio,
        dailyColor,
        description,
        plain_description,
        dailyThumbnail,
        dailyVideo,
        postedOn,
        hours,
        minute,
        second,
    } = snapshot.data();

    if (snapshot.id === null || snapshot.id.trim().length === 0) return;

    const downloadsRef = admin.firestore().collection(testDownloads);

    const date = Date.now();
    if (postedOn > date) {
        downloadsRef.doc(snapshot.id).update({ "posted": false });
    } else {
        const args: TokenArgumentsWithDownloadItem = {
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
        }

        await downloadsRef.doc(snapshot.id).update({ "posted": true });
        const result = await sendTestMessages(args, args.item, postedOn);
        functions.logger.debug(`${result}`);
    }
}

// ! TEST
// * ON SCHEDULED OPERATION TIME REACHES
export const checkForUnPostedTestDownloads = async () => {
    functions.logger.debug("checking for un-posted test downloads");

    const downloadsRef = admin.firestore().collection(testDownloads);

    const date = Date.now();
    const snapshot = await downloadsRef
        .where("posted", "==", false)
        .where("postedOn", "<=", date)
        .get();
    const items = getDocsDataFromFirestore(snapshot.docs, false);

    for (const item of items) {
        if (item.key === null || item.key.trim().length === 0) continue;

        const args: TokenArgumentsWithDownloadItem = {
            title: "Check Out The Daily Download",
            message: item.plain_description,
            type: "daily_download",
            item: item,
            id: item.postedOn.toString(),
        }

        await downloadsRef.doc(item.key).update({ "posted": true });
        const result = await sendTestMessages(args, args.item, item.postedOn);
        functions.logger.debug(`${result}`);
    }
}

const fetchDownloads = async (_: functions.https.Request, res: functions.Response): Promise<void> => {
    const downloadsRef = admin.firestore().collection("dailyDownloads");

    try {
        const snapshot = await downloadsRef.get();
        const list = getDocsDataFromFirestore(snapshot.docs, true);
        res.status(200).send(list);
    } catch (error) {
        res.status(500).send({ "error": `${error}` });
    }
}

export const fetchTestDownloads = async (_: functions.https.Request, res: functions.Response): Promise<void> => {
    const downloadsRef = admin.firestore().collection("test_daily_downloads");

    try {
        const snapshot = await downloadsRef.get();
        const list = getDocsDataFromFirestore(snapshot.docs, true);
        res.status(200).send(list);
    } catch (error) {
        res.status(500).send({ "error": `${error}` });
    }
}

const getDocsDataFromFirestore = (values: QueryDocumentSnapshot[], toAPI: boolean): any[] => {
    const list = [];
    for (const doc of values) {
        const idData = toAPI ? { "id": doc.id } : { "key": doc.id };
        const data = { ...doc.data(), ...idData };
        list.push(data);
    }
    return list;
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

export interface TokenArgumentsWithDownloadItem extends TokenMessageArguments {
    item: DownloadItem,
}

export { handler, checkForUnPostedDownloads, fetchDownloads }

