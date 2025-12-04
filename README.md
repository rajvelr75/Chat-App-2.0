# Chat App

A fully functional, responsive Chat Application built with React, Tailwind CSS, and Firebase.

## Features

- 📱 **Responsive Design**: Mobile-first layout that adapts to desktop (split view) automatically.
- 🔐 **Authentication**: Email/Password login and registration via Firebase Auth.
- 💬 **Real-time Messaging**: Instant messaging using Cloud Firestore.
- 🔒 **E2E Encryption**: Simplified End-to-End encryption for text messages using Web Crypto API.
- 📷 **Media Sharing**: Image upload support via Firebase Storage.
- 🟢 **Presence System**: Real-time Online/Offline status and Last Seen indicators.
- 🔔 **Notifications**: Push notifications support via Firebase Cloud Messaging (FCM).

## Prerequisites

- Node.js (v16+)
- A Firebase Project

## Setup Instructions

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Create a new project.
3. **Authentication**: Enable "Email/Password" provider.
4. **Firestore Database**: Create a database in "Production mode" (or Test mode, but update rules).
   - Enable it.
5. **Storage**: Enable Firebase Storage.
6. **Project Settings**:
   - Go to Project Settings > General.
   - Register a Web App.
   - Copy the `firebaseConfig` object keys.

### 2. Environment Variables

Create a `.env` file in the root directory and fill in your Firebase details:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. Installation

```bash
npm install
```

### 4. Running Locally

```bash
npm run dev
```

Open http://localhost:5173 to view the app.

## Deployment

### Vercel / Cloudflare Pages / Netlify

1. Push your code to a GitHub repository.
2. Connect your repository to the hosting provider.
3. Set the **Environment Variables** in the hosting dashboard (same as `.env`).
4. Build Command: `npm run build`
5. Output Directory: `dist`

### Firebase Hosting

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init`
   - Select **Hosting**.
   - Use existing project.
   - Public directory: `dist`
   - Configure as single-page app: **Yes**
4. Build and Deploy:
   ```bash
   npm run build
   firebase deploy
   ```

## Security Notes

- **E2E Encryption**: This app uses a simplified E2E scheme where chat keys are stored in Firestore (encrypted with a derived user key). In a production environment, you should use proper public-key cryptography (e.g., Signal Protocol) and avoid storing keys on the server if possible.
- **Firestore Rules**: Ensure you configure Firestore Security Rules to protect user data.

## License

MIT
