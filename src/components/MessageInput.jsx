import { useState, useRef } from 'react';
import { MdSend, MdAttachFile, MdClose } from 'react-icons/md';
import { validateFile } from '../utils/uploadHelpers';
import { useAuth } from '../context/AuthContext';
import { encryptFile, generateVideoThumbnail, chunkArrayBuffer } from '../services/mediaCryptoService';
import { getChatKey } from '../services/cryptoService';
import { uploadEncryptedChunks, sendMediaMessage } from '../services/chatService';
import { doc, collection } from 'firebase/firestore';
import { db } from '../services/firebase';
import PendingUploadBubble from './PendingUploadBubble';

const MessageInput = ({ chatId, onSendMessage }) => {
    const { currentUser } = useAuth();
    const [message, setMessage] = useState('');
    const [attachment, setAttachment] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const fileInputRef = useRef(null);

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
                const metadata = {
                    messageId,
                    type: attachment.type.startsWith('image/') ? 'image' : 'video',
                    mimeType,
                    iv,
                    chunkCount: chunks.length,
                    ...thumbnailMetadata
                };

                await sendMediaMessage(chatId, currentUser.uid, metadata);
            } else {
                // Text only message
                await onSendMessage(message, null);
            }

            setMessage('');
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
        <div className="p-3 glass-panel border-t border-glass relative">
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

            {/* Preview Area (Before Send) */}
            {!uploading && previewUrl && (
                <div className="mb-2 relative inline-block">
                    <div className="relative rounded-lg overflow-hidden border border-glass max-h-32">
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
                    onClick={() => fileInputRef.current?.click()}
                    className="text-text-secondary hover:text-accent p-2 transition-colors"
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
                    className="flex-1 glass-input rounded-full px-4 py-2 text-text-primary placeholder-text-secondary focus:ring-1 focus:ring-accent transition-all"
                    disabled={uploading}
                />

                <button
                    type="submit"
                    disabled={(!message.trim() && !attachment) || uploading}
                    className="glass-button rounded-full p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <MdSend className="w-5 h-5" />
                </button>
            </form>
        </div>
    );
};

export default MessageInput;
