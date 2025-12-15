import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    serverTimestamp,
    onSnapshot,
    orderBy,
    doc,
    updateDoc,
    getDoc,
    setDoc,
    deleteDoc,
    writeBatch,
    arrayUnion,
    arrayRemove,
    increment
} from "firebase/firestore";
import { db } from "./firebase";
import { generateChatKey, encryptMessage, decryptMessage, wrapKeyForUser, unwrapKeyForUser } from "./cryptoService";
import { checkSameDay, getDayString } from "../utils/dateUtils";

// --- Chat Management ---

export const createChat = async (currentUserId, otherUserId) => {
    const combinedId = currentUserId > otherUserId
        ? currentUserId + "_" + otherUserId
        : otherUserId + "_" + currentUserId;

    try {
        const res = await getDoc(doc(db, "chats", combinedId));

        if (!res.exists()) {
            // 1. Generate Chat Key
            const chatKey = await generateChatKey();

            // 2. Encrypt Chat Key for both users
            const encryptedForCurrentUser = await wrapKeyForUser(chatKey, currentUserId);
            const encryptedForOtherUser = await wrapKeyForUser(chatKey, otherUserId);

            // 3. Create Chat Doc
            await setDoc(doc(db, "chats", combinedId), {
                members: [currentUserId, otherUserId],
                createdAt: serverTimestamp(),
                isGroup: false,
                lastMessage: null,
                lastMessageAt: serverTimestamp(),
                streak: 0,
                lastStreakUpdateDate: null,
                lastMessageTimestamps: {}
            });

            // 4. Store Encrypted Keys
            await setDoc(doc(db, "chats", combinedId, "keys", currentUserId), encryptedForCurrentUser);
            await setDoc(doc(db, "chats", combinedId, "keys", otherUserId), encryptedForOtherUser);
        }
        return combinedId;
    } catch (err) {
        throw err;
    }
};

export const createChatWithEmail = async (currentUser, email) => {
    // 1. Find user by email
    const q = query(collection(db, "users"), where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        throw new Error("User not found");
    }

    const otherUser = querySnapshot.docs[0].data();
    if (otherUser.uid === currentUser.uid) {
        throw new Error("You cannot chat with yourself");
    }

    // 2. Create chat
    return await createChat(currentUser.uid, otherUser.uid);
};

export const createGroupChat = async (currentUser, groupName, memberEmails, description = '') => {
    // 1. Resolve emails to UIDs
    const memberIds = [currentUser.uid];

    for (const email of memberEmails) {
        const q = query(collection(db, "users"), where("email", "==", email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            memberIds.push(querySnapshot.docs[0].data().uid);
        }
    }

    // Ensure unique members
    const uniqueMemberIds = [...new Set(memberIds)];

    if (uniqueMemberIds.length < 2) {
        throw new Error("Group must have at least 2 members");
    }

    // 2. Generate Group Key
    const chatKey = await generateChatKey();
    const chatId = doc(collection(db, "chats")).id;

    // 3. Create Chat Doc
    await setDoc(doc(db, "chats", chatId), {
        members: uniqueMemberIds,
        createdAt: serverTimestamp(),
        isGroup: true,
        name: groupName,
        nameLower: groupName.toLowerCase(),
        description: description,
        createdBy: currentUser.uid,
        admins: [currentUser.uid], // Initialize creator as admin
        lastMessage: "Group created",
        lastMessageAt: serverTimestamp(),
    });

    // 4. Store Encrypted Keys for ALL members
    for (const uid of uniqueMemberIds) {
        const encryptedKey = await wrapKeyForUser(chatKey, uid);
        await setDoc(doc(db, "chats", chatId, "keys", uid), encryptedKey);
    }

    return chatId;
};

export const getUserChats = (userId, callback) => {
    const q = query(
        collection(db, "chats"),
        where("members", "array-contains", userId),
        orderBy("lastMessageAt", "desc")
    );

    return onSnapshot(q, (snapshot) => {
        const chats = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(chats);
    });
};

export const getChatDetails = async (chatId) => {
    const docRef = doc(db, "chats", chatId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    } else {
        return null;
    }
};

export const clearChat = async (chatId) => {
    const messagesRef = collection(db, "chats", chatId, "messages");
    const snapshot = await getDocs(messagesRef);

    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });

    await batch.commit();

    await updateDoc(doc(db, "chats", chatId), {
        lastMessage: "",
        lastMessageAt: serverTimestamp()
    });
};

