import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { MdArrowBack, MdEmail, MdAccessTime } from 'react-icons/md';
import Avatar from '../components/Avatar';

const UserDetailsPage = () => {
    const { uid } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (uid) {
            const unsub = onSnapshot(doc(db, "users", uid), (doc) => {
                if (doc.exists()) {
                    setUser(doc.data());
                }
                setLoading(false);
            });
            return () => unsub();
        }
    }, [uid]);

    if (loading) return <div className="flex items-center justify-center h-full text-text-secondary">Loading...</div>;
    if (!user) return <div className="flex items-center justify-center h-full text-text-secondary">User not found</div>;

    const status = user.isOnline
        ? 'Online'
        : (user.lastSeen ? `Last seen: ${user.lastSeen.toDate().toLocaleString()}` : 'Offline');

    return (
        <div className="flex flex-col h-full bg-app-bg">
            {/* Header */}
            <div className="h-16 glass-panel flex items-center px-4 border-b border-glass">
                <button onClick={() => navigate(-1)} className="mr-4 text-text-secondary hover:text-text-primary transition-colors">
                    <MdArrowBack className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-medium text-text-primary">Contact Info</h1>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="max-w-2xl mx-auto space-y-8 glass-panel p-8 rounded-2xl">
                    {/* Photo */}
                    <div className="flex justify-center">
                        <Avatar
                            user={user}
                            size="w-40 h-40"
                            className="border-4 border-glass shadow-glass text-4xl"
                        />
                    </div>

                    {/* Name */}
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-text-primary">{user.displayName}</h2>
                        <p className="text-accent font-medium mt-1">{status}</p>
                    </div>

                    <div className="space-y-6 pt-4 border-t border-glass">
                        {/* About */}
                        <div className="space-y-1">
                            <label className="text-text-secondary text-xs uppercase tracking-wider font-semibold">About</label>
                            <p className="text-text-primary text-lg">{user.about || 'Available'}</p>
                        </div>

                        {/* Email */}
                        <div className="space-y-1">
                            <label className="text-text-secondary text-xs uppercase tracking-wider font-semibold flex items-center gap-2">
                                <MdEmail className="w-4 h-4" /> Email
                            </label>
                            <p className="text-text-primary">{user.email}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserDetailsPage;
