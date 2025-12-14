import React, { createContext, useContext, useEffect, useState } from 'react';
import { onMessage } from 'firebase/messaging';
import { messaging } from '../services/firebase';
import { useLocation } from 'react-router-dom';
import NotificationPopup from '../components/NotificationPopup';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const [notification, setNotification] = useState(null);
    const location = useLocation();

    useEffect(() => {
        if (!messaging) return;

        const unsubscribe = onMessage(messaging, (payload) => {
            console.log('Foreground Message Reached:', payload);

            const { chatId, senderName, text } = payload.data || {};
            const title = payload.notification?.title || senderName;
            const body = payload.notification?.body || text;

            // Check if user is currently inside this chat
            // We assume the URL structure is /chat/:chatId
            const currentChatId = location.pathname.split('/chat/')[1];

            if (currentChatId === chatId) {
                console.log('User is already in this chat, suppressing notification.');
                return;
            }

            setNotification({
                title,
                body,
                data: payload.data
            });
        });

        return () => unsubscribe();
    }, [location.pathname]);

    return (
        <NotificationContext.Provider value={{ notification }}>
            {children}
            {notification && (
                <NotificationPopup
                    notification={notification}
                    onClose={() => setNotification(null)}
                />
            )}
        </NotificationContext.Provider>
    );
};
