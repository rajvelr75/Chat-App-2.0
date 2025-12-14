importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Config must match src/services/firebase.js
const firebaseConfig = {
    apiKey: "AIzaSyDL8Fq72B4MQ62j7p7pHY52GsQU_FyKmi4",
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
        icon: '/chat.ico', // Using chat.ico as logo.png is missing
        data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const chatId = event.notification.data?.chatId;

    // Open the chat window
    // If chatId exists, go there. Otherwise go to root.
    const urlToOpen = chatId ? `/chat/${chatId}` : '/';

    // We need to match the full URL or at least the path. 
    // self.registration.scope usually is the root.
    // client.url is a full URL.

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Check if there is already a window/tab open with the target URL or any app window
            // If we find a window that is already open, focus it and navigate it.

            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                // Check if the client is part of our app.
                if (client.url.startsWith(self.registration.scope)) {
                    // Focus the client
                    return client.focus().then((focusedClient) => {
                        // After focusing, navigate to the specific chat if supported
                        // 'navigate' might not be available on matched client immediately or in all browsers 
                        // but usually it is. 
                        // Safer to just focus if it's the exact same URL, or navigate if different.
                        if (client.navigate) {
                            return client.navigate(urlToOpen);
                        }
                    });
                }
            }
            // If not handling focus, open a new window
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
