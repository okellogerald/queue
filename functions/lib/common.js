"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessage = exports.createTopicPayload = exports.sendTestMessages = exports.continueSendingNotifications = exports.argsDocID = exports.lastDeviceDocID = exports.downloads = exports.testDownloads = exports.dailyDownloadType = exports.whatsNewType = void 0;
const admin = require("firebase-admin");
const functions = require("firebase-functions");
/* eslint-disable  @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion*/
// * Const keys
exports.whatsNewType = "whats_new";
exports.dailyDownloadType = "daily_download";
exports.testDownloads = "test_daily_downloads";
exports.downloads = "dailyDownloads";
exports.lastDeviceDocID = "last_device_id";
exports.argsDocID = "args";
const sendMessage = async ({ title, message, type, id, }, item) => {
    var _a, _b, _c, _d, _e;
    const start = Date.now();
    const devicesRef = admin.firestore().collection("devices");
    const settingsRef = admin.firestore().collection("settings");
    let snapshot;
    /// delay for one second to make sure you don't run into 1 document read per second on 
    /// enforced by Cloud Firestore
    await delayFor(1200);
    const deviceSnapshot = await settingsRef.doc(exports.lastDeviceDocID).get();
    if (deviceSnapshot.exists) {
        const device = (_a = deviceSnapshot.data()) !== null && _a !== void 0 ? _a : {};
        const deviceID = (_b = device['id']) !== null && _b !== void 0 ? _b : "";
        if (deviceID.trim().length === 0) {
            snapshot = await devicesRef.get();
        }
        else {
            snapshot = await devicesRef.startAt(deviceSnapshot).get();
        }
    }
    else {
        snapshot = await devicesRef.get();
    }
    /// index to keep track of a number of devices that have been sent a notification.
    let index = 0;
    /// Id or key of the item (whats-new or daily-download) which we are sending notifications
    /// about.
    let itemKey;
    if (type === exports.dailyDownloadType) {
        itemKey = item.key;
    }
    else {
        itemKey = item.id;
    }
    if (itemKey.trim().length === 0)
        return "Item key was empty";
    /// looping over all devices in a snapshot.docs.
    for (const doc of snapshot.docs) {
        const data = doc.data();
        const lastNotificationID = (_c = data['last_notification_id']) !== null && _c !== void 0 ? _c : "";
        if (lastNotificationID === itemKey) {
            // It started resending the item notification
            await settingsRef.doc(exports.lastDeviceDocID).delete();
            await settingsRef.doc(exports.argsDocID).delete();
            functions.logger.error("NOT AN ERROR. JUST WANTED SOME ATTENTION. I HAVE REACHED THE END");
            break;
        }
        if ((Date.now() - start) >= 360000) {
            // timeout is 2 minutes away. Update the settings documents so that
            // when the next job starts it knows from what device to start sending 
            // the notification and what item to send
            // done at this time so as to avoid unnecessary writes.
            await settingsRef.doc(exports.lastDeviceDocID).set({ "id": doc.id });
            await settingsRef.doc(exports.argsDocID).set({
                "type": type,
                "title": title,
                "message": message,
                "item": item,
                "id": id.toString(),
            });
            break;
        }
        {
            const token = (_d = data["token"]) !== null && _d !== void 0 ? _d : "";
            if (token.trim().length == 0)
                continue;
            const badge = (_e = data["badge"]) !== null && _e !== void 0 ? _e : 0;
            const args = {
                token: token,
                title: title,
                message: message,
                badge: badge + 1,
                type: type,
                item: item,
                id: id,
            };
            const payload = createTokenPayload(args);
            functions.logger.log("sending notification; device no. ", index, " id is ", doc.id, " start time was ", start, " now is ", Date.now());
            try {
                await admin.messaging().send(payload);
                await devicesRef.doc(doc.id).update({ badge: badge + 1, last_notification_id: itemKey });
                functions.logger.info(`successfully sent message to ${doc.id}`);
                index++;
            }
            catch (error) {
                functions.logger.error(error);
                index++;
                continue;
            }
        }
    }
    return "sent messages to all devices";
};
exports.sendMessage = sendMessage;
const continueSendingNotifications = async () => {
    var _a, _b;
    functions.logger.info("CONTINUING SENDING NOTIFICATIONS PROCESS");
    const settingsRef = admin.firestore().collection("settings");
    /// gets the last document id to which the notification was sent.
    const doc = await settingsRef.doc(exports.lastDeviceDocID).get();
    if (doc.exists) {
        const data = (_a = doc.data()) !== null && _a !== void 0 ? _a : {};
        const lastDeviceDocID = (_b = data['id']) !== null && _b !== void 0 ? _b : '';
        if (lastDeviceDocID.trim().length === 0)
            return;
        const argsSnapshot = await settingsRef.doc(exports.argsDocID).get();
        let args = undefined;
        if (argsSnapshot.exists) {
            const _args = argsSnapshot.data();
            if (_args.type === exports.dailyDownloadType) {
                args = _args;
            }
            if (_args.type === exports.whatsNewType) {
                args = _args;
            }
        }
        if (args !== undefined) {
            const notificationArgs = args;
            const result = await sendMessage(notificationArgs, notificationArgs.item);
            functions.logger.log(`${result}`);
        }
    }
    else {
        functions.logger.info("LAST DEVICE ID WAS NOT FOUND");
    }
};
exports.continueSendingNotifications = continueSendingNotifications;
// ! TEST
const sendTestMessages = async ({ title, message, type, }, item, id) => {
    var _a, _b, _c, _d, _e;
    const devicesRef = admin.firestore().collection("devices");
    const testUsers = ["L0YtitRdZmWap8XFLpbrvrL0Rjb2"];
    for (const user of testUsers) {
        const devices = [];
        const doc = await admin.firestore().collection("users").doc(user).get();
        if (!doc.exists)
            continue;
        if (doc.data() != null) {
            const data = (_a = doc.data()) !== null && _a !== void 0 ? _a : {};
            devices.push(...((_b = data['devices']) !== null && _b !== void 0 ? _b : []));
        }
        functions.logger.debug(user, devices);
        let index = 0;
        for (const device of devices) {
            const doc = await devicesRef.doc(device).get();
            if (!doc.exists)
                continue;
            const data = (_c = doc.data()) !== null && _c !== void 0 ? _c : {};
            const token = (_d = data["token"]) !== null && _d !== void 0 ? _d : "";
            if (token.trim().length == 0)
                continue;
            const badge = (_e = data["badge"]) !== null && _e !== void 0 ? _e : 0;
            const args = {
                token: token,
                title: title,
                message: message,
                badge: badge + 1,
                type: type,
                item: item,
                id: id.toString(),
            };
            const payload = createTokenPayload(args);
            functions.logger.log("sending notification; device no. ", index, " id is ", doc.id);
            try {
                await admin.messaging().send(payload);
                await devicesRef.doc(doc.id).update({ badge: badge + 1 });
                functions.logger.info(`successfully sent message to ${doc.id}`);
                index++;
            }
            catch (error) {
                functions.logger.error(error);
                index++;
                continue;
            }
        }
    }
    return "sent messages to all devices";
};
exports.sendTestMessages = sendTestMessages;
const createTokenPayload = ({ token, title, message, type, badge, item, id, }) => {
    const notificationID = id.toString().substring(id.toString().length - 4);
    const apnsConfig = {
        payload: {
            headers: {
                "apns-collapse-id": notificationID,
            },
            aps: {
                contentAvailable: true,
                badge: badge,
            },
        },
    };
    const androidConfig = {
        priority: "high",
        notification: {
            notificationCount: badge,
        },
    };
    const payload = {
        token: token,
        data: {
            type: type,
            totalBadgeCount: `${badge}`,
            id: notificationID,
            item: JSON.stringify(item),
        },
        notification: {
            title: title,
            body: message,
        },
        android: androidConfig,
        apns: apnsConfig,
    };
    return payload;
};
const createTopicPayload = ({ title, message, type, badge, item, id, }) => {
    const notificationID = id.toString().substring(id.toString().length - 4);
    const apnsConfig = {
        payload: {
            headers: {
                "apns-collapse-id": notificationID,
            },
            aps: {
                contentAvailable: true,
                badge: badge,
            },
        },
    };
    const androidConfig = {
        priority: "high",
        notification: {
            notificationCount: badge,
        },
    };
    const payload = {
        topic: "the-why-app",
        data: {
            type: type,
            totalBadgeCount: `${badge}`,
            id: notificationID,
            item: JSON.stringify(item),
        },
        notification: {
            title: title,
            body: message,
        },
        android: androidConfig,
        apns: apnsConfig,
    };
    return payload;
};
exports.createTopicPayload = createTopicPayload;
const delayFor = async (milliseconds) => await new Promise(resolve => setTimeout(resolve, milliseconds));
//# sourceMappingURL=common.js.map