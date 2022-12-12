import { AndroidConfig, ApnsConfig, TokenMessage } from "firebase-admin/lib/messaging/messaging-api";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
/* eslint-disable  @typescript-eslint/no-explicit-any */
interface TokenMessageArguments {
    title: string,
    message: string,
    type: string,
}

const sendMessage = async (
    {
        title,
        message,
        type,
    }: TokenMessageArguments, item: any, id: number
): Promise<string> => {
    const devicesRef = admin.firestore().collection("devices");
    const snapshot = await devicesRef.get();

    let index = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();

        const token: string = data["token"] ?? "";
        if (token.trim().length == 0) continue;

        const badge: number = data["badge"] ?? 0;
        const args: PayloadArguments = {
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
        } catch (error) {
            functions.logger.error(error);
            index++;
            continue;
        }
    }

    return "sent messages to all devices";
};

// ! TEST
export const sendTestMessages = async (
    {
        title,
        message,
        type,
    }: TokenMessageArguments, item: any, id: number
): Promise<string> => {
    const devicesRef = admin.firestore().collection("devices");
    const testUsers = ["L0YtitRdZmWap8XFLpbrvrL0Rjb2"];

    for (const user of testUsers) {
        const devices = [];

        const doc = await admin.firestore().collection("users").doc(user).get();
        if (!doc.exists) continue;

        if (doc.data() != null) {
            const data = doc.data() ?? {};
            devices.push(...(data['devices'] ?? []));
        }

        functions.logger.debug(user, devices);
        let index = 0;

        for (const device of devices) {
            const doc = await devicesRef.doc(device).get();
            if (!doc.exists) continue;

            const data = doc.data() ?? {};

            const token: string = data["token"] ?? "";
            if (token.trim().length == 0) continue;

            const badge: number = data["badge"] ?? 0;
            const args: PayloadArguments = {
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
            } catch (error) {
                functions.logger.error(error);
                index++;
                continue;
            }
        }
    }
    return "sent messages to all devices";
};

interface PayloadArguments {
    token: string;
    title: string;
    message: string;
    type: string;
    badge: number;
    item: any;
    id: number;
}

const createTokenPayload = ({
    token,
    title,
    message,
    type,
    badge,
    item,
    id,
}: PayloadArguments): TokenMessage => {
    const notificationID = id.toString().substring(id.toString().length - 4);

    const apnsConfig: ApnsConfig = {
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

    const androidConfig: AndroidConfig = {
        priority: "high",
        notification: {
            notificationCount: badge,
        },
    };

    const payload: TokenMessage = {
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

export { sendMessage, TokenMessageArguments }
