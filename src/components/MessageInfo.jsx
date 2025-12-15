import React, { useState } from 'react';
import { MdClose, MdDoneAll, MdCheck } from 'react-icons/md';
import Avatar from './Avatar';

const MessageInfo = ({ message, onClose, groupMembers, otherUser, isGroup }) => {

    const formatTime = (timestamp) => {
        if (!timestamp) return '—';
        try {
            const date = timestamp.toDate();
            // Format: "Today at 10:30 AM" or "Dec 12 at 4:20 PM"
            const today = new Date();
            const isToday = date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear();

            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            if (isToday) return `Today at ${timeStr}`;
            return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
        } catch (e) {
            return '—';
        }
    };

    const getParticipants = () => {
        if (isGroup) {
            return Object.values(groupMembers || {});
        } else if (otherUser) {
            return [otherUser];
        }
        return [];
    };

    const participants = getParticipants();

    // Data Processing
    const readList = participants.filter(user => {
        if (!user) return false;
        return message.readBy && message.readBy.includes(user.uid);
    }).map(user => ({
        user,
        timestamp: message.readAt?.[user.uid]
    }));

    const deliveredList = participants.filter(user => {
        if (!user) return false;
        const isRead = message.readBy && message.readBy.includes(user.uid);
        const isDelivered = (message.deliveredTo && message.deliveredTo.includes(user.uid)) || isRead;
        return isDelivered;
    }).map(user => ({
        user,
        timestamp: message.deliveredAt?.[user.uid] || (message.readBy?.includes(user.uid) ? message.readAt?.[user.uid] : null)
        // If read but delivered timestamp missing (edge case), invoke read timestamp
    }));

    // In 1:1, if status is 'delivered' or 'read', we show it.
    // If we rely purely on arrays, it's safer.

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4" onClick={onClose}>
            <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 bg-header-bg text-white shadow-sm">
                    <h3 className="text-lg font-bold">Message Info</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <MdClose className="w-6 h-6" />
                    </button>
                </div>

                {/* Message Preview (Short) */}
                <div className="p-4 bg-gray-50 border-b border-gray-100">
                    <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 text-sm text-gray-700 max-h-24 overflow-hidden relative">
                        {message.text || (message.type === 'image' ? '📷 Photo' : message.type === 'video' ? '🎥 Video' : 'Message')}
                        {/* Fade out effect if long */}
                        <div className="absolute bottom-0 left-0 w-full h-6 bg-gradient-to-t from-white to-transparent"></div>
                    </div>
                </div>

                {/* Content - Sections instead of Tabs */}
                <div className="bg-white min-h-[300px] overflow-y-auto max-h-[60vh] custom-scrollbar p-2">
                    {/* Read By Section */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg mb-2">
                            <span className="text-sm font-bold text-gray-700">Read at</span>
                            <span className="text-xs font-medium text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-100">{readList.length}</span>
                        </div>
                        {readList.length === 0 ? (
                            <div className="px-4 py-2 text-xs text-gray-400 italic">No one yet</div>
                        ) : (
                            <div>
                                {readList.map(({ user, timestamp }) => (
                                    <div key={user.uid} className="flex items-center p-2.5 hover:bg-gray-50 rounded-lg transition-colors">
                                        <Avatar user={user} size="w-9 h-9" />
                                        <div className="ml-3 flex-1 min-w-0">
                                            <h4 className="text-sm font-semibold text-gray-800 truncate">{user.displayName || 'Unknown'}</h4>
                                            <div className="flex items-center text-xs text-blue-500">
                                                <MdDoneAll className="w-3.5 h-3.5 mr-1" />
                                                <span>{formatTime(timestamp)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Delivered To Section */}
                    <div>
                        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg mb-2">
                            <span className="text-sm font-bold text-gray-700">Delivered at</span>
                            <span className="text-xs font-medium text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-100">{deliveredList.length}</span>
                        </div>
                        {deliveredList.length === 0 ? (
                            <div className="px-4 py-2 text-xs text-gray-400 italic">No one yet</div>
                        ) : (
                            <div>
                                {deliveredList.map(({ user, timestamp }) => (
                                    <div key={user.uid} className="flex items-center p-2.5 hover:bg-gray-50 rounded-lg transition-colors">
                                        <Avatar user={user} size="w-9 h-9" />
                                        <div className="ml-3 flex-1 min-w-0">
                                            <h4 className="text-sm font-semibold text-gray-800 truncate">{user.displayName || 'Unknown'}</h4>
                                            <div className="flex items-center text-xs text-gray-500">
                                                <MdCheck className="w-3.5 h-3.5 mr-1" />
                                                <span>{formatTime(timestamp)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MessageInfo;
