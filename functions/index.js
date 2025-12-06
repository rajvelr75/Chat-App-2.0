const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.sendNotificationOnMessage = functions.firestore
    .document("chats/{chatId}/messages/{messageId}")
    .onCreate(async (snap, context) => {
        const message = snap.data();
        const chatId = context.params.chatId;

        // Skip notification if message comes from upload/temporary
        if (message.system || message.uploadInProgress) return;

        try {
            // Get chat participants
            const chatDoc = await admin.firestore().doc(`chats/${chatId}`).get();
            if (!chatDoc.exists) return;

            const participants = chatDoc.data().members || chatDoc.data().participants; // Handle both field names if schema varies

            const payloadPromises = [];

            for (const uid of participants) {
                if (uid !== message.senderId) {
                    const userDoc = await admin.firestore().doc(`users/${uid}`).get();
                    if (!userDoc.exists) continue;

                    const userData = userDoc.data();
                    const token = userData.fcmToken;

                    if (!token) continue;

                    // Prepare the notification payload
                    const payload = {
                        token: token,
                        notification: {
                            title: message.senderName || "New Message",
                            body: message.text || "Sent a media file",
                        },
                        data: {
                            chatId: chatId,
                            messageId: context.params.messageId,
                            click_action: "FLUTTER_NOTIFICATION_CLICK" // Standard practice, though web handles explicit click
                        }
                    };

                    payloadPromises.push(admin.messaging().send(payload));
                }
            }

            await Promise.all(payloadPromises);
            console.log(`Sent notifications to ${payloadPromises.length} users.`);

        } catch (error) {
            console.error("Error sending notifications:", error);
        }
    });
