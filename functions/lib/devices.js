"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onEditHandler = exports.onAddHander = void 0;
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const onAddHander = async (snapshot) => {
    const { token } = snapshot.data();
    const _devicesRef = admin.firestore().collection("devices");
    try {
        if (token.toString().trim().length === 0)
            return;
        const snapshots = await _devicesRef.where("token", "==", token).get();
        for (const device of snapshots.docs) {
            if (device.id != snapshot.id) {
                await _devicesRef.doc(device.id).delete();
            }
        }
        functions.logger.log("deleted devices with the same token");
    }
    catch (error) {
        functions.logger.error(` ${error}`);
    }
};
exports.onAddHander = onAddHander;
const onEditHandler = async (snapshot) => {
    const { token } = snapshot.after.data();
    const _devicesRef = admin.firestore().collection("devices");
    try {
        if (token.toString().trim().length === 0)
            return;
        const snapshots = await _devicesRef.where("token", "==", token).get();
        for (const device of snapshots.docs) {
            if (device.id != snapshot.after.id) {
                await _devicesRef.doc(device.id).delete();
            }
        }
        functions.logger.log("deleted devices with the same token");
    }
    catch (error) {
        functions.logger.error(` ${error}`);
    }
};
exports.onEditHandler = onEditHandler;
//# sourceMappingURL=devices.js.map