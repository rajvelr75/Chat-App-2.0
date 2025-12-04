// Simplified E2E Encryption Service using Web Crypto API

// Generate a new symmetric key for a chat (AES-GCM)
export const generateChatKey = async () => {
    return await window.crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256
        },
        true,
        ["encrypt", "decrypt"]
    );
};

// Export key to string (JWK) for storage
export const exportKey = async (key) => {
    const exported = await window.crypto.subtle.exportKey("jwk", key);
    return JSON.stringify(exported);
};

// Import key from string (JWK)
export const importKey = async (jwkString) => {
    const jwk = JSON.parse(jwkString);
    return await window.crypto.subtle.importKey(
        "jwk",
        jwk,
        {
            name: "AES-GCM",
            length: 256
        },
        true,
        ["encrypt", "decrypt"]
    );
};

// Encrypt text message
export const encryptMessage = async (text, key) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 12 bytes IV for AES-GCM

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        data
    );

    // Convert buffer to base64 for storage
    const ciphertext = arrayBufferToBase64(ciphertextBuffer);
    const ivString = arrayBufferToBase64(iv);

    return { ciphertext, iv: ivString };
};

// Decrypt text message
export const decryptMessage = async (ciphertext, ivString, key) => {
    try {
        const ciphertextBuffer = base64ToArrayBuffer(ciphertext);
        const iv = base64ToArrayBuffer(ivString);

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            key,
            ciphertextBuffer
        );

        const decoder = new TextDecoder();
        return decoder.decode(decryptedBuffer);
    } catch (e) {
        console.error("Decryption failed:", e);
        return "[Decryption Error]";
    }
};

// --- Helpers ---

// For this demo, we will "wrap" the chat key with the user's UID (derived key)
// In production, this should be the user's public key or a password-derived key.
export const wrapKeyForUser = async (chatKey, userId) => {
    // 1. Derive a wrapping key from userId (SHA-256 -> AES-KW or just AES-GCM)
    // Simplified: Use userId as a seed to generate a key (Insecure, demo only)
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        encoder.encode(userId.padEnd(32, '0').slice(0, 32)), // Pad to 32 bytes
        "AES-GCM",
        false,
        ["encrypt", "decrypt"]
    );

    // 2. Export chat key to raw bytes
    const chatKeyRaw = await window.crypto.subtle.exportKey("raw", chatKey);

    // 3. Encrypt the chat key bytes with the wrapping key
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedKeyBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        keyMaterial,
        chatKeyRaw
    );

    return {
        encryptedKey: arrayBufferToBase64(encryptedKeyBuffer),
        iv: arrayBufferToBase64(iv)
    };
};

export const unwrapKeyForUser = async (encryptedKeyData, userId) => {
    // 1. Re-derive the wrapping key
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        encoder.encode(userId.padEnd(32, '0').slice(0, 32)),
        "AES-GCM",
        false,
        ["encrypt", "decrypt"]
    );

    // 2. Decrypt the chat key
    const encryptedKeyBuffer = base64ToArrayBuffer(encryptedKeyData.encryptedKey);
    const iv = base64ToArrayBuffer(encryptedKeyData.iv);

    const chatKeyRaw = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        keyMaterial,
        encryptedKeyBuffer
    );

    // 3. Import the chat key
    return await window.crypto.subtle.importKey(
        "raw",
        chatKeyRaw,
        "AES-GCM",
        true,
        ["encrypt", "decrypt"]
    );
};

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToArrayBuffer(base64) {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}
// --- Key Management ---

import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

let chatKeyCache = {};

export const getChatKey = async (chatId, userId) => {
    if (!chatId || !userId) {
        console.error("getChatKey called with missing arguments:", { chatId, userId });
        return null;
    }
    if (chatKeyCache[chatId]) return chatKeyCache[chatId];

    try {
        const keyDoc = await getDoc(doc(db, "chats", chatId, "keys", userId));
        if (keyDoc.exists()) {
            const encryptedKeyData = keyDoc.data();
            if (!encryptedKeyData || !encryptedKeyData.encryptedKey || !encryptedKeyData.iv) {
                console.error("Invalid key data for chat:", chatId);
                return null;
            }
            const key = await unwrapKeyForUser(encryptedKeyData, userId);
            chatKeyCache[chatId] = key;
            return key;
        } else {
            console.warn("No key document found for chat:", chatId, "user:", userId);
        }
    } catch (e) {
        console.error("Error fetching chat key:", e);
    }
    return null;
};
