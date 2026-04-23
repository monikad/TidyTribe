/**
 * FIREBASE CONFIGURATION
 * Config values are loaded from utils/env.js (git-ignored).
 * See utils/env.example.js for the template.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js';
import { getFirestore }  from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';
import { getAuth }       from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js';
import { ENV } from './env.js';

const firebaseConfig = {
    apiKey:            ENV.FIREBASE_API_KEY,
    authDomain:        ENV.FIREBASE_AUTH_DOMAIN,
    projectId:         ENV.FIREBASE_PROJECT_ID,
    storageBucket:     ENV.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: ENV.FIREBASE_MESSAGING_SENDER_ID,
    appId:             ENV.FIREBASE_APP_ID
};

let app, db, auth;
try {
    app  = initializeApp(firebaseConfig);
    db   = getFirestore(app);
    auth = getAuth(app);
    console.log('[Firebase] ✅ Connected to project:', ENV.FIREBASE_PROJECT_ID);
} catch (err) {
    console.error('[Firebase] ❌ Initialization failed:', err);
}

export { app, db, auth };
export default db;
