import { useState, useEffect } from 'react';
import { downloadPublicChunks } from '../services/chatService';

const avatarCache = {};

const Avatar = ({ user, size = "w-10 h-10", className = "", onClick, showStatus = false }) => {
    const [imageUrl, setImageUrl] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let active = true;
        const loadAvatar = async () => {
            if (!user?.photoURL) {
                setImageUrl(null);
                return;
            }

            if (user.photoURL.startsWith('firestore://')) {
                const fileId = user.photoURL.replace('firestore://', '');

                // Check cache first
                if (avatarCache[fileId]) {
                    setImageUrl(avatarCache[fileId]);
                    return;
                }

                setLoading(true);
                try {
                    const buffer = await downloadPublicChunks(fileId);
                    if (active) {
                        const blob = new Blob([buffer], { type: 'image/jpeg' }); // Assume JPEG
                        const url = URL.createObjectURL(blob);
                        avatarCache[fileId] = url; // Cache the URL
                        setImageUrl(url);
                    }
                } catch (err) {
                    console.error("Failed to load avatar", err);
                } finally {
                    if (active) setLoading(false);
                }
            } else {
                setImageUrl(user.photoURL);
            }
        };

        loadAvatar();
        return () => { active = false; };
    }, [user?.photoURL]);

    const initials = user?.displayName ? user.displayName[0].toUpperCase() : '?';

    return (
        <div
            className={`relative rounded-full overflow-hidden flex-shrink-0 bg-gray-700 border border-glass flex items-center justify-center ${size} ${className} ${onClick ? 'cursor-pointer' : ''}`}
            onClick={onClick}
        >
            {imageUrl ? (
                <img src={imageUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
                <span className="text-gray-300 font-bold text-sm select-none">
                    {initials}
                </span>
            )}

            {/* Online Status Indicator (Optional) */}
            {showStatus && user?.isOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-app-bg"></div>
            )}
        </div>
    );
};

export default Avatar;
