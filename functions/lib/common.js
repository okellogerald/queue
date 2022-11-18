"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessage = void 0;
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const sendMessage = async ({ title, message, type, }, item, id) => {
    var _a, _b;
    const devicesRef = admin.firestore().collection("devices");
    const snapshot = await devicesRef.get();
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
        try {
            await admin.messaging().send(payload);
            await devicesRef.doc(doc.id).update({ badge: badge + 1 });
            functions.logger.info(`successfully sent message to ${doc.id}`);
        }
        catch (error) {
            functions.logger.error(error);
            continue;
        }
    }
    return "sent messages to all devices";
};
exports.sendMessage = sendMessage;
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