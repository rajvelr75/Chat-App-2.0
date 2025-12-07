import { Routes, Route, useMatch } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import ProfilePage from './ProfilePage';
import UserDetailsPage from './UserDetailsPage';
import GroupDetailsPage from './GroupDetailsPage';

const ChatLayout = () => {
    const isChatRoute = useMatch('/chat/:chatId');
    const isProfileRoute = useMatch('/profile');
    const isUserRoute = useMatch('/user/:uid');
    const isGroupRoute = useMatch('/group/:chatId');
    const isSidebarHidden = isChatRoute || isProfileRoute || isUserRoute || isGroupRoute;

    // On mobile, if we are in a chat, hide the sidebar.
    // On desktop, always show both.
    // We use Tailwind classes to toggle visibility.

    return (
        <div className="flex h-screen bg-app-bg overflow-hidden relative">
            {/* Global Background Gradient/Blur Effect */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-accent/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#0C4DA2]/10 rounded-full blur-[100px]" />
            </div>

            {/* Sidebar: Hidden on mobile if chat/profile is active, always visible on md+ */}
            <div className={`w-full md:w-[400px] md:flex flex-col border-r border-gray-700 bg-sidebar-bg/80 backdrop-blur-md z-10 ${isSidebarHidden ? 'hidden md:flex' : 'flex'}`}>
                <Sidebar />
            </div>

            {/* Main Chat Area: Hidden on mobile if NO chat/profile is active, always visible on md+ */}
            <div className={`flex-1 flex flex-col bg-chat-bg/50 backdrop-blur-sm z-10 ${!isSidebarHidden ? 'hidden md:flex' : 'flex'}`}>
                <Routes>
                    <Route path="/" element={
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 border-b-8 border-accent">
                            <div className="text-center">
                                <h1 className="text-3xl font-light text-gray-400 mb-4">Chat App</h1>
                                <p>Your Personal messages are end-to-end encrypted🔒</p>
                            </div>
                        </div>
                    } />
                    <Route path="/chat/:chatId" element={<ChatWindow />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/user/:uid" element={<UserDetailsPage />} />
                    <Route path="/group/:chatId" element={<GroupDetailsPage />} />
                </Routes>
            </div>
        </div>
    );
};

export default ChatLayout;
