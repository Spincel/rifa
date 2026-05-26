/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Resolve Firebase config with optional dynamic environment overrides for custom production hosting (e.g. Vercel)
const metaEnv = (import.meta as { env?: Record<string, string> }).env || {};

const userFirebaseConfig = {
  apiKey: "AIzaSyCbxX3MGTZFK2GC4d-eY6pVwsKvKs6ladI",
  authDomain: "rifa-9d394.firebaseapp.com",
  projectId: "rifa-9d394",
  storageBucket: "rifa-9d394.firebasestorage.app",
  messagingSenderId: "793111784517",
  appId: "1:793111784517:web:19168f5398106d4302c72c",
};

const resolvedConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || userFirebaseConfig.apiKey || firebaseConfig.apiKey,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || userFirebaseConfig.authDomain || firebaseConfig.authDomain,
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || userFirebaseConfig.projectId || firebaseConfig.projectId,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || userFirebaseConfig.storageBucket || firebaseConfig.storageBucket,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || userFirebaseConfig.messagingSenderId || firebaseConfig.messagingSenderId,
  appId: metaEnv.VITE_FIREBASE_APP_ID || userFirebaseConfig.appId || firebaseConfig.appId,
};

// Reuse existing app or initialize layout
const app = getApps().length > 0 ? getApp() : initializeApp(resolvedConfig);
export const auth: Auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();
// Request necessary Google Sheets and Google Drive permissions
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

// In-Memory cache for the access token to meet strict security requirements
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Initialize state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Start Google sign-in workflow
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Fallo al obtener el token de acceso de Google.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Error Google Sign-In:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logoutGoogle = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};
