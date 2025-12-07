import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MdExpandMore, MdDelete, MdClose, MdReply, MdCheck, MdDoneAll } from 'react-icons/md';
import { deleteMessage, downloadChunks } from '../services/chatService';
import { getChatKey } from '../services/cryptoService';
import { decryptArrayBuffer, combineChunks } from '../services/mediaCryptoService';
import Avatar from './Avatar';

const MessageBubble = ({ message, isGroup, sender, onDelete, chatId, onReply }) => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const isOwn = message.senderId === currentUser?.uid;
    const [showMenu, setShowMenu] = useState(false);
    const [mediaUrl, setMediaUrl] = useState(null);
    const [decrypting, setDecrypting] = useState(false);
    const [error, setError] = useState(false);
    const [showLightbox, setShowLightbox] = useState(false);

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
        if (sender?.uid) {
            navigate(`/user/${sender.uid}`);
        }
    };

    const handleDelete = async () => {
        if (window.confirm("Delete this message?")) {
            if (onDelete) {
                onDelete(message.id);
            } else {
                if (chatId) await deleteMessage(chatId, message.id);
            }
            setShowMenu(false);
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
        if (!msg.status || msg.status === 'sent') {
            return <MdCheck className="w-3.5 h-3.5 text-gray-400" />;
        }

        // Check for read
        const isRead = msg.readBy && msg.readBy.length > 0;
        // For 1:1, if readBy has anyone (implied other user), it's read.
        // For group, we might want more complex logic, but "blue ticks" if read by someone is OK for now
        // OR better: if readBy includes all other members? User asked for WhatsApp style.
        // Simplified: Blue if read by at least one person (or specific logic for 1:1)

        if (isRead) {
            return <MdDoneAll className="w-3.5 h-3.5 text-blue-500" />;
        }

        // Delivered
        return <MdDoneAll className="w-3.5 h-3.5 text-gray-400" />;
    };

    const getReadStatusTitle = (msg) => {
        if (msg.readAt) {
            // If 1:1, usually just one key.
            const entries = Object.entries(msg.readAt);
            if (entries.length > 0) {
                // Format first one? Or list?
                // "Seen at HH:MM"
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

                <div className={`relative max-w-[70%] rounded-2xl p-3 shadow-glass backdrop-blur-md border border-white/10 ${isOwn
                    ? 'bg-[rgba(0,194,255,0.15)] rounded-br-none'
                    : 'bg-gray-200 rounded-bl-none'
                    }`}>

                    {/* Sender Name in Group */}
                    {isGroup && !isOwn && (
                        <p
                            className="text-xs font-bold text-accent mb-1 cursor-pointer hover:underline"
                            onClick={handleAvatarClick}
                        >
                            {sender?.displayName || 'Unknown'}
                        </p>
                    )}

                    {/* Reply Context */}
                    {message.replyTo && (
                        <div className="mb-2 p-2 rounded-lg bg-black/5 border-l-4 border-accent/50 text-xs">
                            <p className="font-bold text-accent mb-0.5">{message.replyTo.senderName}</p>
                            <p className="opacity-70 truncate">{message.replyTo.text}</p>
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
                        <p className="text-sm text-text-primary whitespace-pre-wrap break-words leading-relaxed">
                            {message.text}
                        </p>
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
                                onClick={handleDelete}
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
                            onClick={() => navigate('/profile')}
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
        </>
    );
};

export default MessageBubble;
