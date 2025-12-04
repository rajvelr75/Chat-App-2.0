import { useState } from 'react';
import { createChatWithEmail } from '../services/chatService';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MdClose } from 'react-icons/md';

const NewChatModal = ({ onClose }) => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        setError('');

        try {
            const chatId = await createChatWithEmail(currentUser, email);
            onClose();
            navigate(`/chat/${chatId}`);
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-sidebar-bg w-full max-w-md rounded-lg shadow-xl border border-gray-700">
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-text-primary text-lg font-medium">New Chat</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
                        <MdClose className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {error && <div className="bg-red-500 bg-opacity-10 text-red-500 p-2 rounded text-sm">{error}</div>}
                    <div>
                        <label className="block text-sm text-text-secondary mb-1">User Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-app-bg border border-gray-600 rounded p-2 text-text-primary focus:outline-none focus:border-accent"
                            placeholder="Enter email address"
                            autoFocus
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-accent hover:bg-opacity-90 text-white font-medium py-2 rounded transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Starting Chat...' : 'Start Chat'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default NewChatModal;
