import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import Avatar from './Avatar';

const ChatListItem = ({ chat, currentUser, onSelect }) => {
    const [otherUser, setOtherUser] = useState(null);
    const [lastMessageTime, setLastMessageTime] = useState('');

    useEffect(() => {
        if (!chat.isGroup) {
            const otherUserId = chat.members.find(id => id !== currentUser.uid);
            if (otherUserId) {
                const unsub = onSnapshot(doc(db, "users", otherUserId), (doc) => {
                    if (doc.exists()) {
                        setOtherUser({ uid: doc.id, ...doc.data() });
                    }
                });
                return () => unsub();
            }
        }
    }, [chat, currentUser]);

    useEffect(() => {
        if (chat.lastMessageAt) {
            const date = chat.lastMessageAt.toDate();
            const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setLastMessageTime(timeString);
        }
    }, [chat.lastMessageAt]);

    const displayUser = chat.isGroup
        ? { displayName: chat.name, photoURL: chat.photoURL }
        : otherUser;

    const displayName = displayUser?.displayName || 'Loading...';

    // Truncate last message
    const lastMessagePreview = chat.lastMessage
        ? (chat.lastMessage.length > 30 ? chat.lastMessage.substring(0, 30) + '...' : chat.lastMessage)
        : '';

    return (
        <div
            onClick={() => onSelect(chat.id)}
            className="flex items-center p-3 cursor-pointer border-b border-glass hover:bg-glass transition-colors duration-200"
        >
            <div className="mr-3">
                <Avatar user={displayUser} size="w-12 h-12" showStatus={!chat.isGroup} />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                    <h3 className="text-text-primary font-medium truncate">{displayName}</h3>
                    <span className="text-xs text-text-secondary flex-shrink-0 ml-2">
                        {lastMessageTime}
                    </span>
                </div>
                <p className="text-text-secondary text-sm truncate">
                    {lastMessagePreview}
                </p>
            </div>
        </div>
    );
};

export default ChatListItem;
