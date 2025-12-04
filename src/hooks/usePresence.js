import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

export const usePresence = (userId) => {
    const [isOnline, setIsOnline] = useState(false);
    const [lastSeen, setLastSeen] = useState(null);

    useEffect(() => {
        if (!userId) return;

        const unsubscribe = onSnapshot(doc(db, "users", userId), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setIsOnline(data.isOnline);
                setLastSeen(data.lastSeen);
            }
        });

        return () => unsubscribe();
    }, [userId]);

    return { isOnline, lastSeen };
};
