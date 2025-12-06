import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserProfile, updateUserProfile, uploadPublicChunks } from '../services/chatService';
import { MdArrowBack, MdEdit, MdCheck, MdCameraAlt } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar';
import ImageCropper from '../components/ImageCropper';

const ProfilePage = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState(currentUser?.displayName || '');
    const [about, setAbout] = useState('');
    const [loading, setLoading] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [editingAbout, setEditingAbout] = useState(false);

    // Cropper State
    const [showCropper, setShowCropper] = useState(false);
    const [tempImageSrc, setTempImageSrc] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const fetchProfile = async () => {
            if (currentUser?.uid) {
                const profile = await getUserProfile(currentUser.uid);
                if (profile) {
                    setName(profile.displayName || '');
                    setAbout(profile.about || '');
                }
            }
        };
        fetchProfile();
    }, [currentUser]);

    const handleSave = async (field, value) => {
        try {
            await updateUserProfile(currentUser.uid, { [field]: value });
            if (field === 'displayName') setEditingName(false);
            if (field === 'about') setEditingAbout(false);
        } catch (error) {
            console.error(`Error updating ${field}:`, error);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            setTempImageSrc(reader.result);
            setShowCropper(true);
        };
        e.target.value = '';
    };

    const handleCropComplete = async (croppedBlob) => {
        setShowCropper(false);
        setLoading(true);
        try {
            const fileId = `${currentUser.uid}_${Date.now()}`;
            const pseudoUrl = await uploadPublicChunks(fileId, croppedBlob);

            await updateUserProfile(currentUser.uid, { photoURL: pseudoUrl });

            // Update Auth profile as well
            const { updateProfile } = await import('firebase/auth');
            const { auth } = await import('../services/firebase');
            if (auth.currentUser) {
                await updateProfile(auth.currentUser, { photoURL: pseudoUrl });
            }

        } catch (error) {
            console.error("Error uploading image:", error);
            alert("Failed to upload image");
        }
        setLoading(false);
        setTempImageSrc(null);
    };

    return (
        <div className="flex flex-col h-full bg-chat-bg">
            {/* Header */}
            <div className="h-16 bg-header-bg flex items-center px-4 border-b border-glass shadow-md z-10">
                <button onClick={() => navigate('/')} className="mr-4 text-white/80 hover:text-white md:hidden">
                    <MdArrowBack className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-medium text-white">Profile</h1>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative z-0">
                <div className="max-w-2xl mx-auto space-y-8 glass-panel p-8 rounded-2xl bg-white/80 backdrop-blur-xl shadow-xl border border-white/50">
                    {/* Photo */}
                    <div className="flex justify-center">
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <Avatar
                                user={currentUser}
                                size="w-40 h-40"
                                className="border-4 border-white shadow-lg text-4xl"
                            />

                            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                <MdCameraAlt className="w-8 h-8 text-white" />
                                <span className="text-white text-sm mt-8 absolute font-medium">CHANGE PHOTO</span>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileSelect}
                            />
                            {loading && <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full text-white font-medium">Loading...</div>}
                        </div>
                    </div>

                    {/* Name */}
                    <div className="space-y-2">
                        <label className="text-[#0C4DA2] text-sm font-bold uppercase tracking-wider">Your Name</label>
                        <div className="flex items-center justify-between group">
                            {editingName ? (
                                <div className="flex-1 flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="flex-1 bg-white border border-[#E0E8F2] rounded px-3 py-2 text-[#313131] focus:ring-2 focus:ring-[#0C4DA2] focus:border-transparent outline-none transition-all"
                                        autoFocus
                                    />
                                    <button onClick={() => handleSave('displayName', name)} className="text-[#0C4DA2] hover:text-[#093d80]"><MdCheck className="w-6 h-6" /></button>
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-between py-2 border-b border-gray-200 hover:border-[#0C4DA2] transition-colors">
                                    <span className="text-[#313131] text-lg font-medium">{name}</span>
                                    <button onClick={() => setEditingName(true)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[#0C4DA2] transition-all"><MdEdit className="w-5 h-5" /></button>
                                </div>
                            )}
                        </div>
                        <p className="text-gray-500 text-sm">This is not your username or pin. This name will be visible to your WhatsApp contacts.</p>
                    </div>

                    {/* About */}
                    <div className="space-y-2">
                        <label className="text-[#0C4DA2] text-sm font-bold uppercase tracking-wider">About</label>
                        <div className="flex items-center justify-between group">
                            {editingAbout ? (
                                <div className="flex-1 flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={about}
                                        onChange={(e) => setAbout(e.target.value)}
                                        className="flex-1 bg-white border border-[#E0E8F2] rounded px-3 py-2 text-[#313131] focus:ring-2 focus:ring-[#0C4DA2] focus:border-transparent outline-none transition-all"
                                        autoFocus
                                    />
                                    <button onClick={() => handleSave('about', about)} className="text-[#0C4DA2] hover:text-[#093d80]"><MdCheck className="w-6 h-6" /></button>
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-between py-2 border-b border-gray-200 hover:border-[#0C4DA2] transition-colors">
                                    <span className="text-[#313131] text-lg">{about || 'Available'}</span>
                                    <button onClick={() => setEditingAbout(true)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[#0C4DA2] transition-all"><MdEdit className="w-5 h-5" /></button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Email (Read-only) */}
                    <div className="space-y-2">
                        <label className="text-[#0C4DA2] text-sm font-bold uppercase tracking-wider">Email</label>
                        <div className="text-gray-600 text-lg px-2">{currentUser?.email}</div>
                    </div>
                </div>
            </div>

            {/* Image Cropper Modal */}
            {showCropper && tempImageSrc && (
                <ImageCropper
                    imageSrc={tempImageSrc}
                    onCropComplete={handleCropComplete}
                    onCancel={() => {
                        setShowCropper(false);
                        setTempImageSrc(null);
                    }}
                />
            )}
        </div>
    );
};

export default ProfilePage;
