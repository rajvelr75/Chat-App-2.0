import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logoutUser } from '../services/authService';
import { searchUsers, createChat } from '../services/chatService';
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

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.trim()) {
        setIsSearching(true);
        const results = await searchUsers(searchTerm);
        // Filter out self
        setSearchResults(results.filter(u => u.uid !== currentUser.uid));
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, currentUser]);

  const handleLogout = async () => {
    await logoutUser(currentUser.uid);
    navigate('/login');
  };

  const handleUserSelect = async (otherUser) => {
    try {
      const chatId = await createChat(currentUser.uid, otherUser.uid);
      setSearchTerm(''); // Clear search
      setIsSearching(false);
      navigate(`/chat/${chatId}`);
    } catch (err) {
      console.error("Error creating chat:", err);
    }
  };

  // Merge auth user and firestore user profile
  const displayUser = userProfile ? { ...currentUser, ...userProfile } : currentUser;

  return (
    <div className="flex flex-col h-full glass-panel border-r border-glass">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 py-2 border-b border-glass">
        <div
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate('/profile')}
          title="My Profile"
        >
          <Avatar user={displayUser} size="w-10 h-10" />
        </div>

        <div className="flex items-center gap-4 text-text-secondary">
          <button title="New Chat" onClick={() => setShowNewChatModal(true)} className="hover:text-accent transition-colors"><MdChat className="w-6 h-6" /></button>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} title="Menu" className="hover:text-accent transition-colors"><MdMoreVert className="w-6 h-6" /></button>
            {showMenu && (
              <div className="absolute right-0 top-8 glass-panel shadow-lg rounded py-2 w-48 z-10">
                <button
                  onClick={() => { setShowNewGroupModal(true); setShowMenu(false); }}
                  className="w-full text-left px-4 py-2 hover:bg-glass text-text-primary flex items-center gap-2"
                >
                  <MdGroupAdd className="w-5 h-5" /> New group
                </button>
                <button onClick={handleLogout} className="w-full text-left px-4 py-2 hover:bg-glass text-text-primary">Log out</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-glass">
        <div className="glass-input flex items-center rounded-lg px-2 py-1.5">
          {isSearching || searchTerm ? (
            <MdArrowBack className="w-5 h-5 text-accent ml-2 cursor-pointer" onClick={() => { setSearchTerm(''); setIsSearching(false); }} />
          ) : (
            <MdSearch className="w-5 h-5 text-text-secondary ml-2" />
          )}
          <input
            id="search-input"
            type="text"
            placeholder="Search or start new chat"
            className="bg-transparent border-none focus:ring-0 text-text-primary placeholder-text-secondary text-sm w-full ml-4 focus:outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Chat List or Search Results */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isSearching || searchTerm ? (
          <div>
            {searchResults.length === 0 ? (
              <div className="p-4 text-center text-text-secondary text-sm">No users found</div>
            ) : (
              searchResults.map(user => (
                <div key={user.uid} onClick={() => handleUserSelect(user)} className="flex items-center p-3 hover:bg-glass cursor-pointer border-b border-glass">
                  <div className="mr-3">
                    <Avatar user={user} size="w-12 h-12" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-text-primary font-medium truncate">{user.displayName}</h3>
                    <p className="text-text-secondary text-sm truncate">{user.about || 'Available'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <ChatList />
        )}
      </div>

      {/* Modals */}
      {showNewChatModal && <NewChatModal onClose={() => setShowNewChatModal(false)} />}
      {showNewGroupModal && <NewGroupModal onClose={() => setShowNewGroupModal(false)} />}
    </div>
  );
};

export default Sidebar;
