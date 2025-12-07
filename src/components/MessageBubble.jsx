import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MdExpandMore, MdDelete, MdClose, MdReply, MdCheck, MdDoneAll } from 'react-icons/md';
import { deleteMessage, deleteMessageForMe, downloadChunks } from '../services/chatService';
import { getChatKey } from '../services/cryptoService';
import { decryptArrayBuffer, combineChunks } from '../services/mediaCryptoService';
import Avatar from './Avatar';
import ConfirmationModal from './ConfirmationModal';

const MessageBubble = ({ message, isGroup, sender, onDelete, chatId, onReply, onUserClick }) => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const isOwn = message.senderId === currentUser?.uid;
    const [showMenu, setShowMenu] = useState(false);
    const [mediaUrl, setMediaUrl] = useState(null);
    const [decrypting, setDecrypting] = useState(false);
    const [error, setError] = useState(false);
    const [showLightbox, setShowLightbox] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [visibleLimit, setVisibleLimit] = useState(500); // Character limit for text

    useEffect(() => {
        let active = true;

        const loadMedia = async () => {
            if (!message.encrypted) {
                if (message.imageUrl) setMediaUrl(message.imageUrl);
                if (message.videoUrl) setMediaUrl(message.videoUrl);
                return;
            }

            setDecrypting(true);
            try {
                const chatKey = await getChatKey(chatId, currentUser.uid);
                if (!chatKey) throw new Error("No key");

                // Download Chunks
                const chunks = await downloadChunks(message.id);
                if (!chunks || chunks.length === 0) throw new Error("No chunks found");

                // Combine
                const encryptedBuffer = combineChunks(chunks);

                // Decrypt
                const decryptedBuffer = await decryptArrayBuffer(
                    encryptedBuffer,
                    message.mediaIv || message.iv,
                    chatKey
                );

                if (active) {
                    const blob = new Blob([decryptedBuffer], { type: message.mimeType });
                    const url = URL.createObjectURL(blob);
                    setMediaUrl(url);
                }
            } catch (err) {
                console.error("Media decryption error:", err);
                if (active) setError(true);
            } finally {
                if (active) setDecrypting(false);
            }
        };


        if (message.type === 'image' || message.type === 'video' || message.imageUrl || message.videoUrl) {
            loadMedia();
        }

        return () => {
            active = false;
            if (mediaUrl && mediaUrl.startsWith('blob:')) {
                URL.revokeObjectURL(mediaUrl);
            }
        };
    }, [message, chatId, currentUser?.uid]);

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate();
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleAvatarClick = () => {
        if (sender?.uid && onUserClick) {
            onUserClick(sender);
        } else if (sender?.uid) {
            navigate(`/user/${sender.uid}`);
        }
    };

    const handleDeleteClick = () => {
        setShowMenu(false);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async (type) => { // 'me' or 'everyone'
        setShowDeleteModal(false);
        try {
            if (type === 'everyone') {
                if (onDelete) {
                    onDelete(message.id, 'everyone');
                } else if (chatId) {
                    await deleteMessage(chatId, message.id);
                }
            } else {
                // Delete for me
                if (onDelete) {
                    onDelete(message.id, 'me');
                } else if (chatId && currentUser?.uid) {
                    await deleteMessageForMe(chatId, message.id, currentUser.uid);
                }
            }
        } catch (err) {
            console.error("Error deleting message:", err);
            alert("Failed to delete message");
        }
    };

    const handleReplyClick = () => {
        if (onReply) {
            onReply({
                ...message,
                senderName: sender?.displayName || 'Unknown'
            });
        }
    };

    const renderTicks = (msg) => {
        // Check for read
        const isRead = msg.readBy && msg.readBy.length > 0;
        if (isRead) {
            return <MdDoneAll className="w-3.5 h-3.5 text-blue-500" />;
        }

        // Check for delivered
        const isDelivered = (msg.deliveredTo && msg.deliveredTo.length > 0) || msg.status === 'delivered';
        if (isDelivered) {
            return <MdDoneAll className="w-3.5 h-3.5 text-gray-400" />;
        }

        // Default: Sent
        return <MdCheck className="w-3.5 h-3.5 text-gray-400" />;
    };

    const getReadStatusTitle = (msg) => {
        if (msg.readAt) {
            const entries = Object.entries(msg.readAt);
            if (entries.length > 0) {
                const first = entries[0][1];
                if (first && first.toDate) {
                    return `Seen at ${formatTime(first)}`;
                }
            }
        }
        return msg.status || 'Sent';
    };

    return (
        <>
            <div
                className={`flex mb-4 ${isOwn ? 'justify-end' : 'justify-start'} group relative items-end`}
                onMouseLeave={() => setShowMenu(false)}
            >
                {/* Avatar for received messages */}
                {!isOwn && (
                    <div className="mr-2 mb-1">
                        <Avatar
                            user={sender}
                            size="w-8 h-8"
                            onClick={handleAvatarClick}
                        />
                    </div>
                )}

                <div className={`relative max-w-[70%] rounded-2xl p-3 shadow-glass backdrop-blur-md border border-white/10 overflow-hidden ${isOwn
                    ? 'bg-[rgba(0,194,255,0.15)] rounded-br-none'
                    : 'bg-gray-200 rounded-bl-none'
                    }`}>

                    {/* Sender Name in Group */}
                    {/* Sender Name in Group */}
                    {isGroup && !isOwn && sender && (
                        <p
                            className="text-xs font-bold text-[#0C4DA2] mb-1 cursor-pointer hover:underline"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleAvatarClick();
                            }}
                        >
                            {sender.displayName || sender.name || 'Unknown User'}
                        </p>
                    )}

                    {/* Reply Context */}
                    {message.replyTo && (
                        <div className="mb-2 p-2 rounded-lg bg-black/5 border-l-4 border-accent/50 text-xs">
                            <p className="font-bold text-accent mb-0.5">{message.replyTo.senderName}</p>
                            <p className="opacity-70 truncate">
                                {message.replyTo.text && message.replyTo.text.length > 100
                                    ? message.replyTo.text.substring(0, 100) + '...'
                                    : message.replyTo.text}
                            </p>
                        </div>
                    )}

                    {/* Media Content */}
                    {(message.type === 'image' || message.imageUrl) && (
                        <div className="mb-2 rounded-lg overflow-hidden bg-black/20 min-h-[150px] flex items-center justify-center">
                            {mediaUrl ? (
                                <img
                                    src={mediaUrl}
                                    alt="Sent image"
                                    className="max-w-full max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => setShowLightbox(true)}
                                />
                            ) : decrypting ? (
                                <div className="text-xs text-text-secondary animate-pulse">Decrypting image...</div>
                            ) : error ? (
                                <div className="text-xs text-red-400">Failed to load image</div>
                            ) : null}
                        </div>
                    )}

                    {(message.type === 'video' || message.videoUrl) && (
                        <div className="mb-2 rounded-lg overflow-hidden bg-black/20 min-h-[150px] flex items-center justify-center">
                            {mediaUrl ? (
                                <video controls className="max-w-full max-h-64">
                                    <source src={mediaUrl} type={message.mimeType || "video/mp4"} />
                                    Your browser does not support the video tag.
                                </video>
                            ) : decrypting ? (
                                <div className="text-xs text-text-secondary animate-pulse">Decrypting video...</div>
                            ) : error ? (
                                <div className="text-xs text-red-400">Failed to load video</div>
                            ) : null}
                        </div>
                    )}

                    {/* Text */}
                    {message.text && (
                        <div className="text-sm text-text-primary whitespace-pre-wrap break-all leading-relaxed min-w-0">
                            {message.text.length > visibleLimit ? (
                                <>
                                    {message.text.substring(0, visibleLimit)}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setVisibleLimit(prev => prev + 3000);
                                        }}
                                        className="text-accent font-bold cursor-pointer ml-1 hover:underline focus:outline-none active:opacity-70 inline-block"
                                    >
                                        ... Show More
                                    </button>
                                </>
                            ) : (
                                message.text
                            )}
                            {/* "Show Less" option if expanded beyond original limit? 
                                Not implementing for now, user asked for "Show More" functionality 
                            */}
                        </div>
                    )}

                    {/* Metadata */}
                    <div className="flex justify-end items-center space-x-1 mt-1">
                        <span className="text-[10px] text-text-secondary opacity-70">
                            {formatTime(message.createdAt)}
                        </span>
                        {isOwn && (
                            <span className="ml-1" title={getReadStatusTitle(message)}>
                                {renderTicks(message)}
                            </span>
                        )}
                    </div>

                    {/* Actions (Hover) */}
                    <div className={`absolute top-1 ${isOwn ? 'right-1' : 'right-[-40px]'} flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
                        <button
                            className="bg-black/10 hover:bg-black/20 text-text-secondary rounded-full p-1"
                            onClick={handleReplyClick}
                            title="Reply"
                        >
                            <MdReply className="w-4 h-4" />
                        </button>

                        {isOwn && (
                            <button
                                className="text-text-secondary hover:text-text-primary bg-black/10 hover:bg-black/20 rounded-full p-1"
                                onClick={() => setShowMenu(!showMenu)}
                            >
                                <MdExpandMore className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Dropdown Menu */}
                    {showMenu && (
                        <div className="absolute top-6 right-2 glass-panel shadow-lg rounded py-1 z-10 min-w-[120px]">
                            <button
                                onClick={handleDeleteClick}
                                className="w-full text-left px-3 py-2 hover:bg-glass text-red-400 text-sm flex items-center gap-2"
                            >
                                <MdDelete className="w-4 h-4" /> Delete
                            </button>
                        </div>
                    )}
                </div>

                {/* Avatar for own messages (Right side) */}
                {isOwn && (
                    <div className="ml-2 mb-1">
                        <Avatar
                            user={currentUser}
                            size="w-8 h-8"
                            onClick={() => {
                                // For own avatar, maybe show own profile or nothing?
                                // navigate('/profile'); 
                                if (onUserClick) onUserClick(currentUser);
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Lightbox Modal */}
            {showLightbox && mediaUrl && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                    onClick={() => setShowLightbox(false)}
                >
                    <button
                        className="absolute top-4 right-4 text-white hover:text-gray-300 p-2"
                        onClick={() => setShowLightbox(false)}
                    >
                        <MdClose className="w-8 h-8" />
                    </button>
                    <img
                        src={mediaUrl}
                        alt="Full size"
                        className="max-w-full max-h-full object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            {showDeleteModal && (
                <ConfirmationModal
                    title="Delete Message?"
                    message={`Are you sure you want to delete this message? ${isOwn ? '"Delete for everyone" will remove it for all participants.' : 'It will be removed from your chat view.'}`}
                    onClose={() => setShowDeleteModal(false)}
                    options={[
                        ...(isOwn ? [{
                            label: "Delete for everyone",
                            variant: 'danger',
                            onClick: () => handleConfirmDelete('everyone')
                        }] : []),
                        {
                            label: "Delete for me",
                            variant: 'primary',
                            onClick: () => handleConfirmDelete('me')
                        }
                    ]}
                />
            )}
        </>
    );
};

export default MessageBubble;
