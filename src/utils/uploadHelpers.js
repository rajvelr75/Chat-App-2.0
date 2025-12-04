export const validateFile = (file) => {
    const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
    const ALLOWED_TYPES = ['image/', 'video/'];

    if (!file) return { valid: false, error: "No file selected." };

    if (file.size > MAX_SIZE) {
        return { valid: false, error: "Upload failed: File size exceeds 50 MB limit." };
    }

    const isAllowed = ALLOWED_TYPES.some(type => file.type.startsWith(type));
    if (!isAllowed) {
        return { valid: false, error: "Only images and videos are allowed." };
    }

    return { valid: true };
};
