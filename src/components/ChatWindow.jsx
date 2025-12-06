import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getChatDetails,
  sendMessage,
  getMessages,
  getUserProfile,
  clearChat,
  deleteMessage
} from '../services/chatService';

import ChatHeader from './ChatHeader';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import { formatDateForSeparator, checkSameDay } from '../utils/dateUtils';

import GroupDetailsPage from '../pages/GroupDetailsPage';
import UserDetailsPage from '../pages/UserDetailsPage';

const ChatWindow = () => {
  const { chatId } = useParams();
  const { currentUser } = useAuth();
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [groupMembers, setGroupMembers] = useState({});
  const [loading, setLoading] = useState(true);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchChatData = async () => {
      setLoading(true);
      const chatData = await getChatDetails(chatId);
      setChat(chatData);
      setShowGroupInfo(false); // Reset when chat changes
      setShowUserInfo(false);

      if (chatData) {
        if (chatData.isGroup) {
          // Fetch all members for group chat
          const membersData = {};
          for (const uid of chatData.members) {
            const user = await getUserProfile(uid);
            membersData[uid] = user;
          }
          setGroupMembers(membersData);
        } else {
          // Fetch other user for 1-on-1
          const otherUserId = chatData.members.find(id => id !== currentUser.uid);
          if (otherUserId) {
            const user = await getUserProfile(otherUserId);
            setOtherUser(user);
          }
        }
      }
      setLoading(false);
    };

    fetchChatData();

    const unsubscribe = getMessages(chatId, currentUser.uid, (msgs) => {
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [chatId, currentUser.uid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);



  const handleClearChat = async () => {
    if (window.confirm("Are you sure you want to clear this chat?")) {
      await clearChat(chatId);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (window.confirm("Delete this message?")) {
      await deleteMessage(chatId, messageId);
    }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center bg-chat-bg text-gray-400">Loading...</div>;
  if (!chat) return <div className="flex-1 flex items-center justify-center bg-chat-bg text-gray-400">Chat not found</div>;

  return (
    <div className="flex flex-col h-full bg-transparent relative">
      <ChatHeader
        chat={chat}
        otherUser={otherUser}
        onClearChat={handleClearChat}
        onGroupInfoClick={() => {
          setShowGroupInfo(true);
          setShowUserInfo(false);
        }}
        onUserInfoClick={() => {
          setShowUserInfo(true);
          setShowGroupInfo(false);
        }}
      />

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {messages.map((msg, index) => {
          const sender = chat.isGroup ? groupMembers[msg.senderId] : otherUser;

          // Date Separator Logic
          const prevMsg = index > 0 ? messages[index - 1] : null;
          const showDateSeparator = !prevMsg || !checkSameDay(prevMsg.createdAt, msg.createdAt);
          const dateLabel = showDateSeparator ? formatDateForSeparator(msg.createdAt) : null;

          return (
            <div key={msg.id}>
              {showDateSeparator && dateLabel && (
                <div className="flex justify-center my-4 sticky top-0 z-10">
                  <span className="bg-[#E0E8F2]/80 backdrop-blur-sm text-[#0C4DA2] text-xs font-medium px-3 py-1 rounded-full shadow-sm border border-white/40">
                    {dateLabel}
                  </span>
                </div>
              )}
              <MessageBubble
                message={msg}
                isGroup={chat.isGroup}
                sender={msg.senderId === currentUser.uid ? currentUser : sender}
                onDelete={handleDeleteMessage}
                chatId={chatId}
              />
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <MessageInput
        chatId={chatId}
        onSendMessage={async (text, attachment) => {
          await sendMessage(chatId, currentUser.uid, text, attachment);
        }}
      />

      {/* Group Info Drawer */}
      {showGroupInfo && (
        <div className="absolute top-0 right-0 h-full z-30 shadow-2xl animate-fade-in-left">
          <GroupDetailsPage
            chatId={chatId}
            onClose={() => setShowGroupInfo(false)}
          />
        </div>
      )}

      {/* User Info Drawer */}
      {showUserInfo && otherUser && (
        <div className="absolute top-0 right-0 h-full z-30 shadow-2xl animate-fade-in-left">
          <UserDetailsPage
            uid={otherUser.uid}
            onClose={() => setShowUserInfo(false)}
          />
        </div>
      )}
    </div>
  );
};


export default ChatWindow;
