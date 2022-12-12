"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessage = exports.sendTestMessages = void 0;
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const sendMessage = async ({ title, message, type, }, item, id) => {
    var _a, _b;
    const devicesRef = admin.firestore().collection("devices");
    const snapshot = await devicesRef.get();
    let index = 0;
    for (const doc of snapshot.docs) {
        const data = doc.data();
        const token = (_a = data["token"]) !== null && _a !== void 0 ? _a : "";
        if (token.trim().length == 0)
            continue;
        const badge = (_b = data["badge"]) !== null && _b !== void 0 ? _b : 0;
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
    return "sent messages to all devices";
};
exports.sendMessage = sendMessage;
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
                id: id,
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
//# sourceMappingURL=common.js.map