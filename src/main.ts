import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection, ErrorHandler } from '@angular/core';
import { AppComponent } from './app.component';
import { GlobalErrorHandler } from './services/global-error-handler.service';
import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from './app/firebase';

// Connectivity Test on Startup
async function testFirebaseConnection() {
  try {
    // Attempt to fetch a non-existent doc just to check connectivity
    await getDocFromServer(doc(db, 'system_settings', 'health-check'));
    console.log('Firebase connectivity verified.');
  } catch (error: unknown) {
    const err = error as { message?: string, code?: string };
    if (err?.message?.includes('offline') || err?.code === 'unavailable') {
      console.error('CRITICAL: Firebase appears to be offline. Verify your network and configuration.');
    } else {
      // Missing permissions are fine, at least the server responded
      console.log('Firebase server responded (Permissions check skipped).');
    }
  }
}

testFirebaseConnection();

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    { provide: ErrorHandler, useClass: GlobalErrorHandler }
  ]
}).catch(err => console.error(err));
