
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logoutUser } from '../services/authService';
// import { searchUsers, createChat, searchGroups } from '../services/chatService'; // No longer needed here
import { MdChat, MdMoreVert, MdSearch, MdArrowBack, MdGroupAdd } from 'react-icons/md';
import ChatList from './ChatList';
import NewChatModal from './NewChatModal';
import NewGroupModal from './NewGroupModal';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import Avatar from './Avatar';

const Sidebar = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    if (currentUser?.uid) {
      const unsub = onSnapshot(doc(db, "users", currentUser.uid), (doc) => {
        if (doc.exists()) {
          setUserProfile(doc.data());
        }
      });
      return () => unsub();
    }
  }, [currentUser]);



  const handleLogout = async () => {
    await logoutUser(currentUser.uid);
    navigate('/login');
  };

  // Merge auth user and firestore user profile
  const displayUser = userProfile ? { ...currentUser, ...userProfile } : currentUser;

  return (
    <div className="flex flex-col h-full bg-sidebar-bg border-r border-gray-200 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 bg-header-bg shadow-sm z-20">
        <div
          className="cursor-pointer hover:opacity-90 transition-opacity ring-2 ring-transparent hover:ring-white/20 rounded-full p-0.5"
          onClick={() => navigate('/profile')}
          title="My Profile"
        >
          <Avatar user={displayUser} size="w-10 h-10" />
        </div>

        <div className="flex items-center gap-4 text-white/90">
          <button title="New Chat" onClick={() => setShowNewChatModal(true)} className="hover:text-white hover:bg-white/10 p-2 rounded-full transition-all duration-200"><MdChat className="w-6 h-6" /></button>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} title="Menu" className="hover:text-white hover:bg-white/10 p-2 rounded-full transition-all duration-200"><MdMoreVert className="w-6 h-6" /></button>
            {showMenu && (
              <div className="absolute right-0 top-10 bg-white shadow-xl rounded-lg py-2 w-48 z-20 border border-gray-100 transform origin-top-right transition-all">
                <button
                  onClick={() => { setShowNewGroupModal(true); setShowMenu(false); }}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 text-gray-700 flex items-center gap-3 transition-colors font-medium text-sm"
                >
                  <MdGroupAdd className="w-5 h-5 text-[#0C4DA2]" /> New group
                </button>
                <button onClick={handleLogout} className="w-full text-left px-4 py-3 hover:bg-red-50 text-red-500 font-medium text-sm transition-colors">Log out</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 bg-white border-b border-gray-100 z-10">
        <div className={`flex items-center rounded-lg px-3 py-2 transition-all duration-200 bg-[#F0F2F5] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#0C4DA2] focus-within:shadow-sm`}>
          {searchTerm ? (
            <MdArrowBack className="w-5 h-5 text-[#0C4DA2] mr-3 cursor-pointer" onClick={() => { setSearchTerm(''); }} />
          ) : (
            <MdSearch className="w-5 h-5 text-gray-500 mr-3" />
          )}
          <input
            id="search-input"
            type="text"
            placeholder="Search or start new chat"
            className="bg-transparent border-none focus:ring-0 text-sm w-full focus:outline-none text-gray-700 placeholder-gray-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Chat List or Search Results */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
        <ChatList searchTerm={searchTerm} />
      </div>

      {/* Modals */}
      {showNewChatModal && <NewChatModal onClose={() => setShowNewChatModal(false)} />}
      {showNewGroupModal && <NewGroupModal onClose={() => setShowNewGroupModal(false)} />}
    </div>
  );
};

export default Sidebar;