// --- Key Management ---

let chatKeyCache = {};

const getChatKey = async (chatId, userId) => {
    if (chatKeyCache[chatId]) return chatKeyCache[chatId];

    try {
        const keyDoc = await getDoc(doc(db, "chats", chatId, "keys", userId));
        if (keyDoc.exists()) {
            const encryptedKeyData = keyDoc.data();
            const key = await unwrapKeyForUser(encryptedKeyData, userId);
            chatKeyCache[chatId] = key;
            return key;
        }
    } catch (e) {
        console.error("Error fetching chat key:", e);
    }
    return null;
};

// --- Message Management ---

export const sendMessage = async (chatId, senderId, text, attachment = null, replyTo = null) => {
    try {
        let encryptedData = { ciphertext: null, iv: null };

        if (text) {
            const key = await getChatKey(chatId, senderId);
            if (key) {
                encryptedData = await encryptMessage(text, key);
            } else {
                console.error("No key found for chat, sending plaintext (fallback)");
            }
        }

        const messageData = {
            senderId,
            text: null, // Don't store plaintext
            ciphertext: encryptedData.ciphertext,
            iv: encryptedData.iv,
            createdAt: serverTimestamp(),
            createdAt: serverTimestamp(),
            status: "sent",
            replyTo: replyTo || null,
            deliveredTo: [],
            readBy: [],
            deliveredAt: {},
            readAt: {}
        };

        if (attachment && attachment.replyTo) {
            // If passed via attachment arg for text messages (hacky but fits current signature)
            // Actually, let's update signature.
            // But to avoid breaking changes, let's check if the 4th arg is an object with replyTo
        }

        if (attachment) {
            if (attachment.type === 'image') {
                messageData.imageUrl = attachment.url;
            } else if (attachment.type === 'video') {
                messageData.videoUrl = attachment.url;
            }
        }

        // Add message to subcollection
        await addDoc(collection(db, "chats", chatId, "messages"), messageData);

        // Update last message in chat doc
        let lastMsgText = "Message";
        if (text) lastMsgText = text;
        else if (attachment?.type === 'image') lastMsgText = "📷 Photo";
        else if (attachment?.type === 'video') lastMsgText = "🎥 Video";

        const chatDocRef = doc(db, "chats", chatId);
        const chatDocSnap = await getDoc(chatDocRef);
        let updates = {
            lastMessage: lastMsgText,
            lastMessageSenderId: senderId,
            lastMessageAt: serverTimestamp()
        };

        if (chatDocSnap.exists() && !chatDocSnap.data().isGroup) {
            const chatData = chatDocSnap.data();
            const now = new Date();
            const dayString = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

            // Check if we need to reset streak first (if inactive for > 1 day)
            let streak = chatData.streak || 0;
            let lastStreakUpdateDate = chatData.lastStreakUpdateDate || null;

            if (lastStreakUpdateDate) {
                const lastDate = new Date(lastStreakUpdateDate);
                const diffTime = Math.abs(now - lastDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                // If last update was more than yesterday (1 day gap allowed, so diffDays > 2? No.)
                // Logic: If last update was Day 1, and today is Day 3. Diff is 2 days. Reset.
                // If last update was Day 1, today is Day 2. Diff is 1 day. Keep.

                // Simpler: Check days between.
                // Actually, let's use the dayString logic.
                const lastDayString = lastStreakUpdateDate;
                const prevDay = new Date(now);
                prevDay.setDate(prevDay.getDate() - 1);
                const prevDayString = prevDay.toISOString().split('T')[0];

                // If last update was NOT today and NOT yesterday, reset.
                if (dayString !== lastDayString && prevDayString !== lastDayString) {
                    streak = 0;
                }
            }

            // Update current user's timestamp
            const timestamps = chatData.lastMessageTimestamps || {};
            timestamps[senderId] = now.toISOString();

            // Check for increment
            // We need keys from timestamps. 
            const userIds = Object.keys(timestamps);
            // Since it's 1:1, should have 2 users eventually.
            // If we have 2 users with timestamps from TODAY.

            let counts = 0;
            let bothSentToday = true;

            // get chat members to ensure we only check actual members
            const members = chatData.members || [];
            if (members.length === 2) {
                for (const mId of members) {
                    const ts = timestamps[mId];
                    if (!ts || ts.split('T')[0] !== dayString) {
                        bothSentToday = false;
                        break;
                    }
                }

                if (bothSentToday && lastStreakUpdateDate !== dayString) {
                    streak += 1;
                    lastStreakUpdateDate = dayString;
                }
            }

            updates.streak = streak;
            updates.lastStreakUpdateDate = lastStreakUpdateDate;
            updates.lastMessageTimestamps = timestamps;
        }

        // Increment unread counts for all other members
        if (chatDocSnap.exists()) {
            const chatData = chatDocSnap.data();
            const members = chatData.members || [];
            members.forEach(memberId => {
                if (memberId !== senderId) {
                    updates[`unreadCounts.${memberId}`] = increment(1);
                }
            });
        }

        await updateDoc(chatDocRef, updates);
    } catch (err) {
        throw err;
    }
};

export const getMessages = (chatId, userId, callback) => {
    const q = query(
        collection(db, "chats", chatId, "messages"),
        orderBy("createdAt", "asc")
    );

    return onSnapshot(q, async (snapshot) => {
        const key = await getChatKey(chatId, userId);

        const messages = await Promise.all(snapshot.docs.map(async (doc) => {
            const data = doc.data();
            let text = data.text;

            if (data.ciphertext && data.iv && key) {
                text = await decryptMessage(data.ciphertext, data.iv, key);
            } else if (!text && data.ciphertext) {
                text = "🔒 Encrypted message";
            }

            return {
                id: doc.id,
                ...data,
                text
            };
        }));


        callback(messages);
    });
};

export const deleteMessageForMe = async (chatId, messageId, userId) => {
    const messageRef = doc(db, "chats", chatId, "messages", messageId);
    await updateDoc(messageRef, {
        deletedFor: arrayUnion(userId)
    });
};

export const clearChatForUser = async (chatId, userId) => {
    const chatRef = doc(db, "chats", chatId);
    await updateDoc(chatRef, {
        [`clearedAt.${userId}`]: serverTimestamp()
    });
};

export const deleteMessage = async (chatId, messageId) => {
    // 1. Delete the message
    await deleteDoc(doc(db, "chats", chatId, "messages", messageId));

    // 2. Fetch the NEW last message
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "desc"), limit(5));
    const snapshot = await getDocs(q);

    const chatRef = doc(db, "chats", chatId);

    // Filter out the deleted message ID if it persists in the query result
    const validDocs = snapshot.docs.filter(d => d.id !== messageId);

    if (validDocs.length > 0) {
        // We have a previous message
        const lastMsgDoc = validDocs[0].data();

        // Determine text to show
        let lastMsgText = "Message";
        if (lastMsgDoc.text) lastMsgText = lastMsgDoc.text;
        else if (lastMsgDoc.type === 'image' || lastMsgDoc.imageUrl) lastMsgText = "📷 Photo";
        else if (lastMsgDoc.type === 'video' || lastMsgDoc.videoUrl) lastMsgText = "🎥 Video";
        else if (lastMsgDoc.ciphertext) lastMsgText = "🔒 Encrypted message";

        await updateDoc(chatRef, {
            lastMessage: lastMsgText,
            lastMessageAt: lastMsgDoc.createdAt,
            lastMessageSenderId: lastMsgDoc.senderId
        });
    } else {
        // Chat is empty
        await updateDoc(chatRef, {
            lastMessage: "",
            lastMessageAt: serverTimestamp(),
            lastMessageSenderId: null
        });
    }
};

