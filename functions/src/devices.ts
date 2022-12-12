import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { Change } from "firebase-functions";
import { QueryDocumentSnapshot } from "firebase-functions/v1/firestore";

const onAddHander = async (snapshot: QueryDocumentSnapshot) => {
    const { token } = snapshot.data();

    const _devicesRef = admin.firestore().collection("devices");

    try {
        if (token.toString().trim().length === 0) return;
        const snapshots = await _devicesRef.where("token", "==", token).get();
        for (const device of snapshots.docs) {
            if (device.id != snapshot.id) {
                await _devicesRef.doc(device.id).delete();
            }
        }
        functions.logger.log("deleted devices with the same token");
    } catch (error) {
        functions.logger.error(` ${error}`);
    }
}

const onEditHandler = async (snapshot: Change<QueryDocumentSnapshot>) => {
    const { token } = snapshot.after.data();

    const _devicesRef = admin.firestore().collection("devices");

    try {
        if (token.toString().trim().length === 0) return;
        const snapshots = await _devicesRef.where("token", "==", token).get();
        for (const device of snapshots.docs) {
            if (device.id != snapshot.after.id) {
                await _devicesRef.doc(device.id).delete();
            }
        }
        functions.logger.log("deleted devices with the same token");
    } catch (error) {
        functions.logger.error(` ${error}`);
    }
}

export { onAddHander, onEditHandler }
