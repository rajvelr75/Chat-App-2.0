import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, arrayUnion, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { MdArrowBack, MdPersonAdd, MdGroup, MdEdit, MdCheck, MdCameraAlt, MdDelete, MdSecurity } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import { updateGroupName, updateGroupPhoto, makeAdmin, removeParticipant, checkAdmin, addParticipant, uploadPublicChunks } from '../services/chatService';
import { validateFile } from '../utils/uploadHelpers';
import Avatar from '../components/Avatar';

const GroupDetailsPage = () => {
    const { groupId } = useParams();
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
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (groupId) {
            const unsub = onSnapshot(doc(db, "chats", groupId), async (chatDoc) => {
                if (chatDoc.exists()) {
                    const chatData = chatDoc.data();
                    const fullChat = { id: chatDoc.id, ...chatData };
                    setChat(fullChat);
                    setNewName(chatData.name);
                    setIsAdmin(checkAdmin(fullChat, currentUser.uid));
                }
                setLoading(false);
            });
            return () => unsub();
        }
    }, [groupId, currentUser.uid]);

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
            await addParticipant(groupId, newUser.uid, currentUser.uid);

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
        <div className="flex flex-col h-full bg-app-bg">
            {/* Header - Fixed */}
            <div className="h-16 glass-panel flex items-center px-4 border-b border-glass flex-shrink-0 z-10">
                <button onClick={() => navigate(-1)} className="mr-4 text-text-secondary hover:text-text-primary transition-colors">
                    <MdArrowBack className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-medium text-text-primary">Group Info</h1>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
                <div className="max-w-2xl mx-auto space-y-6">

                    {/* Group Profile Card */}
                    <div className="glass-panel p-6 rounded-2xl flex flex-col items-center relative">
                        {/* Photo */}
                        <div className="relative group">
                            <div
                                className={`rounded-full flex items-center justify-center border-4 border-glass shadow-glass overflow-hidden ${isAdmin ? 'cursor-pointer' : ''}`}
                                onClick={() => isAdmin && fileInputRef.current?.click()}
                            >
                                <Avatar
                                    user={{ displayName: chat.name, photoURL: chat.photoURL }}
                                    size="w-32 h-32"
                                    className="text-4xl"
                                />
                            </div>

                            {isAdmin && (
                                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    <MdCameraAlt className="w-8 h-8 text-white" />
                                </div>
                            )}

                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                disabled={!isAdmin || uploadingPhoto}
                            />
                            {uploadingPhoto && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                                    <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>

                        {/* Name */}
                        <div className="mt-4 flex items-center justify-center gap-2 w-full">
                            {editingName ? (
                                <div className="flex items-center gap-2 w-full max-w-xs">
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        className="flex-1 glass-input rounded px-2 py-1 text-center text-lg font-bold"
                                        autoFocus
                                    />
                                    <button onClick={handleUpdateName} className="text-accent hover:text-white p-1">
                                        <MdCheck className="w-6 h-6" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 group">
                                    <h2 className="text-2xl font-bold text-text-primary text-center">{chat.name}</h2>
                                    {isAdmin && (
                                        <button onClick={() => setEditingName(true)} className="text-text-secondary hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                                            <MdEdit className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        <p className="text-text-secondary mt-1">{members.length} participants</p>
                    </div>

                    {/* Add Member Section (Admin Only) */}
                    {isAdmin && (
                        <div className="glass-panel p-6 rounded-2xl">
                            <h3 className="text-accent text-sm font-medium uppercase tracking-wider mb-4">Add Participant</h3>
                            <form onSubmit={handleAddMember} className="flex gap-2">
                                <input
                                    type="email"
                                    value={newMemberEmail}
                                    onChange={(e) => setNewMemberEmail(e.target.value)}
                                    placeholder="Enter email address"
                                    className="flex-1 glass-input rounded px-4 py-2 text-text-primary placeholder-text-secondary focus:ring-1 focus:ring-accent"
                                />
                                <button
                                    type="submit"
                                    disabled={addingMember || !newMemberEmail.trim()}
                                    className="glass-button rounded px-4 py-2 flex items-center gap-2 disabled:opacity-50"
                                >
                                    <MdPersonAdd className="w-5 h-5" /> Add
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Participants List */}
                    <div className="glass-panel p-6 rounded-2xl">
                        <h3 className="text-accent text-sm font-medium uppercase tracking-wider mb-4">Participants</h3>
                        <div className="space-y-1">
                            {members.map(member => {
                                const isMemberAdmin = checkAdmin(chat, member.uid);
                                const isMe = member.uid === currentUser.uid;

                                return (
                                    <div key={member.uid} className="flex items-center p-3 hover:bg-glass rounded-xl transition-colors group relative">
                                        <div className="mr-3">
                                            <Avatar
                                                user={member}
                                                size="w-10 h-10"
                                                onClick={() => navigate(`/user/${member.uid}`)}
                                            />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-text-primary font-medium truncate">
                                                    {isMe ? "You" : member.displayName}
                                                </span>
                                                {isMemberAdmin && (
                                                    <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded border border-accent/30 font-bold">
                                                        ADMIN
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-text-secondary truncate">{member.email}</div>
                                        </div>

                                        {/* Admin Actions */}
                                        {isAdmin && !isMe && (
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {!isMemberAdmin && (
                                                    <button
                                                        onClick={() => handleMakeAdmin(member.uid)}
                                                        className="p-2 text-text-secondary hover:text-accent hover:bg-glass rounded-full"
                                                        title="Make Admin"
                                                    >
                                                        <MdSecurity className="w-5 h-5" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleRemoveMember(member.uid)}
                                                    className="p-2 text-text-secondary hover:text-red-400 hover:bg-glass rounded-full"
                                                    title="Remove User"
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
