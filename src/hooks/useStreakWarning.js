import { useState, useEffect } from 'react';
import { getDayString } from '../utils/dateUtils';

export const useStreakWarning = (chat) => {
    const [warningActive, setWarningActive] = useState(false);

    useEffect(() => {
        if (!chat || !chat.streak || chat.streak === 0 || chat.isGroup) {
            setWarningActive(false);
            return;
        }

        const checkWarning = () => {
            const now = new Date();
            const nowUTC = new Date(now.getTime() + now.getTimezoneOffset() * 60000);

            // Check if messaged today
            const dayString = nowUTC.toISOString().split('T')[0];
            const timestamps = chat.lastMessageTimestamps || {};
            const members = chat.members || [];

            let bothMessagedToday = true;
            if (members.length === 2) {
                for (const mId of members) {
                    const ts = timestamps[mId];
                    if (!ts || ts.split('T')[0] !== dayString) {
                        bothMessagedToday = false;
                        break;
                    }
                }
            } else {
                bothMessagedToday = false; // Fallback
            }

            if (bothMessagedToday) {
                setWarningActive(false);
                return;
            }

            // Calculate time until midnight UTC
            const tomorrowUTC = new Date(nowUTC);
            tomorrowUTC.setUTCDate(tomorrowUTC.getUTCDate() + 1);
            tomorrowUTC.setUTCHours(0, 0, 0, 0);

            const diffMs = tomorrowUTC - nowUTC;
            const oneHourMs = 60 * 60 * 1000;

            if (diffMs <= oneHourMs && diffMs > 0) {
                setWarningActive(true);
            } else {
                setWarningActive(false);
            }
        };

        checkWarning();
        const interval = setInterval(checkWarning, 60000); // Check every minute

        return () => clearInterval(interval);
    }, [chat]);

    return warningActive;
};
