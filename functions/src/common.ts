import { AndroidConfig, ApnsConfig, TokenMessage, TopicMessage } from "firebase-admin/lib/messaging/messaging-api";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { TokenArgumentsWithWhatsNew } from "./whats_new";
import { TokenArgumentsWithDownloadItem } from "./daily_downloads";

/* eslint-disable  @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion*/

// * Const keys
export const whatsNewType = "whats_new";
export const dailyDownloadType = "daily_download";
export const testDownloads = "test_daily_downloads";
export const downloads = "dailyDownloads";
interface TokenMessageArguments {
    title: string,
    message: string,
    type: string,
    id: string,
}

const sendTokenNotification = async (
    notification: TokenArgumentsWithDownloadItem | TokenArgumentsWithWhatsNew,
    device: Device,
): Promise<void> => {
    const devicesRef = admin.firestore().collection("devices");

    const args: PayloadArguments = {
        token: device.token,
        title: notification.title,
        message: notification.message,
        badge: device.badge + 1,
        type: notification.type,
        item: notification.item,
        id: notification.id,
    };

    const payload = createTokenPayload(args);

    // avoiding sending the same notification twice
    if (device.notifications?.includes(notification.id)) return;

    try {
        await admin.messaging().send(payload);
        let notifications = device.notifications ?? [];
        // keeping only the 30 last notification ids
        if (notifications.length > 30) {
            const sliced = notifications.slice(notifications.length - 30, notifications.length);
            notifications = sliced;
        }
        notifications.push(notification.id);
        await devicesRef.doc(device.id)
            .update({
                badge: device.badge + 1,
                notifications: notifications,
            });
        functions.logger.info(`successfully sent message to ${device.id}`);
    } catch (error) {
        functions.logger.error(error);
    }
}

const sendNotification = async (
    notification: TokenArgumentsWithDownloadItem | TokenArgumentsWithWhatsNew,
    startTime: number,
): Promise<string> => {
    const devicesRef = admin.firestore().collection("devices");
    const notificationsRef = admin.firestore().collection("settings");

    const snapshot = await devicesRef.get();

    /// delay for one second to make sure you don't run into 1 document read per second on 
    /// enforced by Cloud Firestore
    await delayFor(1200);

    /// index to keep track of a number of devices that have been sent a notification.
    let index = 0;

    /// looping over all devices in a snapshot.docs.
    for (const doc of snapshot.docs) {
        const device = { ...doc.data(), "id": doc.id } as Device;

        if ((Date.now() - startTime) >= 360000) {
            // timeout is about 2 minutes away. Update the notifications collection so that
            // when the next job starts it knows to what devices to continue sending 
            // the notification
            await notificationsRef.add({
                "notification": notification,
                "timestamp": Date.now(),
                "last_device_id": device.id,
            });
            break;
        }
        await sendTokenNotification(notification, device);
        functions.logger.log("sent notification to device no. ", index, ". ID is ", doc.id);
        index++;
    }

    return "sent messages to all devices";
};

const continueSendingNotification = async (
    notification: TokenArgumentsWithDownloadItem | TokenArgumentsWithWhatsNew,
    devices: admin.firestore.QueryDocumentSnapshot<admin.firestore.DocumentData>[],
): Promise<string> => {
    const start = Date.now();

    const notificationsRef = admin.firestore().collection("settings");

    /// delay for one second to make sure you don't run into 1 document read per second on 
    /// enforced by Cloud Firestore
    await delayFor(1200);

    /// looping over all devices in a snapshot.docs.
    for (const doc of devices) {
        const data = doc.data() as Device;

        if ((Date.now() - start) >= 360000) {
            // timeout is about 2 minutes away. Update the settings documents so that
            // when the next job starts it knows from what device to start sending 
            // the notification and what item to send

            await notificationsRef.doc(notification.id).set({
                "notification": notification,
                "timestamp": Date.now(),
            });
            break;
        }
        await sendTokenNotification(notification, data);
    }

    return "sent messages to all remaining devices";
};

export const continueSendingNotifications = async () => {
    functions.logger.info("CONTINUING SENDING NOTIFICATIONS PROCESS");

    const devicesRef = admin.firestore().collection("devices");
    const notificationsRef = admin.firestore()
        .collection("notifications")
        .orderBy("timestamp", "desc");
    const snapshots = await notificationsRef.get();

    if (snapshots.size === 0) functions.logger.info("NO NOTIFICATION WAS FOUND");

    for (const doc of snapshots.docs) {
        const data = doc.data();
        const devicesSnapshot = await devicesRef.
            where("notifications", "not-in", [doc.id])
            .get();
        if (devicesSnapshot.size === 0) continue;
        await continueSendingNotification(data.notification, devicesSnapshot.docs);
        break;
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

interface Device {
    badge: number;
    token: string;
    id: string;
    notifications?: Array<string>;
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

export { sendNotification, TokenMessageArguments }
