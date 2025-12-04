import { rtdb, db } from "./firebase";
import { ref, onValue, onDisconnect, set, serverTimestamp as rtdbServerTimestamp } from "firebase/database";
import { doc, updateDoc, serverTimestamp as firestoreServerTimestamp } from "firebase/firestore";

export const initPresence = (user) => {
    if (!user) return;

    const uid = user.uid;
    const userStatusDatabaseRef = ref(rtdb, `/status/${uid}`);
    const connectedRef = ref(rtdb, ".info/connected");

    onValue(connectedRef, (snapshot) => {
        if (snapshot.val() === false) {
            return;
        }

        const isOfflineForDatabase = {
            state: 'offline',
            lastChanged: rtdbServerTimestamp(),
        };

        const isOnlineForDatabase = {
            state: 'online',
            lastChanged: rtdbServerTimestamp(),
        };

        // Set offline on disconnect
        onDisconnect(userStatusDatabaseRef).set(isOfflineForDatabase).then(() => {
            // Set online when connected
            set(userStatusDatabaseRef, isOnlineForDatabase);

            // Update Firestore
            const userDocRef = doc(db, "users", uid);
            updateDoc(userDocRef, {
                isOnline: true,
                lastSeen: firestoreServerTimestamp()
            }).catch((err) => console.error("Error updating Firestore presence:", err));
        });
    });
};

export const setOfflineOnUnload = (user) => {
    if (!user) return;
    // This is mostly handled by onDisconnect, but we can try to force it if needed.
    // In modern browsers, onDisconnect is reliable enough.
};

export const subscribeToPresence = (uid, callback) => {
    const userStatusDatabaseRef = ref(rtdb, `/status/${uid}`);
    return onValue(userStatusDatabaseRef, (snapshot) => {
        const data = snapshot.val();
        callback(data);
    });
};