export const markMessageDelivered = async (chatId, messageId, userId) => {
    const messageRef = doc(db, "chats", chatId, "messages", messageId);
    await updateDoc(messageRef, {
        deliveredTo: arrayUnion(userId),
        [`deliveredAt.${userId}`]: serverTimestamp()
    });
};

export const markMessageRead = async (chatId, messageId, userId) => {
    const messageRef = doc(db, "chats", chatId, "messages", messageId);
    await updateDoc(messageRef, {
        readBy: arrayUnion(userId),
        [`readAt.${userId}`]: serverTimestamp()
    });
};

export const resetUnreadCount = async (chatId, userId) => {
    const chatRef = doc(db, "chats", chatId);
    await updateDoc(chatRef, {
        [`unreadCounts.${userId}`]: 0
    });
};

// --- Group Admin Functions ---

export const updateGroupName = async (chatId, newName) => {
    await updateDoc(doc(db, "chats", chatId), {
        name: newName,
        nameLower: newName.toLowerCase()
    });
};

export const updateGroupDescription = async (chatId, newDescription) => {
    await updateDoc(doc(db, "chats", chatId), {
        description: newDescription
    });
};

export const updateGroupPhoto = async (chatId, photoURL) => {
    await updateDoc(doc(db, "chats", chatId), {
        photoURL: photoURL
    });
};

