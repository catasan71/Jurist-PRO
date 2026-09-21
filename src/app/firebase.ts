import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Import the Firebase configuration
import { firebaseConfig } from './firebase-config';

// Initialize Firebase SDK
let app;
try {
  if (!firebaseConfig || !firebaseConfig.apiKey) {
    throw new Error('Firebase configuration is missing or invalid.');
  }
  app = initializeApp(firebaseConfig);
} catch (error) {
  console.error('CRITICAL: Failed to initialize Firebase:', error);
  // We export dummy instances to prevent immediate crashes, 
  // but most operations will fail with clear console errors.
  app = initializeApp({ apiKey: 'dummy', projectId: 'dummy' });
}

export const db = getFirestore(app, (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId || '(default)');
export const auth = getAuth(app);
