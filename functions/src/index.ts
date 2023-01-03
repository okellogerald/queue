import * as admin from "firebase-admin";
import { ServiceAccount } from "firebase-admin";
import * as functions from "firebase-functions";

import * as downloads from "./daily_downloads";
import * as whatsNew from "./whats_new";
import * as devices from "./devices";
import * as common from "./common";

const serviceAccount: ServiceAccount = {
    clientEmail: "firebase-adminsdk-wpigv@the-why-app.iam.gserviceaccount.com",
    privateKey:
        "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCtxFu82QWmgYWr\nzJ6EqX5hLUsGmjYgStuitx9hKc16+kdfvyg1MbcK4yQl5fiUjkQgeFrdYtEe+Kis\n6RZaWCyxcxCjDqeDuKoCPuQ1Yem3xkbHgdQ2UmgEg1aFs3gh0j76ZdqrQgiCjdxh\nli7C3fCbHvvEZpCan5rGLLOqMeTDaRAxDZqvBZI67/ZEV4SLQr7UXRfEewxkk1YI\n0MRPpzQ5FHa+J/5cm6fgRqyhku6WuZDLa7wkm5l+6gDeKyJwf0fuY+bYkMqCMjPt\nsldShaHqeHpP/U3wpvgLAjB+NJr8US/6kPF7HzCD5SN5NdkN6fl2Bg7UBGRXWi4k\nDwFT7BNjAgMBAAECggEAK8cfkZlfeg6BncHEYgnNpC/kCfrKDiKt6PWXu0Pr18K8\nPpwLRjOLOPv2vHGOyeZ5tXB8+++MXfAplr52ejZitCYYF+x2OZJJip1Lo0NSvZD/\nff3wd+sU96YbIz4O0v6EDVOh3qmZOUMCNbe/eiquFnac2WM5pSr2tFzIuuUtDCm+\nopwgPGR+5sHdnLJehpgHbJFec7oGGHiTsm60OIQ9PYQci9MdZwewhl6ryHWoQWg7\n10M63PF559Qid5vlJkoDsBA90UcXs43clcjZ/Ym1DM+YHL9bRKDCeksJSD8vZN2R\nNiAsufmywPR2sfhXDKw+6pf5I8Fy0ELp1hhFIsJRsQKBgQDcHI9o/sue2W55mMzN\n2UbmF3i/1VvwH5lgDNL+81f3rgRIfrBKHPfQMdnEQkbReJe3b7lgZ/ie9IJtBjRS\ntowgQEpj4PogwH7hLTy3la2mZSkVY9W4UHaq06/15HI4LpmzlfF61MOUwO0m008+\nHjkZ0qZq0D/gI1D2clqu4T/3CQKBgQDKGWFzV95b9PnIettlstvkFABQWcmKx7Pc\narCAFOcYLDb8/XgGs3GtAtySLdCLdue7sJWgP/z4kRogWir9JxH2oxubSUD35BDg\njH7+DCPWpGsWRtm8DAI8NN0M03YDyg7mnw339SmINySVjMBeuxwIoql+hz1GTAqs\nag4Ta6BGCwKBgQCvBqLe2aTupnUbie5pTXn8IvPoju8xjN74KpppEvWDRMOxJdRm\nyowf6FQCpLUNgjgaLGQbDfH76+/+Y62di/z29EhzDYW4H3mE8uTSEtpncw9tK9rZ\nWlpSUkwcWlCc7ilYTUYc5yyyj4rEkcj0WzIKn5+nVftE7rBFl/8WCpVDiQKBgAyL\nbsUeGytSFX8gQSYa6BNMOojCSgRXSQ7RgIsywPV7KR6jDSQ9Vz0KBG7+cQd3JgM8\nfs0nq6gyOZDwh+KW3kKU9U26SlIY0gNeNTPHxSG5qvwDAdjuVeUu0tnM9nJdxHcE\nQHW3vhA6fAbcacR3kNHoZuT3uBH4/mCdZKpH7/bpAoGALZfocsopZGy9+9qGQtY2\n0XfzzirvxDPTfC0F0SiZwBfBk4K/qgABJO3NtmVn/UJEHek58kHDaVLV84Sddk6r\njI4lW+CYIBI7B6bI1k/e4frLXRzTWJr6ZhcFHX611JCFPx8E+ww1q/C8OCseFoyD\nHnFEkGTVKuAxN5Ub650Q0qM=\n-----END PRIVATE KEY-----\n",
    projectId: "the-why-app",
};

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://the-why-app.firebaseio.com",
});

exports.onDownloadCreated = functions.runWith({
    timeoutSeconds: 540,
    memory: "1GB",
}).firestore
    .document("dailyDownloads/{ID}")
    .onCreate(downloads.onCreateHandler);

exports.onNewItemAdded = functions.runWith({
    timeoutSeconds: 540,
    memory: "1GB",
}).firestore
    .document("whats_new/{ID}")
    .onCreate(whatsNew.onCreateHandler);

exports.onDeviceCreated = functions.firestore
    .document("devices/{ID}")
    .onCreate(devices.onAddHander);

exports.onDeviceEdited = functions.firestore
    .document("devices/{ID}")
    .onUpdate(devices.onEditHandler);

exports.checkForUnPostedDownloads = functions.runWith({
    timeoutSeconds: 540,
    memory: "1GB",
}).pubsub
    .schedule("*/10 * * * *")
    .onRun(downloads.checkForUnPostedDownloads);

/// checks after every 10 minutes if there is staff to send.
exports.continueSendingNotifications = functions.runWith({
    timeoutSeconds: 540,
    memory: "1GB",
}).pubsub
    .schedule("*/10 * * * *")
    .onRun(common.continueSendingNotifications);

exports.dailyDownloadsFetch = functions.https.onRequest(downloads.fetchDownloads);