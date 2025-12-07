import { useState, useRef, useEffect } from 'react';
import { MdSend, MdAttachFile, MdClose, MdSentimentSatisfiedAlt } from 'react-icons/md';
import EmojiPicker from 'emoji-picker-react';
import { validateFile } from '../utils/uploadHelpers';
import { useAuth } from '../context/AuthContext';
import { encryptFile, generateVideoThumbnail, chunkArrayBuffer } from '../services/mediaCryptoService';
import { getChatKey, encryptMessage } from '../services/cryptoService';
import { uploadEncryptedChunks, sendMediaMessage } from '../services/chatService';
import { doc, collection } from 'firebase/firestore';
import { db } from '../services/firebase';
import PendingUploadBubble from './PendingUploadBubble';

const MessageInput = ({ chatId, onSendMessage, replyingTo, onCancelReply }) => {
    const { currentUser } = useAuth();
    const [message, setMessage] = useState('');
    const [attachment, setAttachment] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const fileInputRef = useRef(null);
    const pickerRef = useRef(null);

    // Close picker on outside click or ESC
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                pickerRef.current &&
                !pickerRef.current.contains(event.target) &&
                !event.target.closest('.emoji-btn')
            ) {
                setShowEmojiPicker(false);
            }
        };

        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                setShowEmojiPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEsc);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEsc);
        };
    }, []);

    const onEmojiClick = (emojiObject) => {
        setMessage((prev) => prev + emojiObject.emoji);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const validation = validateFile(file);
        if (!validation.valid) {
            alert(validation.error);
            return;
        }

        setAttachment(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const clearAttachment = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setAttachment(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if ((!message.trim() && !attachment) || uploading) return;

        setUploading(true);
        try {
            if (attachment) {
                if (!currentUser?.uid) throw new Error("User not authenticated");
                const chatKey = await getChatKey(chatId, currentUser.uid);
                if (!chatKey) throw new Error("Could not retrieve chat key for encryption");

                // 1. Generate Message ID upfront
                const messageRef = doc(collection(db, "chats", chatId, "messages"));
                const messageId = messageRef.id;

                let thumbnailMetadata = {};

                // Handle Video Thumbnail
                if (attachment.type.startsWith('video/')) {
                    try {
                        const thumbnailBlob = await generateVideoThumbnail(attachment);
                        const { encryptedBuffer: thumbBuf, iv: thumbIv } = await encryptFile(thumbnailBlob, chatKey);
                        const thumbChunks = chunkArrayBuffer(thumbBuf);

                        // Upload thumbnail chunks
                        const { setDoc, doc } = await import('firebase/firestore');
                        const { db } = await import('../services/firebase');

                        const thumbUploadPromises = thumbChunks.map(async (chunk) => {
                            await setDoc(doc(db, "mediaChunks", messageId, "thumbnailChunks", chunk.index.toString()), {
                                index: chunk.index,
                                data: chunk.data
                            });
                        });
                        await Promise.all(thumbUploadPromises);

                        thumbnailMetadata = {
                            thumbnailAvailable: true,
                            thumbnailChunkCount: thumbChunks.length,
                            thumbnailIv: thumbIv
                        };
                    } catch (err) {
                        console.error("Thumbnail generation failed", err);
                    }
                }

                // 2. Encrypt Main File
                const { encryptedBuffer, iv, mimeType } = await encryptFile(attachment, chatKey);

                // 3. Chunk
                const chunks = chunkArrayBuffer(encryptedBuffer);

                // 4. Upload Chunks
                await uploadEncryptedChunks(messageId, chunks, (prog) => {
                    setProgress(prog);
                });

                // 5. Send Message Doc
                // Encrypt Caption if present
                let textCiphertext = null;
                let textIv = null;
                if (message.trim()) {
                    const encryptedText = await encryptMessage(message.trim(), chatKey);
                    textCiphertext = encryptedText.ciphertext;
                    textIv = encryptedText.iv;
                }

                const metadata = {
                    messageId,
                    type: attachment.type.startsWith('image/') ? 'image' : 'video',
                    mimeType,
                    mediaIv: iv, // Explicitly name it mediaIv
                    chunkCount: chunks.length,
                    textCiphertext,
                    textIv,
                    replyTo: replyingTo ? {
                        id: replyingTo.id,
                        text: replyingTo.text ? (replyingTo.text.length > 50 ? replyingTo.text.substring(0, 50) + '...' : replyingTo.text) : (replyingTo.type === 'image' ? 'Photo' : 'Video'),
                        senderName: replyingTo.senderName || 'User'
                    } : null,
                    ...thumbnailMetadata
                };

                await sendMediaMessage(chatId, currentUser.uid, metadata);
            } else {
                // Text only message
                await onSendMessage(message, null);
            }

            setMessage('');
            setShowEmojiPicker(false); // Close picker on send
            clearAttachment();
        } catch (error) {
            console.error("Error sending message:", error);
            alert("Failed to send message: " + error.message);
        } finally {
            setUploading(false);
            setProgress(0);
        }
    };

    return (
        <div className="p-3 bg-[#F0F4F8] border-t border-[#E8E8E8] relative shadow-inner">
            {/* Emoji Picker */}
            {showEmojiPicker && (
                <div
                    ref={pickerRef}
                    className="absolute bottom-full left-0 mb-3 z-50 w-full sm:w-auto sm:min-w-[320px] animate-fade-in-up"
                    style={{
                        filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))'
                    }}
                >
                    <div className="bg-white/15 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-xl">
                        <EmojiPicker
                            onEmojiClick={onEmojiClick}
                            width="100%"
                            height={350}
                            previewConfig={{ showPreview: false }}
                            searchDisabled={false}
                            skinTonesDisabled
                        />
                    </div>
                </div>
            )}
            {/* Pending Upload Bubble (Overlay/Preview) */}
            {uploading && attachment && (
                <div className="absolute bottom-full left-0 right-0 p-4 bg-transparent pointer-events-none">
                    <PendingUploadBubble
                        progress={progress}
                        type={attachment.type.startsWith('video/') ? 'video' : 'image'}
                        previewUrl={previewUrl}
                    />
                </div>
            )}


            {/* Reply Preview */}
            {replyingTo && (
                <div className="mx-2 mb-2 p-2 bg-white/80 rounded-lg border-l-4 border-[#0C4DA2] flex justify-between items-center shadow-sm backdrop-blur-sm">
                    <div className="flex-1 overflow-hidden">
                        <p className="text-xs font-bold text-[#0C4DA2] mb-0.5">Replying to {replyingTo.senderName || 'User'}</p>
                        <p className="text-xs text-gray-600 truncate">
                            {replyingTo.text
                                ? (replyingTo.text.length > 50 ? replyingTo.text.substring(0, 50) + '...' : replyingTo.text)
                                : (replyingTo.type === 'image' ? '📷 Photo' : '🎥 Video')}
                        </p>
                    </div>
                    <button
                        onClick={onCancelReply}
                        className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
                    >
                        <MdClose className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Preview Area (Before Send) */}
            {!uploading && previewUrl && (
                <div className="mb-2 relative inline-block">
                    <div className="relative rounded-lg overflow-hidden border border-gray-200 max-h-32 shadow-sm">
                        {attachment.type.startsWith('video/') ? (
                            <video src={previewUrl} className="h-32 w-auto" />
                        ) : (
                            <img src={previewUrl} alt="Preview" className="h-32 w-auto object-cover" />
                        )}
                        <button
                            onClick={clearAttachment}
                            className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
                        >
                            <MdClose className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="emoji-btn text-[#0C4DA2]/70 hover:text-[#0C4DA2] p-2 transition-all duration-200 rounded-full hover:bg-white/50 hover:scale-110 active:scale-95"
                    disabled={uploading}
                >
                    <MdSentimentSatisfiedAlt className="w-7 h-7" />
                </button>

                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[#0C4DA2]/70 hover:text-[#0C4DA2] p-2 transition-colors rounded-full hover:bg-white/50"
                    disabled={uploading}
                >
                    <MdAttachFile className="w-6 h-6" />
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                />

                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-white border border-transparent focus:border-[#0C4DA2]/30 rounded-full px-4 py-2 text-[#313131] placeholder-gray-400 focus:ring-2 focus:ring-[#0C4DA2]/20 transition-all shadow-sm outline-none"
                    disabled={uploading}
                />

                <button
                    type="submit"
                    disabled={(!message.trim() && !attachment) || uploading}
                    className="bg-gradient-to-r from-[#0C4DA2] to-[#093d80] text-white rounded-full p-2.5 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transform active:scale-95 transition-all shadow-md"
                >
                    <MdSend className="w-5 h-5 ml-0.5" />
                </button>
            </form>
        </div>
    );
};

export default MessageInput;
