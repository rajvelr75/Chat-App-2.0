import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, sendPasswordResetEmail } from "firebase/auth";
import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

export const registerUser = async (email, password, displayName) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update Auth Profile
        await updateProfile(user, { displayName });

        // Create User Document in Firestore
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: user.email,
            displayName: displayName,
            displayNameLower: displayName.toLowerCase(),
            photoURL: user.photoURL || "",
            about: "Hey there! I am using Chat App.",
            lastSeen: serverTimestamp(),
            isOnline: true,
            createdAt: serverTimestamp()
        });

        return user;
    } catch (error) {
        throw error;
    }
};

export const loginUser = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // Update online status
        await updateDoc(doc(db, "users", userCredential.user.uid), {
            isOnline: true
        });
        return userCredential.user;
    } catch (error) {
        throw error;
    }
};

export const logoutUser = async (uid) => {
    try {
        if (uid) {
            await updateDoc(doc(db, "users", uid), {
                isOnline: false,
                lastSeen: serverTimestamp()
            });
        }
        await signOut(auth);
    } catch (error) {
        throw error;
    }
};
export const resetPassword = async (email) => {
    try {
        await sendPasswordResetEmail(auth, email);
    } catch (error) {
        throw error;
    }
};
