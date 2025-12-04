import { arrayBufferToBase64, base64ToArrayBuffer } from '../utils/base64';

// Generate a random 12-byte IV
export const generateIv = () => {
    return window.crypto.getRandomValues(new Uint8Array(12));
};

// Import raw symmetric key for AES-GCM
export const importSymmetricKey = async (rawKey) => {
    return await window.crypto.subtle.importKey(
        "raw",
        rawKey,
        "AES-GCM",
        true,
        ["encrypt", "decrypt"]
    );
};

// Encrypt file/blob -> ArrayBuffer
export const encryptFile = async (file, chatKey) => {
    const iv = generateIv();
    const fileBuffer = await file.arrayBuffer();

    const cryptoKey = chatKey instanceof CryptoKey
        ? chatKey
        : await importSymmetricKey(chatKey);

    const encryptedBuffer = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        cryptoKey,
        fileBuffer
    );

    return {
        encryptedBuffer, // Return ArrayBuffer directly for chunking
        iv: arrayBufferToBase64(iv),
        mimeType: file.type,
        originalName: file.name
    };
};

// Decrypt ArrayBuffer -> ArrayBuffer
export const decryptArrayBuffer = async (encryptedBuffer, ivBase64, chatKey) => {
    const iv = base64ToArrayBuffer(ivBase64);

    const cryptoKey = chatKey instanceof CryptoKey
        ? chatKey
        : await importSymmetricKey(chatKey);

    try {
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            cryptoKey,
            encryptedBuffer
        );
        return decryptedBuffer;
    } catch (error) {
        console.error("Decryption failed:", error);
        throw new Error("Failed to decrypt media");
    }
};

// Chunk ArrayBuffer -> Array of { index, data: base64 }
export const chunkArrayBuffer = (buffer, chunkSize = 512 * 1024) => { // Default 512KB
    const chunks = [];
    const byteLength = buffer.byteLength;
    const uint8Array = new Uint8Array(buffer);

    for (let i = 0; i < byteLength; i += chunkSize) {
        const chunkBytes = uint8Array.subarray(i, Math.min(i + chunkSize, byteLength));
        // Convert chunk to Base64 for Firestore storage
        // Using a more robust binary-to-base64 conversion for chunks
        let binary = '';
        const len = chunkBytes.byteLength;
        for (let j = 0; j < len; j++) {
            binary += String.fromCharCode(chunkBytes[j]);
        }
        const base64 = window.btoa(binary);

        chunks.push({
            index: chunks.length,
            data: base64
        });
    }
    return chunks;
};

// Combine Chunks -> ArrayBuffer
export const combineChunks = (chunks) => {
    // Sort by index just in case
    chunks.sort((a, b) => a.index - b.index);

    // Calculate total size
    let totalSize = 0;
    const decodedChunks = chunks.map(chunk => {
        const binary_string = window.atob(chunk.data);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        totalSize += len;
        return bytes;
    });

    // Merge
    const combined = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunkBytes of decodedChunks) {
        combined.set(chunkBytes, offset);
        offset += chunkBytes.length;
    }

    return combined.buffer;
};

// Generate video thumbnail
export const generateVideoThumbnail = (file) => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = URL.createObjectURL(file);
        video.muted = true;
        video.playsInline = true;
        video.currentTime = 1; // Capture at 1s

        video.onloadeddata = () => {
            setTimeout(() => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                    canvas.toBlob((blob) => {
                        URL.revokeObjectURL(video.src);
                        resolve(blob);
                    }, 'image/jpeg', 0.7);
                } catch (e) {
                    reject(e);
                }
            }, 200);
        };

        video.onerror = (e) => {
            reject(e);
        };
    });
};
