import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import {
  getChatDetails,
  sendMessage,
  getMessages,
  getUserProfile,
  clearChat,
  deleteMessage,
  deleteMessageForMe, // Add this import
  markMessageDelivered,
  markMessageRead,
  resetUnreadCount
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
  const [replyingTo, setReplyingTo] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null); // For sidebar profile view
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Real-time chat details listener
    const chatDocRef = doc(db, "chats", chatId);
    const unsubChat = onSnapshot(chatDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const chatData = { id: docSnap.id, ...docSnap.data() };

        // Only update if data changed meaningfully to avoid excess re-renders
        setChat(prev => {
          // If deep compare needed, we can do it, but for now simple check
          if (JSON.stringify(prev) !== JSON.stringify(chatData)) {
            return chatData;
          }
          return prev;
        });

        setLoading(false);

        if (chatData.isGroup) {
          // Fetch members if needed
          // (Can optiimize to only fetch if members array changed)
          const fetchMembers = async () => {
            const membersData = {};
            // Optimization: check against existing members?
            for (const uid of chatData.members) {
              // Cache check or just fetch? 
              // For now keep it simple but maybe check groupMembers
              // if (!groupMembers[uid]) ...
              const user = await getUserProfile(uid);
              membersData[uid] = user;
            }
            setGroupMembers(membersData);
          };
          fetchMembers();
        } else {
          const otherUserId = chatData.members.find(id => id !== currentUser?.uid);
          if (otherUserId) {
            getUserProfile(otherUserId).then(user => setOtherUser(user));
          }
        }
      } else {
        setChat(null);
        setLoading(false);
      }
    });

    return () => unsubChat();
  }, [chatId, currentUser?.uid]);

  useEffect(() => {
    const unsubscribe = getMessages(chatId, currentUser?.uid, (msgs) => {
      setMessages(msgs);

      // Mark as delivered
      if (currentUser?.uid) {
        msgs.forEach(msg => {
          if (msg.senderId !== currentUser.uid && !msg.deliveredTo?.includes(currentUser.uid)) {
            markMessageDelivered(chatId, msg.id, currentUser.uid);
          }
        });
      }
    });

    return () => unsubscribe();
  }, [chatId, currentUser?.uid]);

  // Reset Unread Count
  useEffect(() => {
    if (chatId && currentUser?.uid) {
      resetUnreadCount(chatId, currentUser.uid);
    }
  }, [chatId, currentUser?.uid]);

  // Mark as Read when user sees messages
  useEffect(() => {
    if (messages.length > 0 && currentUser?.uid && chatId) {
      // Debounce or batch might be better, but for now simpe loop
      // If window has focus? Assuming if ChatWindow is mounted and we have messages, they are "seen"
      // Logic: Mark all unread messages from others as read.

      const unreadMessages = messages.filter(
        msg => msg.senderId !== currentUser.uid && !msg.readBy?.includes(currentUser.uid)
      );

      if (unreadMessages.length > 0) {
        unreadMessages.forEach(msg => {
          markMessageRead(chatId, msg.id, currentUser.uid);
        });
      }
    }
  }, [messages, currentUser?.uid, chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);



  const handleClearChat = async () => {
    if (window.confirm("Are you sure you want to clear this chat?")) {
      await clearChat(chatId);
    }
  };

  const handleDeleteMessage = async (messageId, type = 'me') => {
    // Confirmation handled by Modal in MessageBubble
    if (type === 'everyone') {
      await deleteMessage(chatId, messageId);
    } else {
      if (currentUser?.uid) {
        await deleteMessageForMe(chatId, messageId, currentUser.uid);
      }
    }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center bg-chat-bg text-gray-400">Loading...</div>;
  if (!chat) return <div className="flex-1 flex items-center justify-center bg-chat-bg text-gray-400">Chat not found</div>;

  return (
    <div className="flex flex-col h-full bg-transparent relative w-full overflow-hidden">
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

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-0 w-full">

        {messages.filter(msg => {
          // Client-side filtering for immediate feedback
          if (msg.deletedFor && msg.deletedFor.includes(currentUser?.uid)) return false;

          if (chat?.clearedAt && currentUser?.uid) {
            const clearedTime = chat.clearedAt[currentUser.uid];
            // console.log("Msg:", msg.id, "CreatedAt:", msg.createdAt, "ClearedAt:", clearedTime);

            if (clearedTime && msg.createdAt) {
              let msgTime = 0;
              let clearTime = 0;

              try {
                if (typeof msg.createdAt.toMillis === 'function') {
                  msgTime = msg.createdAt.toMillis();
                } else if (msg.createdAt instanceof Date) {
                  msgTime = msg.createdAt.getTime();
                } else if (msg.createdAt.seconds) {
                  msgTime = msg.createdAt.seconds * 1000;
                }

                if (typeof clearedTime.toMillis === 'function') {
                  clearTime = clearedTime.toMillis();
                } else if (clearedTime instanceof Date) {
                  clearTime = clearedTime.getTime();
                } else if (clearedTime.seconds) {
                  clearTime = clearedTime.seconds * 1000;
                }

                if (msgTime > 0 && clearTime > 0) {
                  if (msgTime <= clearTime) return false;
                }
              } catch (e) {
                console.error("Error comparing timestamps", e);
              }
            }
          }
          return true;
        }).map((msg, index, filteredMessages) => {
          const sender = chat.isGroup ? groupMembers[msg.senderId] : otherUser;

          // Date Separator Logic
          const prevMsg = index > 0 ? filteredMessages[index - 1] : null;
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
                sender={msg.senderId === currentUser?.uid ? currentUser : sender}
                onDelete={handleDeleteMessage}
                onReply={setReplyingTo}
                onUserClick={(user) => {
                  setSelectedUser(user);
                  setShowUserInfo(true);
                }}
                chatId={chatId}
                groupMembers={groupMembers}
                otherUser={otherUser}
              />
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <MessageInput
        chatId={chatId}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        onSendMessage={async (text, attachment) => {
          if (currentUser?.uid) {
            await sendMessage(chatId, currentUser.uid, text, attachment, replyingTo);
            setReplyingTo(null);
          }
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
      {showUserInfo && (selectedUser || otherUser) && (
        <div className="absolute top-0 right-0 h-full z-30 shadow-2xl animate-fade-in-left">
          <UserDetailsPage
            uid={selectedUser?.uid || otherUser?.uid}
            onClose={() => {
              setShowUserInfo(false);
              setSelectedUser(null);
            }}
          />
        </div>
      )}
    </div>
  );
};


export default ChatWindow;
