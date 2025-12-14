importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Config must match src/services/firebase.js
const firebaseConfig = {
    apiKey: "AIzaSyDL8Fq72B4MQ62j7p7pHY52GsQU_FyKmi4", // User must replace or we can try to inject if we knew it, but here we provide template as we can't read .env in SW easily without build step
    authDomain: "chat-app-8f8e9.firebaseapp.com",
    projectId: "chat-app-8f8e9",
    messagingSenderId: "719395112705",
    appId: "1:719395112705:web:1e674aeaf9126639267d00"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/chat.ico',
        data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const chatId = event.notification.data?.chatId;

    // Open the chat window
    const urlToOpen = chatId ? `/chat/${chatId}` : '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Check if there is already a window/tab open with the target URL
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not, open a new window
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
