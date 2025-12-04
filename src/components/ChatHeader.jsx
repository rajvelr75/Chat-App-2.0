import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdMoreVert, MdArrowBack, MdDeleteSweep } from 'react-icons/md';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import Avatar from './Avatar';

const ChatHeader = ({ chat, otherUser: initialOtherUser, onClearChat }) => {
    const navigate = useNavigate();
    const [showMenu, setShowMenu] = useState(false);
    const [otherUser, setOtherUser] = useState(initialOtherUser);

    useEffect(() => {
        if (!chat.isGroup && initialOtherUser?.uid) {
            const unsub = onSnapshot(doc(db, "users", initialOtherUser.uid), (doc) => {
                if (doc.exists()) {
                    setOtherUser({ uid: doc.id, ...doc.data() });
                }
            });
            return () => unsub();
        } else {
            setOtherUser(initialOtherUser);
        }
    }, [chat, initialOtherUser]);

    const isGroup = chat.isGroup;
    const displayUser = isGroup
        ? { displayName: chat.name, photoURL: chat.photoURL }
        : otherUser;

    const displayName = displayUser?.displayName;

    let status = '';
    if (isGroup) {
        status = `${chat.members.length} members`;
    } else {
        if (otherUser?.isOnline) {
            status = 'Online';
        } else if (otherUser?.lastSeen) {
            const date = otherUser.lastSeen.toDate();
            status = `Last seen at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            status = 'Offline';
        }
    }

    const handleProfileClick = () => {
        if (isGroup) {
            navigate(`/group/${chat.id}`);
        } else if (otherUser) {
            navigate(`/user/${otherUser.uid}`);
        }
    };

    return (
        <div className="h-16 glass-panel flex items-center justify-between px-4 border-b border-glass flex-shrink-0 z-10">
            <div className="flex items-center">
                <button onClick={() => navigate('/')} className="mr-2 text-text-secondary md:hidden">
                    <MdArrowBack className="w-6 h-6" />
                </button>

                <div
                    className="flex items-center cursor-pointer"
                    onClick={handleProfileClick}
                >
                    <div className="mr-3">
                        <Avatar user={displayUser} size="w-10 h-10" />
                    </div>

                    <div>
                        <h2 className="text-text-primary font-medium">{displayName}</h2>
                        <div className="flex items-center">
                            {status === 'Online' && <div className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></div>}
                            <p className="text-xs text-text-secondary">{status}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative">
                <button onClick={() => setShowMenu(!showMenu)} className="text-text-secondary hover:text-text-primary">
                    <MdMoreVert className="w-6 h-6" />
                </button>

                {showMenu && (
                    <div className="absolute right-0 top-8 glass-panel shadow-lg rounded py-2 w-48 z-10">
                        <button
                            onClick={() => { handleProfileClick(); setShowMenu(false); }}
                            className="w-full text-left px-4 py-2 hover:bg-glass text-text-primary"
                        >
                            {isGroup ? 'Group Info' : 'Contact Info'}
                        </button>
                        <button
                            onClick={() => { onClearChat(); setShowMenu(false); }}
                            className="w-full text-left px-4 py-2 hover:bg-glass text-red-400 flex items-center gap-2"
                        >
                            <MdDeleteSweep className="w-5 h-5" /> Clear Chat
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatHeader;
