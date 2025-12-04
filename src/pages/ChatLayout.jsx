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
        <div className="flex h-screen bg-app-bg overflow-hidden">
            {/* Sidebar: Hidden on mobile if chat/profile is active, always visible on md+ */}
            <div className={`w-full md:w-[400px] md:flex flex-col border-r border-gray-700 bg-sidebar-bg ${isSidebarHidden ? 'hidden md:flex' : 'flex'}`}>
                <Sidebar />
            </div>

            {/* Main Chat Area: Hidden on mobile if NO chat/profile is active, always visible on md+ */}
            <div className={`flex-1 flex flex-col bg-chat-bg ${!isSidebarHidden ? 'hidden md:flex' : 'flex'}`}>
                <Routes>
                    <Route path="/" element={
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 border-b-8 border-accent">
                            <div className="text-center">
                                <h1 className="text-3xl font-light text-gray-200 mb-4">WhatsApp Web</h1>
                                <p>Send and receive messages without keeping your phone online.</p>
                                <p>Use WhatsApp on up to 4 linked devices and 1 phone.</p>
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
