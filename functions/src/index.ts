import * as admin from "firebase-admin";
import { ServiceAccount } from "firebase-admin";
import * as functions from "firebase-functions";

import * as downloads from "./daily_downloads";
import * as whatsNew from "./whats_new";
import * as devices from "./devices";
import * as common from "./common";

const serviceAccount: ServiceAccount = {
    clientEmail: "client_email",
    privateKey: "private_key",
    projectId: "project_id",
};

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "database_url",
});

// * TRIGGER 1
exports.onNewItemAdded = functions.runWith({
    timeoutSeconds: 540,
    memory: "1GB",
}).firestore
    .document("whats_new/{ID}")
    .onCreate(whatsNew.onCreateHandler);

// * TRIGGER 2
exports.continueSendingNotifications = functions.runWith({
    timeoutSeconds: 540,
    memory: "1GB",
}).pubsub
    .schedule("*/10 * * * *")
    .onRun(common.continueSendingNotifications);

// * You can now go directly to the src/common.ts file

// Might be of interest
exports.onDownloadCreated = functions.runWith({
    timeoutSeconds: 540,
    memory: "1GB",
}).firestore
    .document("dailyDownloads/{ID}")
    .onCreate(downloads.onCreateHandler);

// ! You can ignore this
exports.onDeviceCreated = functions.firestore
    .document("devices/{ID}")
    .onCreate(devices.onAddHander);

// ! You can ignore this
exports.onDeviceEdited = functions.firestore
    .document("devices/{ID}")
    .onUpdate(devices.onEditHandler);

// Might be of Interest
exports.checkForUnPostedDownloads = functions.runWith({
    timeoutSeconds: 540,
    memory: "1GB",
}).pubsub
    .schedule("*/10 * * * *")
    .onRun(downloads.checkForUnPostedDownloads);

// ! You can ignore this
exports.dailyDownloadsFetch = functions.https.onRequest(downloads.fetchDownloads);