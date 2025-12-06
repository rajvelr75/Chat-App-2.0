import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

    const { chatId } = useParams();

    if (loading) {
        return <div className="p-8 text-center text-gray-500 text-sm italic">Loading chats...</div>;
    }

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar pt-2">
            {chats.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm italic flex flex-col items-center gap-2">
                    <span>No chats yet.</span>
                    <span className="text-gray-300 text-xs">Start a new conversation!</span>
                </div>
            ) : (
                chats.map(chat => (
                    <ChatListItem
                        key={chat.id}
                        chat={chat}
                        currentUser={currentUser}
                        onSelect={handleSelectChat}
                        isSelected={chat.id === chatId}
                    />
                ))
            )}
        </div>
    );
};

export default ChatList;
