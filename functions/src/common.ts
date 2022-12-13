import { AndroidConfig, ApnsConfig, TokenMessage, TopicMessage } from "firebase-admin/lib/messaging/messaging-api";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { WhatsNew } from "./whats_new";
import { DownloadItem, TokenArgumentsWithDownloadItem } from "./daily_downloads";
import { TokenArgumentsWithWhatsNew } from "./whats_new";

/* eslint-disable  @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion*/

// * Const keys
export const whatsNewType = "whats_new";
export const dailyDownloadType = "daily_download";
export const testDownloads = "test_daily_downloads";
export const downloads = "dailyDownloads";
export const lastDeviceDocID = "last_device_id";
export const argsDocID = "args";

interface TokenMessageArguments {
    title: string,
    message: string,
    type: string,
    id: string,
}

const sendMessage = async (
    {
        title,
        message,
        type,
        id,
    }: TokenMessageArguments, item: DownloadItem | WhatsNew,
): Promise<string> => {
    const start = Date.now();

    const devicesRef = admin.firestore().collection("devices");
    const settingsRef = admin.firestore().collection("settings");

    let snapshot: admin.firestore.QuerySnapshot<admin.firestore.DocumentData>;

    /// delay for one second to make sure you don't run into 1 document read per second on 
    /// enforced by Cloud Firestore
    await delayFor(1200);
    const deviceSnapshot = await settingsRef.doc(lastDeviceDocID).get();
    if (deviceSnapshot.exists) {
        const device = deviceSnapshot.data() ?? {};
        const deviceID = device['id'] ?? "";
        if (deviceID.trim().length === 0) {
            snapshot = await devicesRef.get();
        } else {
            snapshot = await devicesRef.startAt(deviceSnapshot).get();
        }
    } else {
        snapshot = await devicesRef.get();
    }

    /// index to keep track of a number of devices that have been sent a notification.
    let index = 0;

    /// Id or key of the item (whats-new or daily-download) which we are sending notifications
    /// about.
    let itemKey: string;
    if (type === dailyDownloadType) {
        itemKey = (item as DownloadItem).key;
    }
    else {
        itemKey = (item as WhatsNew).id;
    }

    if (itemKey.trim().length === 0) return "Item key was empty";

    /// looping over all devices in a snapshot.docs.
    for (const doc of snapshot.docs) {
        const data = doc.data();

        const lastNotificationID = data['last_notification_id'] ?? "";
        if (lastNotificationID === itemKey) {
            // It started resending the item notification
            await settingsRef.doc(lastDeviceDocID).delete();
            await settingsRef.doc(argsDocID).delete();
            functions.logger.error("NOT AN ERROR. JUST WANTED SOME ATTENTION. I HAVE REACHED THE END");
            break;
        }

        if ((Date.now() - start) >= 360000) {
            // timeout is 2 minutes away. Update the settings documents so that
            // when the next job starts it knows from what device to start sending 
            // the notification and what item to send

            // done at this time so as to avoid unnecessary writes.
            await settingsRef.doc(lastDeviceDocID).set({ "id": doc.id });
            await settingsRef.doc(argsDocID).set({
                "type": type,
                "title": title,
                "message": message,
                "item": item,
                "id": id.toString(),
            });
            break;
        } {
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
            functions.logger.log("sending notification; device no. ", index, " id is ", doc.id, " start time was ", start, " now is ", Date.now());

            try {
                await admin.messaging().send(payload);
                await devicesRef.doc(doc.id).update({ badge: badge + 1, last_notification_id: itemKey });
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

export const continueSendingNotifications = async () => {
    functions.logger.info("CONTINUING SENDING NOTIFICATIONS PROCESS");

    const settingsRef = admin.firestore().collection("settings");

    /// gets the last document id to which the notification was sent.
    const doc = await settingsRef.doc(lastDeviceDocID).get();
    if (doc.exists) {
        const data = doc.data() ?? {};
        const lastDeviceDocID = data['id'] ?? '';
        if (lastDeviceDocID.trim().length === 0) return;

        const argsSnapshot = await settingsRef.doc(argsDocID).get();
        let args: TokenArgumentsWithDownloadItem | TokenArgumentsWithWhatsNew | undefined = undefined;
        if (argsSnapshot.exists) {
            const _args = argsSnapshot.data()!;
            if (_args.type === dailyDownloadType) {
                args = _args as TokenArgumentsWithDownloadItem;
            }
            if (_args.type === whatsNewType) {
                args = _args as TokenArgumentsWithWhatsNew;
            }
        }

        if (args !== undefined) {
            const notificationArgs = args as TokenArgumentsWithDownloadItem | TokenArgumentsWithWhatsNew;

            const result = await sendMessage(notificationArgs, notificationArgs.item);
            functions.logger.log(`${result}`)
        }
    } else {
        functions.logger.info("LAST DEVICE ID WAS NOT FOUND");
    }
}

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
                id: id.toString(),
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
    id: string;
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

export const createTopicPayload = ({
    title,
    message,
    type,
    badge,
    item,
    id,
}: PayloadArguments): TopicMessage => {
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

    const payload: TopicMessage = {
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

const delayFor = async (milliseconds: number) => await new Promise(resolve => setTimeout(resolve, milliseconds));

export { sendMessage, TokenMessageArguments }
