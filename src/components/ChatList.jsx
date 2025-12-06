import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserChats } from '../services/chatService';
import ChatListItem from './ChatListItem';

const ChatList = ({ searchTerm }) => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [chats, setChats] = useState([]);
    const [enrichedChats, setEnrichedChats] = useState([]);
    const [loading, setLoading] = useState(true);

    // 1. Fetch Chat Docs
    useEffect(() => {
        if (currentUser?.uid) {
            const unsubscribe = getUserChats(currentUser.uid, (chatData) => {
                setChats(chatData);
                // If loading was true, we keep it true until we enrich data, 
                // but for UX, showing partial data is better. 
                // Let's rely on enrichedChats for rendering.
            });
            return () => unsubscribe();
        }
    }, [currentUser]);

    // 2. Enrich Chats with User Profiles (for DMs)
    useEffect(() => {
        const enrichChats = async () => {
            // Create a map to cache fetching
            // Note: In a real app, use a proper cache or store. 
            // Here we just fetch needed profiles.
            const enriched = await Promise.all(chats.map(async (chat) => {
                if (chat.isGroup) {
                    return { ...chat, searchName: chat.name, displayUser: { displayName: chat.name, photoURL: chat.photoURL } };
                } else {
                    const otherUserId = chat.members.find(id => id !== currentUser.uid);
                    if (otherUserId) {
                        // We could fetch one by one, or optimize.
                        // For now, fetching individual docs (Firestore caches internally somewhat).
                        // ChatListItem fetches it too, which is redundant but needed here for filtering.
                        // Ideally, we move the fetch logic here completely.
                        try {
                            const userDoc = await import('../services/chatService').then(mod => mod.getUserProfile(otherUserId));
                            if (userDoc) {
                                return {
                                    ...chat,
                                    otherUser: userDoc,
                                    searchName: userDoc.displayName,
                                    displayUser: userDoc
                                };
                            }
                        } catch (e) {
                            console.error("Error fetching user profile", e);
                        }
                    }
                    return { ...chat, searchName: 'Unknown User' };
                }
            }));
            setEnrichedChats(enriched);
            setLoading(false);
        };

        if (chats.length > 0) {
            enrichChats();
        } else {
            setEnrichedChats([]);
            setLoading(false);
        }
    }, [chats, currentUser]);

    const handleSelectChat = (chatId) => {
        navigate(`/chat/${chatId}`);
    };

    const { chatId } = useParams();

    // 3. Filter based on Search Term
    const filteredChats = enrichedChats.filter(chat => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return chat.searchName?.toLowerCase().includes(term);
    });

    if (loading && chats.length === 0) { // Only show loading if we have no data at all
        return <div className="p-8 text-center text-gray-500 text-sm italic">Loading chats...</div>;
    }

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar pt-2">
            {filteredChats.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm italic flex flex-col items-center gap-2">
                    {searchTerm ? (
                        <span>No chats found matching "{searchTerm}"</span>
                    ) : (
                        <>
                            <span>No chats yet.</span>
                            <span className="text-gray-300 text-xs">Start a new conversation!</span>
                        </>
                    )}
                </div>
            ) : (
                filteredChats.map(chat => (
                    <ChatListItem
                        key={chat.id}
                        chat={chat}
                        currentUser={currentUser}
                        onSelect={handleSelectChat}
                        isSelected={chat.id === chatId}
                        // Optimization: Pass pre-fetched user to avoid double network request
                        preFetchedOtherUser={chat.otherUser}
                    />
                ))
            )}
        </div>
    );
};

export default ChatList;
