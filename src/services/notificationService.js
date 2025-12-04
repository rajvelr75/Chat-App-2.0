import { getToken } from "firebase/messaging";
import { messaging, db } from "./firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";

export const requestNotificationPermission = async (userId) => {
    if (!messaging) return; // Not supported or SSR

    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const token = await getToken(messaging, {
                vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY // User needs to replace this
            });

            if (token && userId) {
                // Save token to user doc
                await updateDoc(doc(db, "users", userId), {
                    fcmTokens: arrayUnion(token)
                });
            }
        }
    } catch (error) {
        console.error("Error requesting notification permission:", error);
    }
};
