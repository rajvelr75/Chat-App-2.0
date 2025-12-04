import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserChats } from '../services/chatService';
import ChatListItem from './ChatListItem';

const ChatList = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (currentUser?.uid) {
            const unsubscribe = getUserChats(currentUser.uid, (chatData) => {
                setChats(chatData);
                setLoading(false);
            });

            return () => unsubscribe();
        }
    }, [currentUser]);

    const handleSelectChat = (chatId) => {
        navigate(`/chat/${chatId}`);
    };

    if (loading) {
        return <div className="p-4 text-center text-text-secondary">Loading chats...</div>;
    }

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            {chats.length === 0 ? (
                <div className="p-4 text-center text-text-secondary">No chats yet. Start a new one!</div>
            ) : (
                chats.map(chat => (
                    <ChatListItem
                        key={chat.id}
                        chat={chat}
                        currentUser={currentUser}
                        onSelect={handleSelectChat}
                    />
                ))
            )}
        </div>
    );
};

export default ChatList;
