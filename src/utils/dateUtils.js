export const formatDateForSeparator = (timestamp) => {
    if (!timestamp) return null;

    const date = timestamp.toDate();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    // Check if Today
    if (messageDate.getTime() === today.getTime()) {
        return 'Today';
    }

    // Check if Yesterday
    if (messageDate.getTime() === yesterday.getTime()) {
        return 'Yesterday';
    }

    // Check if within this week (last 7 days)
    const diffTime = Math.abs(today - messageDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 7) {
        return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date);
    }

    // Otherwise return full date
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

export const checkSameDay = (timestamp1, timestamp2) => {
    if (!timestamp1 || !timestamp2) return false;

    const d1 = timestamp1.toDate();
    const d2 = timestamp2.toDate();

    return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
    );
};