export const makeAdmin = async (chatId, userId) => {
    await updateDoc(doc(db, "chats", chatId), {
        admins: arrayUnion(userId)
    });
};

export const addParticipant = async (chatId, newUserId, currentUserId) => {
    // 1. Get the current chat key (as the admin/adder)
    const chatKey = await getChatKey(chatId, currentUserId);
    if (!chatKey) {
        throw new Error("Could not retrieve chat key to add new member");
    }

    // 2. Wrap the key for the new user
    const encryptedForNewUser = await wrapKeyForUser(chatKey, newUserId);

    // 3. Add member and store key atomically (or close to it)
    const batch = writeBatch(db);

    // Add to members list
    const chatRef = doc(db, "chats", chatId);
    batch.update(chatRef, {
        members: arrayUnion(newUserId)
    });

    // Store the key
    const keyRef = doc(db, "chats", chatId, "keys", newUserId);
    batch.set(keyRef, encryptedForNewUser);

    await batch.commit();
};

export const removeParticipant = async (chatId, userId) => {
    const batch = writeBatch(db);

    // Remove from members and admins
    const chatRef = doc(db, "chats", chatId);
    batch.update(chatRef, {
        members: arrayRemove(userId),
        admins: arrayRemove(userId)
    });

    // Delete the key document
    const keyRef = doc(db, "chats", chatId, "keys", userId);
    batch.delete(keyRef);

    await batch.commit();
};

export const checkAdmin = (chat, userId) => {
    if (!chat?.isGroup) return false;
    // Legacy support: if no admins array, creator is admin
    if (!chat.admins) {
        return chat.createdBy === userId;
    }
    return chat.admins.includes(userId);
};

// --- User Search & Profile ---

