import { getToken } from "firebase/messaging";
import { messaging, db } from "./firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export const requestNotificationPermission = async (userId) => {
    if (!messaging) return;

    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const token = await getToken(messaging, {
                vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
                serviceWorkerRegistration: registration,
            });

            if (token && userId) {
                const userRef = doc(db, "users", userId);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    const currentToken = userSnap.data().fcmToken;
                    if (currentToken !== token) {
                        await updateDoc(userRef, {
                            fcmToken: token
                        });
                        console.log("FCM Token updated");
                    }
                } else {
                    // Handle case where user doc might not exist yet (rare if called after login)
                    await updateDoc(userRef, {
                        fcmToken: token
                    });
                }
            }
        }
    } catch (error) {
        console.error("Error requesting notification permission:", error);
    }
};
