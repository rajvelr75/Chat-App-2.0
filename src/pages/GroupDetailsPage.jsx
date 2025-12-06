import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, arrayUnion, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { MdArrowBack, MdPersonAdd, MdGroup, MdEdit, MdCheck, MdCameraAlt, MdDelete, MdSecurity } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import { updateGroupName, updateGroupPhoto, makeAdmin, removeParticipant, checkAdmin, addParticipant, uploadPublicChunks, updateGroupDescription } from '../services/chatService';
import { validateFile } from '../utils/uploadHelpers';
import Avatar from '../components/Avatar';

const GroupDetailsPage = ({ chatId: propChatId, onClose }) => {
    const { groupId: paramGroupId } = useParams();
    const groupId = propChatId || paramGroupId;

    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [chat, setChat] = useState(null);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newMemberEmail, setNewMemberEmail] = useState('');
    const [addingMember, setAddingMember] = useState(false);

    // Admin States
    const [isAdmin, setIsAdmin] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [newName, setNewName] = useState('');
    const [editingDescription, setEditingDescription] = useState(false);
    const [newDescription, setNewDescription] = useState('');
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (groupId) {
            const unsub = onSnapshot(doc(db, "chats", groupId), async (chatDoc) => {
                if (chatDoc.exists()) {
                    const chatData = chatDoc.data();
                    const fullChat = { id: chatDoc.id, ...chatData, isGroup: true };
                    setChat(fullChat);
                    setNewName(chatData.name);
                    setNewDescription(chatData.description || '');
                    setIsAdmin(checkAdmin(fullChat, currentUser?.uid));
                }
                setLoading(false);
            });
            return () => unsub();
        }
    }, [groupId, currentUser?.uid]);

    useEffect(() => {
        const fetchMembers = async () => {
            if (chat?.members) {
                const memberPromises = chat.members.map(async (uid) => {
                    const q = query(collection(db, "users"), where("uid", "==", uid));
                    const snap = await getDocs(q);
                    if (!snap.empty) return snap.docs[0].data();
                    return { uid, displayName: 'Unknown' };
                });
                const resolvedMembers = await Promise.all(memberPromises);
                setMembers(resolvedMembers);
            }
        };
        fetchMembers();
    }, [chat?.members]);

    const handleUpdateName = async () => {
        if (!newName.trim() || newName === chat.name) {
            setEditingName(false);
            return;
        }
        try {
            await updateGroupName(groupId, newName);
            setEditingName(false);
        } catch (error) {
            console.error("Error updating group name:", error);
            alert("Failed to update group name");
        }
    };

    const handleUpdateDescription = async () => {
        if (newDescription === chat.description) {
            setEditingDescription(false);
            return;
        }
        try {
            await updateGroupDescription(groupId, newDescription);
            setEditingDescription(false);
        } catch (error) {
            console.error("Error updating group description:", error);
            alert("Failed to update group description");
        }
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const validation = validateFile(file);
        if (!validation.valid) {
            alert(validation.error);
            return;
        }

        setUploadingPhoto(true);
        try {
            const fileId = `group_${groupId}_${Date.now()}`;
            const url = await uploadPublicChunks(fileId, file);
            await updateGroupPhoto(groupId, url);
        } catch (error) {
            console.error("Error updating group photo:", error);
            alert("Failed to update group photo");
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleAddMember = async (e) => {
        e.preventDefault();
        if (!newMemberEmail.trim()) return;

        setAddingMember(true);
        try {
            const q = query(collection(db, "users"), where("email", "==", newMemberEmail));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                alert("User not found");
                setAddingMember(false);
                return;
            }

            const newUser = querySnapshot.docs[0].data();

            if (chat.members.includes(newUser.uid)) {
                alert("User is already a member");
                setAddingMember(false);
                return;
            }

            // Use the service function to handle key distribution
            if (currentUser?.uid) {
                await addParticipant(groupId, newUser.uid, currentUser.uid);
            }

            setNewMemberEmail('');
            alert("Member added!");

        } catch (error) {
            console.error("Error adding member:", error);
            alert("Failed to add member: " + error.message);
        }
        setAddingMember(false);
    };

    const handleMakeAdmin = async (userId) => {
        if (!window.confirm("Promote this user to Admin?")) return;
        try {
            await makeAdmin(groupId, userId);
        } catch (error) {
            console.error("Error promoting admin:", error);
        }
    };

    const handleRemoveMember = async (userId) => {
        if (!window.confirm("Remove this user from the group?")) return;
        try {
            await removeParticipant(groupId, userId);
        } catch (error) {
            console.error("Error removing member:", error);
        }
    };

    if (loading) return <div className="flex items-center justify-center h-full text-text-secondary">Loading...</div>;
    if (!chat) return <div className="flex items-center justify-center h-full text-text-secondary">Group not found</div>;

    return (
        <div className="flex flex-col h-full bg-app-bg border-l border-glass relative overflow-hidden w-full md:w-[400px]">
            {/* Header */}
            <div className="h-16 flex items-center px-4 z-20 border-b border-glass bg-glass-panel/30">
                <button
                    onClick={() => onClose ? onClose() : navigate(-1)}
                    className="p-2 rounded-full hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors mr-2"
                >
                    <MdArrowBack className="w-6 h-6" />
                </button>
                <h2 className="text-lg font-medium text-text-primary">Group Info</h2>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar z-10">
                <div className="max-w-4xl mx-auto px-4 pb-10">

                    {/* Hero Section */}
                    <div className="flex flex-col items-center mb-10">
                        <div className="relative group mb-6">
                            <div
                                className={`relative rounded-full p-1 border-2 border-accent/50 shadow-[0_0_30px_rgba(var(--accent-rgb),0.3)] ${isAdmin ? 'cursor-pointer hover:scale-105 transition-transform duration-300' : ''}`}
                                onClick={() => isAdmin && fileInputRef.current?.click()}
                            >
                                <Avatar
                                    user={{ displayName: chat.name, photoURL: chat.photoURL }}
                                    size="w-32 h-32 md:w-40 md:h-40"
                                    className="text-5xl"
                                />
                                {isAdmin && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <MdCameraAlt className="w-8 h-8 text-white drop-shadow-lg" />
                                    </div>
                                )}
                            </div>

                            {/* Hidden Input */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                disabled={!isAdmin || uploadingPhoto}
                            />
                        </div>

                        {/* Group Name & Stats */}
                        <div className="text-center space-y-2 w-full max-w-lg mb-4">
                            {editingName ? (
                                <div className="flex items-center justify-center gap-2">
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-center text-2xl font-bold text-text-primary focus:outline-none focus:border-accent w-full"
                                        autoFocus
                                    />
                                    <button onClick={handleUpdateName} className="p-2 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors shadow-lg">
                                        <MdCheck className="w-6 h-6" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-3 group">
                                    <h1 className="text-3xl md:text-4xl font-bold text-text-primary tracking-tight">{chat.name}</h1>
                                    {isAdmin && (
                                        <button
                                            onClick={() => setEditingName(true)}
                                            className="text-text-secondary hover:text-accent opacity-0 group-hover:opacity-100 transition-all duration-300 transform hover:scale-110"
                                        >
                                            <MdEdit className="w-6 h-6" />
                                        </button>
                                    )}
                                </div>
                            )}
                            <p className="text-text-secondary font-medium bg-white/5 inline-block px-4 py-1 rounded-full text-sm backdrop-blur-md border border-white/5">
                                {members.length} {members.length === 1 ? 'member' : 'members'}
                            </p>
                        </div>

                        {/* Group Description */}
                        <div className="w-full max-w-lg text-center px-4">
                            {editingDescription ? (
                                <div className="flex flex-col gap-2">
                                    <textarea
                                        value={newDescription}
                                        onChange={(e) => setNewDescription(e.target.value)}
                                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-text-primary focus:outline-none focus:border-accent w-full resize-none h-24 custom-scrollbar text-sm"
                                        placeholder="Add a group description..."
                                        autoFocus
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => { setEditingDescription(false); setNewDescription(chat.description || ''); }}
                                            className="px-3 py-1 text-sm text-text-secondary hover:text-text-primary"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleUpdateDescription}
                                            className="px-3 py-1 text-sm bg-accent text-black rounded-lg hover:bg-accent/90 shadow-md"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="group relative">
                                    {chat.description ? (
                                        <p className="text-text-secondary/80 text-sm leading-relaxed whitespace-pre-wrap">{chat.description}</p>
                                    ) : (
                                        isAdmin && <p className="text-text-secondary/50 text-sm italic cursor-pointer hover:text-accent" onClick={() => setEditingDescription(true)}>Add a group description...</p>
                                    )}
                                    {isAdmin && chat.description && (
                                        <button
                                            onClick={() => setEditingDescription(true)}
                                            className="absolute -right-6 top-0 text-text-secondary hover:text-accent opacity-0 group-hover:opacity-100 transition-all duration-300"
                                        >
                                            <MdEdit className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Members Section */}
                    <div className="bg-glass-panel/50 backdrop-blur-md rounded-3xl overflow-hidden border border-white/5 shadow-xl">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-text-primary font-semibold text-lg">Participants</h3>
                            <span className="text-text-secondary text-sm bg-white/5 px-3 py-1 rounded-full">{members.length}</span>
                        </div>


                        {/* Add Member (Admin Only) */}
                        {isAdmin && (
                            <div className="p-4 bg-gray-50 border-b border-gray-100">
                                <form onSubmit={handleAddMember} className="flex items-center gap-2">
                                    <input
                                        type="email"
                                        value={newMemberEmail}
                                        onChange={(e) => setNewMemberEmail(e.target.value)}
                                        placeholder="Add participant by email..."
                                        className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-[#0C4DA2]/20 focus:border-[#0C4DA2] text-gray-900 placeholder-gray-400 outline-none transition-all text-sm"
                                    />
                                    <button
                                        type="submit"
                                        disabled={addingMember || !newMemberEmail.trim()}
                                        className="p-3 bg-[#0C4DA2] hover:bg-[#0A3D80] disabled:opacity-50 text-white rounded-full shadow-md transition-all active:scale-95 flex-shrink-0"
                                        title="Add Participant"
                                    >
                                        <MdPersonAdd className="w-5 h-5" />
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Members List */}
                        <div className="divide-y divide-gray-100">
                            {[...members].sort((a, b) => {
                                const isAdminA = checkAdmin(chat, a.uid);
                                const isAdminB = checkAdmin(chat, b.uid);
                                if (isAdminA && !isAdminB) return -1;
                                if (!isAdminA && isAdminB) return 1;
                                return (a.displayName || '').localeCompare(b.displayName || '');
                            }).map((member, index) => {
                                const isMemberAdmin = checkAdmin(chat, member.uid);
                                const isMe = member.uid === currentUser?.uid;

                                return (
                                    <div
                                        key={member.uid}
                                        className="group p-4 flex items-center hover:bg-gray-50 transition-colors duration-200"
                                    >
                                        <div className="mr-4 relative">
                                            <Avatar
                                                user={member}
                                                size="w-12 h-12"
                                                className="shadow-sm border border-gray-100"
                                                onClick={() => navigate(`/user/${member.uid}`)}
                                            />
                                            {isMemberAdmin && (
                                                <div className="absolute -bottom-1 -right-1 bg-[#0C4DA2] text-white p-0.5 rounded-full border-2 border-white shadow-sm" title="Admin">
                                                    <MdSecurity className="w-3 h-3" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-gray-900 font-semibold truncate text-base">
                                                    {isMe ? "You" : member.displayName}
                                                </h4>
                                                {isMemberAdmin && (
                                                    <span className="text-[10px] bg-[#0C4DA2] text-white px-2 py-0.5 rounded-full font-bold tracking-wide shadow-sm">
                                                        ADMIN
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-text-secondary text-sm truncate opacity-60">{member.email}</p>
                                        </div>

                                        {/* Actions */}
                                        {isAdmin && !isMe && (
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                {!isMemberAdmin && (
                                                    <button
                                                        onClick={() => handleMakeAdmin(member.uid)}
                                                        className="p-2 text-text-secondary hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                                                        title="Promote to Admin"
                                                    >
                                                        <MdSecurity className="w-5 h-5" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleRemoveMember(member.uid)}
                                                    className="p-2 text-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                                    title="Remove from Group"
                                                >
                                                    <MdDelete className="w-5 h-5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GroupDetailsPage;
