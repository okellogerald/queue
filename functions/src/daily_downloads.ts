import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { QueryDocumentSnapshot } from "firebase-functions/v1/firestore";
import { DownloadItem, DownloadItemNotification } from "./types";
import { sendNotification } from "./common";
import { v4 as getRandomID } from 'uuid';

/* eslint-disable  @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion*/

// Collection Names
const kDownloads = "dailyDownloads";

export const onCreateHandler = async (snapshot: QueryDocumentSnapshot) => {
    const start = Date.now();

    if (snapshot.id === null || snapshot.id.trim().length === 0) return;

    const item = { ...snapshot.data(), "key": snapshot.id } as DownloadItem;

    const downloadsRef = admin.firestore().collection(kDownloads);

    if (item.postedOn > Date.now()) {
        downloadsRef.doc(snapshot.id).update({ "posted": false });
    } else {
        const notification: DownloadItemNotification = {
            title: "Check Out The Daily Download",
            message: item.plain_description,
            type: "daily_download",
            item: item,
            collapseID: item.postedOn.toString(),
            id: getRandomID(),
        }

        await downloadsRef.doc(snapshot.id).update({ "posted": true });
        const result = await sendNotification(notification, start);
        functions.logger.log(`${result}`);
    }
}

export const checkForUnPostedDownloads = async () => {
    const start = Date.now();

    functions.logger.log("checking for un-posted downloads");

    const downloadsRef = admin.firestore().collection(kDownloads);

    const date = Date.now();
    const snapshot = await downloadsRef
        .where("posted", "==", false)
        .where("postedOn", "<=", date)
        .get();
    const items = getDocsDataFromFirestore(snapshot.docs, false);

    for (const item of items) {
        if (item.key === null || item.key.trim().length === 0) continue;

        const notification: DownloadItemNotification = {
            title: "Check Out The Daily Download",
            message: item.plain_description,
            type: "daily_download",
            item: item,
            collapseID: item.postedOn.toString(),
            id: getRandomID(),
        }

        await downloadsRef.doc(item.key).update({ "posted": true });
        const result = await sendNotification(notification, start);
        functions.logger.log(`${result}`);
    }
}

export const fetchDownloads = async (_: functions.https.Request, res: functions.Response): Promise<void> => {
    const downloadsRef = admin.firestore().collection(kDownloads);

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