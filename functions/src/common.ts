import {
    AndroidConfig,
    ApnsConfig,
    TokenMessage,
    TopicMessage
} from "firebase-admin/lib/messaging/messaging-api";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import {
    Device,
    PayloadArguments,
    Notification,
} from "./types";

/* eslint-disable  @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion*/

// * Collection Names
export const kDevices = "devices";
export const kNotifications = "notifications";

/** Sends a notification to a single device using a device token */
export const sendTokenNotification = async (
    notification: Notification,
    device: Device,
): Promise<void> => {
    const devicesRef = admin.firestore().collection(kDevices);

    const args: PayloadArguments = {
        token: device.token,
        title: notification.title,
        message: notification.message,
        badge: device.badge + 1,
        type: notification.type,
        item: notification.item,
        collapseID: notification.collapseID,
    };

    const payload = createTokenPayload(args);

    try {
        await admin.messaging().send(payload);
        let notifications = device.notifications ?? [];
        // keep only the 30 last notification ids
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

/** Sends a notification to multiple devices. This is only called when a function
 * is triggered by a new document being added in the collection.
 * 
 * It should spend about 6 minutes. If there are still devices in the collection
 * that have not been sent the notification after spending about 6 minutes
 * sending these notifications, the notification will be saved in the Notifications
 * Firestore Collection.
 */
export const sendNotification = async (
    notification: Notification,
    startTime: number,
): Promise<string> => {
    const devicesRef = admin.firestore().collection(kDevices);
    const notificationsRef = admin.firestore().collection(kNotifications);

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
            // when the next Cron job starts it knows to what devices to continue sending 
            // the notification
            await notificationsRef.add({
                "notification": notification,
                "timestamp": Date.now(),
                "last_device_id": device.id,
            });
            break;
        }

        // avoiding sending the same notification twice
        if (device.notifications?.includes(notification.id)) continue;
        await sendTokenNotification(notification, device);
        functions.logger.log("sent notification to device no. ", index, ". ID is ", doc.id);
        index++;
    }

    return "sent messages to all devices";
};

/** Sends a notification to multile devices. This is only called when a function
 * is triggered by a Cron job.
 */
const continueSendingNotification = async (
    notification: Notification,
    devices: admin.firestore.QueryDocumentSnapshot<admin.firestore.DocumentData>[],
    remainingTime: number,
): Promise<string> => {
    const start = Date.now();

    // if true timeout is 20 seconds away
    if (remainingTime <= 2000) return "No enough time to send notification";

    /// delay for one second to make sure you don't run into 1 document read per second on 
    /// enforced by Cloud Firestore
    await delayFor(1200);

    /// looping over all devices in a snapshot.docs.
    for (const doc of devices) {
        const device = { ...doc.data(), "id": doc.id } as Device;

        const timeSpent = Date.now() - start;
        // if true, timeout is 10 seconds away
        if ((remainingTime - timeSpent) <= 10000) break;
        await sendTokenNotification(notification, device);
    }

    return "sent messages to all remaining devices";
};

/**
 * Called by the Cron job to continue sending notifications to all remaining devices.
 * 
 * This whole process should take 8 minutes (=== 480000 milliseconds) to complete.
 */
export const continueSendingNotifications = async () => {
    const startTime = Date.now();
    functions.logger.info("CONTINUING SENDING NOTIFICATIONS PROCESS");

    const devicesRef = admin.firestore().collection(kDevices);
    const notificationsRef = admin.firestore()
        .collection(kNotifications)
        .orderBy("timestamp", "desc");
    const snapshots = await notificationsRef.get();

    if (snapshots.size === 0) {
        functions.logger.info("NO NOTIFICATION WAS FOUND");
        return;
    }

    for (const doc of snapshots.docs) {
        const data = doc.data();
        const devicesSnapshot = await devicesRef.
            where("notifications", "not-in", [doc.id])
            .get();
        if (devicesSnapshot.size === 0) {
            // delete this notification since all devices have it in their notifications history.
            // That means it has been sent to all devices.
            await admin.firestore()
                .collection("notifications").doc(doc.id).delete();
            continue;
        }
        await continueSendingNotification(
            data.notification,
            devicesSnapshot.docs,
            480000 - startTime,
        );
    }
}

const createTokenPayload = ({
    token,
    title,
    message,
    type,
    badge,
    item,
    collapseID,
}: PayloadArguments,
): TokenMessage => {
    const notificationID = collapseID.toString().substring(collapseID.toString().length - 4);

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
    collapseID,
}: PayloadArguments): TopicMessage => {
    const notificationID = collapseID.toString().substring(collapseID.toString().length - 4);

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