import { useState } from 'react';
import { createGroupChat } from '../services/chatService';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MdClose, MdAdd, MdDelete } from 'react-icons/md';

const NewGroupModal = ({ onClose }) => {
    const [groupName, setGroupName] = useState('');
    const [description, setDescription] = useState('');
    const [email, setEmail] = useState('');
    const [members, setMembers] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const handleAddMember = (e) => {
        e.preventDefault();
        if (!email) return;
        if (members.includes(email)) {
            setError('User already added');
            return;
        }
        if (email === currentUser.email) {
            setError('You are already in the group');
            return;
        }
        setMembers([...members, email]);
        setEmail('');
        setError('');
    };

    const handleRemoveMember = (emailToRemove) => {
        setMembers(members.filter(m => m !== emailToRemove));
    };

    const handleSubmit = async () => {
        if (!groupName) {
            setError('Group name is required');
            return;
        }
        if (members.length < 2) {
            setError('Group must have at least 2 other members'); // Requirement says min 2 members added
            return;
        }

        setLoading(true);
        setError('');

        try {
            const chatId = await createGroupChat(currentUser, groupName, members, description);
            onClose();
            navigate(`/chat/${chatId}`);
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-sidebar-bg w-full max-w-md rounded-lg shadow-xl border border-gray-700 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-text-primary text-lg font-medium">New Group</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
                        <MdClose className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-4 space-y-4 overflow-y-auto">
                    {error && <div className="bg-red-500 bg-opacity-10 text-red-500 p-2 rounded text-sm">{error}</div>}

                    <div>
                        <label className="block text-sm text-text-secondary mb-1">Group Name</label>
                        <input
                            type="text"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            className="w-full bg-app-bg border border-gray-600 rounded p-2 text-text-primary focus:outline-none focus:border-accent"
                            placeholder="Enter group name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-text-secondary mb-1">Description (Optional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-app-bg border border-gray-600 rounded p-2 text-text-primary focus:outline-none focus:border-accent resize-none h-20"
                            placeholder="Add a group description..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-text-secondary mb-1">Add Members (Email)</label>
                        <div className="flex gap-2">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="flex-1 bg-app-bg border border-gray-600 rounded p-2 text-text-primary focus:outline-none focus:border-accent"
                                placeholder="User email"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddMember(e)}
                            />
                            <button
                                onClick={handleAddMember}
                                className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded"
                            >
                                <MdAdd className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {members.length > 0 && (
                        <div className="space-y-2">
                            <label className="block text-sm text-text-secondary">Participants ({members.length})</label>
                            <div className="bg-app-bg rounded p-2 space-y-1 max-h-32 overflow-y-auto">
                                {members.map(m => (
                                    <div key={m} className="flex items-center justify-between text-sm text-text-primary bg-gray-700 bg-opacity-30 p-1 rounded">
                                        <span>{m}</span>
                                        <button onClick={() => handleRemoveMember(m)} className="text-red-400 hover:text-red-300">
                                            <MdDelete className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-700">
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-accent hover:bg-opacity-90 text-white font-medium py-2 rounded transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Creating Group...' : 'Create Group'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewGroupModal;
