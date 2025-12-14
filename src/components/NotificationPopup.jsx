import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCommentDots, FaTimes } from 'react-icons/fa';

const NotificationPopup = ({ notification, onClose }) => {
    const navigate = useNavigate();

    // Auto-hide after 3 seconds
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [notification, onClose]);

    if (!notification) return null;

    const handleClick = () => {
        if (notification.data?.chatId) {
            navigate(`/chat/${notification.data.chatId}`);
        }
        onClose();
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 20, opacity: 1 }}
                exit={{ y: -100, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
            >
                <div
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-xl rounded-lg p-4 max-w-sm w-full mx-4 flex items-start gap-3 cursor-pointer pointer-events-auto border border-gray-200 dark:border-gray-700"
                    onClick={handleClick}
                >
                    <div className="flex-shrink-0 mt-1 text-blue-500">
                        <FaCommentDots size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                            {notification.title || 'New Message'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {notification.body}
                        </p>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                        <FaTimes size={14} />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default NotificationPopup;
