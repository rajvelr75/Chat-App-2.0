import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import Avatar from './Avatar';

const ChatListItem = ({ chat, currentUser, onSelect, isSelected, preFetchedOtherUser }) => {
    const [otherUser, setOtherUser] = useState(preFetchedOtherUser || null);
    const [lastMessageTime, setLastMessageTime] = useState('');

    useEffect(() => {
        if (preFetchedOtherUser) {
            setOtherUser(preFetchedOtherUser);
            return;
        }

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
    }, [chat, currentUser, preFetchedOtherUser]);

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
            className={`flex items-center px-4 py-3 cursor-pointer transition-all duration-200 border-b border-gray-100 last:border-0 mx-2 rounded-lg my-1 ${isSelected ? 'bg-[#0C4DA2] shadow-md transform scale-[1.02]' : 'hover:bg-gray-50'}`}
        >
            <div className="mr-3 relative">
                <Avatar user={displayUser} size="w-12 h-12" showStatus={false} />
                {!chat.isGroup && otherUser?.isOnline && (
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 ${isSelected ? 'border-[#0C4DA2] bg-white' : 'border-white bg-green-500'}`}></div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                    <h3 className={`font-medium truncate text-base ${isSelected ? 'text-white' : 'text-gray-900'}`}>{displayName}</h3>
                    <span className={`text-xs flex-shrink-0 ml-2 ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>
                        {lastMessageTime}
                    </span>
                </div>
                <p className={`text-sm truncate ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>
                    {lastMessagePreview}
                </p>
            </div>
        </div>
    );
};

export default ChatListItem;