export const searchUsers = async (searchTerm) => {
    const lowerTerm = searchTerm.toLowerCase();
    const q = query(
        collection(db, "users"),
        orderBy("displayNameLower"),
        where("displayNameLower", ">=", lowerTerm),
        where("displayNameLower", "<=", lowerTerm + '\uf8ff')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
};

export const searchGroups = async (searchTerm) => {
    const lowerTerm = searchTerm.toLowerCase();
    const q = query(
        collection(db, "chats"),
        orderBy("nameLower"),
        where("nameLower", ">=", lowerTerm),
        where("nameLower", "<=", lowerTerm + '\uf8ff')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getUserProfile = async (userId) => {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data();
    }
    return null;
};

export const updateUserProfile = async (userId, data) => {
    const updates = { ...data };
    if (data.displayName) {
        updates.displayNameLower = data.displayName.toLowerCase();
    }
    const docRef = doc(db, "users", userId);
    await updateDoc(docRef, updates);
};

// --- Encrypted Media Storage ---

export const uploadEncryptedChunks = async (messageId, chunks, onProgress) => {
    const totalChunks = chunks.length;
    let uploadedChunks = 0;

    // Upload chunks in parallel (limit concurrency if needed, but for now simple Promise.all)
    // For very large files, we might want to batch this.
    const uploadPromises = chunks.map(async (chunk) => {
        const chunkRef = doc(db, "mediaChunks", messageId, "chunks", chunk.index.toString());
        await setDoc(chunkRef, {
            index: chunk.index,
            data: chunk.data
        });
        uploadedChunks++;
        if (onProgress) {
            onProgress((uploadedChunks / totalChunks) * 100);
        }
    });

    await Promise.all(uploadPromises);
};

export const downloadChunks = async (messageId) => {
    const chunksRef = collection(db, "mediaChunks", messageId, "chunks");
    const q = query(chunksRef, orderBy("index"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => doc.data());
};

export const sendMediaMessage = async (chatId, senderId, metadata) => {
    const messageData = {
        senderId,
        type: metadata.type, // 'image' or 'video'
        encrypted: true,
        mimeType: metadata.mimeType,
        mediaIv: metadata.mediaIv || metadata.iv || null, // New field for media IV
        iv: metadata.textIv || metadata.iv || null, // Use text IV if available, else fallback
        chunkCount: metadata.chunkCount,
        ciphertext: metadata.textCiphertext || null, // Stores encrypted caption
        createdAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        status: "sent",
        replyTo: metadata.replyTo || null,
        deliveredTo: [],
        readBy: [],
        deliveredAt: {},
        readAt: {}
    };

    if (metadata.thumbnailAvailable) {
        messageData.thumbnailAvailable = true;
        messageData.thumbnailChunkCount = metadata.thumbnailChunkCount;
        messageData.thumbnailIv = metadata.thumbnailIv;
    }

    // Add message to subcollection
    // We use setDoc with a specific ID if provided, but here we assume messageId was pre-generated
    // If metadata.messageId is provided, use it.

    const messageRef = doc(db, "chats", chatId, "messages", metadata.messageId);
    await setDoc(messageRef, messageData);

    // Update last message in chat doc
    const lastMsgText = metadata.type === 'image' ? "📷 Photo" : "🎥 Video";
    await updateDoc(doc(db, "chats", chatId), {
        lastMessage: lastMsgText,
        lastMessageSenderId: senderId,
        lastMessageAt: serverTimestamp()
    });
};

export const uploadPublicChunks = async (fileId, file) => {
    const buffer = await file.arrayBuffer();
    const chunks = [];
    const chunkSize = 512 * 1024;
    const uint8Array = new Uint8Array(buffer);

    for (let i = 0; i < buffer.byteLength; i += chunkSize) {
        const chunkBytes = uint8Array.subarray(i, Math.min(i + chunkSize, buffer.byteLength));
        let binary = '';
        for (let j = 0; j < chunkBytes.byteLength; j++) binary += String.fromCharCode(chunkBytes[j]);
        chunks.push({ index: chunks.length, data: window.btoa(binary) });
    }

    const uploadPromises = chunks.map(async (chunk) => {
        await setDoc(doc(db, "publicMedia", fileId, "chunks", chunk.index.toString()), {
            index: chunk.index,
            data: chunk.data
        });
    });

    await Promise.all(uploadPromises);
    return `firestore://${fileId}`;
};

export const downloadPublicChunks = async (fileId) => {
    const q = query(collection(db, "publicMedia", fileId, "chunks"), orderBy("index"));
    const snapshot = await getDocs(q);
    const chunks = snapshot.docs.map(doc => doc.data());

    let totalSize = 0;
    const decodedChunks = chunks.map(chunk => {
        const binary = window.atob(chunk.data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        totalSize += bytes.length;
        return bytes;
    });

    const combined = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of decodedChunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
    }

    return combined.buffer;
};
