import { Injectable, signal, computed, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { auth, db } from '../app/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, updateDoc, collection, getDocs, deleteDoc, onSnapshot, getDoc, FirestoreError } from 'firebase/firestore';
import { NotificationService } from './notification.service';

/**
 * Tipuri de operațiuni Firestore pentru diagnostic
 */
export enum FirestoreOp {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export type UserRole = 'admin' | 'lawyer';
export type SubscriptionStatus = 'active' | 'pending_payment' | 'expired' | 'trial' | 'cancelled';

export interface UserConsents {
  terms: boolean;
  gdpr: boolean;
  marketing: boolean;
  tracking: boolean;
}

export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  plan: 'trial' | 'expert' | 'gold';
  status: SubscriptionStatus;
  credits: number;
  consents?: UserConsents;
  billing_data?: Record<string, unknown>;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  platformId = inject(PLATFORM_ID);
  // State
  private _currentUser = signal<AppUser | null>(null);
  private _loading = signal<boolean>(true);
  private notificationService = inject(NotificationService);
  
  // Admin State
  private _allUsers = signal<AppUser[]>([]);

  currentUser = this._currentUser.asReadonly();
  isLoading = this._loading.asReadonly();
  allUsers = this._allUsers.asReadonly();
  
  isAdmin = computed(() => {
    const user = this._currentUser();
    if (!user) return false;
    
    // Hardcoded check
    const adminEmails = ['catalinsandu07@gmail.com', 'admin@juristpro.ai', 'juristpro.ai@gmail.com'];
    const emailToUse = (user.email || '').toLowerCase().trim();
    const isHardcodedAdmin = emailToUse !== '' && adminEmails.includes(emailToUse);
    
    // ALWAYS force admin for these emails
    if (isHardcodedAdmin) return true;
    
    const isRoleAdmin = user.role === 'admin';
    return isRoleAdmin;
  });

  private async promoteToAdmin(userId: string) {
    try {
      const docRef = doc(db, 'profiles', userId);
      await updateDoc(docRef, { role: 'admin' });
      console.log(`[AUTH] Utilizatorul ${userId} a fost promovat la rolul de admin.`);
    } catch (error) {
      console.error(`[AUTH] Eroare la promovarea utilizatorului ${userId}:`, error);
    }
  }
  
  isAuthenticated = computed(() => !!this._currentUser());
  
  isDemo = computed(() => {
    const user = this._currentUser();
    if (!user) return false;
    return user.id.startsWith('demo-') || user.id.startsWith('bypass-') || user.id.startsWith('admin-demo');
  });

  isRealUser = computed(() => {
    return this.isAuthenticated() && !this.isDemo();
  });

  private handleFirestoreError(error: unknown, operation: FirestoreOp, path: string | null) {
    const errObj = {
      error: error instanceof FirestoreError ? { code: error.code, message: error.message } : String(error),
      auth: {
        uid: auth.currentUser?.uid,
        email: auth.currentUser?.email,
      },
      operation,
      path,
      timestamp: new Date().toISOString()
    };
    console.error('[FIRESTORE ERROR]', JSON.stringify(errObj));
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.toLowerCase().includes('permission')) {
      this.notificationService.error(`Lipsă permisiuni: ${operation} pe ${path}.`);
    } else {
      this.notificationService.error(`Eroare bază de date: ${msg}`);
    }
    throw error;
  }

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initSession();
      
      effect(() => {
          if (this.isAdmin()) {
              this.fetchAllUsers();
          }
      });
    } else {
      this._loading.set(false);
    }
  }

  async initSession() {
    this._loading.set(true);

    onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      const current = this._currentUser();
      const isLocalSession = current && (current.id.startsWith('demo-') || current.id.startsWith('bypass-') || current.id.startsWith('admin-demo'));

      if (isLocalSession && !user) {
          this._loading.set(false);
          return;
      }

      if (user) {
        await this.fetchProfile(user.uid, user.email || '');
      } else {
        if (!isLocalSession) {
           this._currentUser.set(null);
        }
      }
      this._loading.set(false);
    }, (error) => {
      console.error('Auth State Change Error:', error);
      this.notificationService.error('Eroare la verificarea sesiunii.');
    });
  }

  forceFallbackUserIfAuthenticated() {
    const user = auth.currentUser;
    if (user && !this._currentUser()) {
        const lowerEmail = (user.email || '').toLowerCase().trim();
        const isAdminEmail = lowerEmail === 'catalinsandu07@gmail.com' || 
                             lowerEmail === 'admin@juristpro.ai' ||
                             lowerEmail === 'juristpro.ai@gmail.com';
        const role = isAdminEmail ? 'admin' : 'lawyer';

        this._currentUser.set({
            id: user.uid,
            email: user.email || '',
            fullName: user.displayName || user.email?.split('@')[0] || 'Utilizator',
            role: role,
            plan: 'expert',
            status: 'active',
            credits: 50,
            consents: { terms: true, gdpr: true, marketing: false, tracking: true }
        });
        console.warn("[AUTH] Forced fallback profile because fetch timed out.");
    }
  }

  // --- REAL-TIME UPDATE METHODS ---
  updateUserCredits(newAmount: number) {
    this._currentUser.update(user => {
      if (!user) return null;
      return { ...user, credits: newAmount };
    });
  }

  updateUserConsents(newConsents: UserConsents) {
    this._currentUser.update(user => {
        if (!user) return null;
        return { ...user, consents: newConsents };
    });
  }

  async updateBillingData(userId: string, billingData: Record<string, unknown>) {
    try {
      const docRef = doc(db, 'profiles', userId);
      await updateDoc(docRef, { billing_data: billingData });
      this.notificationService.success('Datele de facturare au fost salvate.');
      return { error: null };
    } catch (error: unknown) {
      console.error("Error updating billing data:", error);
      const msg = error instanceof Error ? error.message : String(error);
      this.notificationService.error(`Eroare la salvarea datelor: ${msg}`);
      return { error: msg };
    }
  }

  async login(email: string, pass: string): Promise<{ error: string | null }> {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      this.notificationService.success('Autentificare reușită!');
      return { error: null };
    } catch (error: unknown) {
      const err = error as { message?: string };
      const msg = err.message || 'Eroare la autentificare.';
      this.notificationService.error(msg);
      return { error: msg };
    }
  }

  async resetPassword(email: string): Promise<{ error: string | null }> {
    console.log('DEBUG: Resetting password for:', email);
    try {
      await sendPasswordResetEmail(auth, email);
      this.notificationService.info('Email-ul de resetare a fost trimis.');
      return { error: null };
    } catch (error: unknown) {
      console.error('DEBUG: Reset password error:', error);
      const err = error as { message?: string, code?: string };
      let msg = err.message || 'Eroare la trimiterea emailului.';
      
      if (err.code === 'auth/network-request-failed' || (msg && msg.includes('network-request-failed'))) {
        msg = 'Eroare de rețea. Verificați conexiunea la internet sau dacă aveți un AdBlocker / Brave Shields activ, deoarece acesta poate bloca cererile către Firebase. Puteți încerca să deschideți aplicația într-un tab nou.';
      } else if (err.code === 'auth/user-not-found' || (msg && msg.includes('user-not-found'))) {
        msg = 'Nu există niciun cont asociat cu această adresă de email.';
      }
      
      this.notificationService.error(msg);
      return { error: msg };
    }
  }

  private _pendingRegistrationData: { plan: string, consents: UserConsents } | null = null;

  async loginWithGoogle(plan?: string, consents?: UserConsents): Promise<{ error: string | null }> {
    try {
      if (plan && consents) {
        this._pendingRegistrationData = { plan, consents };
      }
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      this.notificationService.success('Conectat cu Google!');
      return { error: null };
    } catch (error: unknown) {
      const err = error as { message?: string, code?: string };
      let msg: string;
      
      console.error("Google Auth Error:", err);

      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/popup-blocked') {
        const isInIFrame = window.self !== window.top;
        if (isInIFrame) {
          msg = 'Fereastra Google a fost blocată de mediul de previzualizare. Te rugăm să deschizi aplicația într-un tab nou apăsând pe butonul din colțul dreapta-sus.';
        } else {
          msg = 'Fereastra de autentificare Google a fost închisă. Te rugăm să încerci din nou.';
        }
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Prea multe încercări. Te rugăm să aștepți câteva minute.';
      } else if (err.code === 'auth/unauthorized-domain') {
        msg = 'Domeniul actual nu este autorizat în Firebase Console. Adaugă domain-ul aplicației în secțiunea "Authorized domains" din Authentication -> Settings.';
      } else if (err.code === 'auth/operation-not-allowed') {
        msg = 'Metoda de autentificare Google nu este activată în proiectul tău Firebase.';
      } else {
        msg = `Eroare Google: ${err.message || err.code || 'Necunoscută'}`;
      }
      
      this.notificationService.error(msg);
      return { error: msg };
    }
  }

  async loginAsDemo() {
    this._loading.set(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    const demoUser: AppUser = {
      id: 'demo-user-id',
      email: 'demo@juristpro.ai',
      fullName: 'Avocat Vizitator (Demo)',
      role: 'lawyer',
      plan: 'expert',
      status: 'active',
      credits: 100,
      consents: { terms: true, gdpr: true, marketing: false, tracking: false }
    };
    
    this._currentUser.set(demoUser);
    this.notificationService.info('Accesat în mod Demo.');
    this._loading.set(false);
  }

  async loginAsAdminDemo() {
    this._loading.set(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    const adminUser: AppUser = {
      id: 'admin-demo-id',
      email: 'admin@juristpro.ai',
      fullName: 'Administrator Sistem',
      role: 'admin',
      plan: 'gold',
      status: 'active',
      credits: 9999,
      consents: { terms: true, gdpr: true, marketing: false, tracking: false }
    };
    
    this._currentUser.set(adminUser);
    this.notificationService.info('Accesat în mod Admin Demo.');
    
    if (this._allUsers().length === 0) {
        this._allUsers.set([
            { id: 'u1', email: 'avocat1@law.ro', fullName: 'Av. Popescu Ion', role: 'lawyer', plan: 'expert', status: 'active', credits: 45, consents: { terms: true, gdpr: true, marketing: true, tracking: true } },
            { id: 'u2', email: 'office@legal.com', fullName: 'SC Legal Solutions', role: 'lawyer', plan: 'gold', status: 'active', credits: 410, consents: { terms: true, gdpr: true, marketing: false, tracking: true } },
            { id: 'u3', email: 'test@student.ro', fullName: 'Student Drept', role: 'lawyer', plan: 'trial', status: 'expired', credits: 0, consents: { terms: true, gdpr: true, marketing: true, tracking: false } },
            { id: 'u4', email: 'demo@juristpro.ai', fullName: 'Avocat Vizitator', role: 'lawyer', plan: 'expert', status: 'active', credits: 100, consents: { terms: true, gdpr: true, marketing: false, tracking: false } }
        ]);
    }

    this._loading.set(false);
  }

  async register(email: string, pass: string, fullName: string, plan: string, consents: UserConsents): Promise<{ error: string | null; warning?: string }> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const user = userCredential.user;
      
      const initialCredits = plan === 'trial' ? 5 : 0;
      
      const initialCabinetData = {
        lawyerName: fullName,
        name: '',
        barId: '',
        cif: '',
        address: '',
        phone: '',
        email: email
      };

      const profileData = {
        id: user.uid,
        email: email,
        full_name: fullName,
        role: 'lawyer',
        plan: plan,
        status: plan === 'trial' ? 'trial' : 'pending_payment',
        credits: initialCredits,
        cabinet_data: initialCabinetData,
        consents: consents,
        created_at: new Date().toISOString()
      };

      await setDoc(doc(db, 'profiles', user.uid), profileData);
      this.notificationService.success('Cont creat cu succes!');
      return { error: null };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn("Registration Error:", errorMessage);
      
      const isRateLimit = errorMessage.includes('too-many-requests') || errorMessage.includes('network-request-failed');
      
      if (isRateLimit) {
          console.warn(">>> ACTIVATING RATE LIMIT BYPASS MODE <<<");
          
          const bypassUser: AppUser = {
              id: 'bypass-' + Date.now(), 
              email: email,
              fullName: fullName,
              role: 'lawyer',
              plan: plan as 'trial' | 'expert' | 'gold',
              status: plan === 'trial' ? 'trial' : 'pending_payment',
              credits: plan === 'trial' ? 5 : 0,
              consents: consents
          };

          this._currentUser.set(bypassUser);
          this.notificationService.warning('Acces limitat activat din cauza traficului intens.');
          
          return { 
              error: null, 
              warning: "Notă: Serverul este aglomerat, dar am creat un cont local temporar pentru a vă permite accesul imediat." 
          };
      }

      this.notificationService.error(errorMessage);
      return { error: errorMessage };
    }
  }

  async logout() {
    try {
      if (this.profileUnsubscribe) {
        this.profileUnsubscribe();
        this.profileUnsubscribe = null;
      }
      this._currentUser.set(null);
      this._allUsers.set([]);
    } catch {
      // Ignore cleanup errors
    }
    
    // Sign out. We don't want partial unsubs to crash us.
    try {
      await signOut(auth);
      this.notificationService.info('V-ați deconectat.');
      window.location.reload(); // Force full reload to wipe all listeners and state safely
    } catch (error) {
      console.error('Logout error:', error);
      window.location.reload();
    }
  }

  async refreshSession() {
    const user = auth.currentUser;
    if (user) {
      await this.fetchProfile(user.uid, user.email || '');
    }
  }

  private profileUnsubscribe: (() => void) | null = null;

  private _isCreatingProfile = false;

  private async fetchProfile(userId: string, email: string) {
    try {
      if (this.profileUnsubscribe) {
        this.profileUnsubscribe();
      }

      const docRef = doc(db, 'profiles', userId);
      
      this.profileUnsubscribe = onSnapshot(docRef, (docSnap) => {
        const lowerEmail = (email || '').toLowerCase().trim();
        const isAdminEmail = lowerEmail === 'catalinsandu07@gmail.com' || 
                             lowerEmail === 'admin@juristpro.ai' ||
                             lowerEmail === 'juristpro.ai@gmail.com';

        if (docSnap.exists()) {
          this._isCreatingProfile = false;
          const data = docSnap.data();
          
          let role = data['role'] || 'lawyer';
          let status = data['status'];
          let plan = data['plan'];
          let credits = data['credits'];

          if (isAdminEmail) {
             role = 'admin';
             if (status !== 'active') { status = 'active'; }
             if (plan !== 'expert' && plan !== 'gold') { plan = 'expert'; }
             if (!credits || credits < 9999) { credits = 99999; }
          }

          this._currentUser.set({
            id: userId,
            email: email || data['email'],
            fullName: data['full_name'],
            role: role,
            plan: plan,
            status: status,
            credits: credits,
            consents: data['consents'],
            billing_data: data['billing_data']
          });
        } else {
          if (this._isCreatingProfile) return;
          this._isCreatingProfile = true;

          // If profile doesn't exist but auth does, create a basic profile
          let plan = this._pendingRegistrationData?.plan || 'trial';
          const consents = this._pendingRegistrationData?.consents || { terms: true, gdpr: true, marketing: false, tracking: true };
          let credits = plan === 'trial' ? 5 : 0;
          let status = plan === 'trial' ? 'trial' : 'pending_payment';

          const role = isAdminEmail ? 'admin' : 'lawyer';
          
          if (isAdminEmail) {
             status = 'active';
             plan = 'expert';
             credits = 99999;
          }

          const newProfile = {
            id: userId,
            email: email,
            full_name: email ? email.split('@')[0] : 'Utilizator Nou',
            role: role,
            plan: plan,
            status: status,
            credits: credits,
            consents: consents,
            created_at: new Date().toISOString()
          };
          
          this._pendingRegistrationData = null; // clear it

          console.log(`[AUTH] Creating new profile for ${userId} (${email})...`);
          setDoc(docRef, newProfile).then(() => {
            console.log(`[AUTH] Profile created successfully for ${userId}`);
            this._isCreatingProfile = false;
          }).catch(err => {
            this._isCreatingProfile = false;
            this.handleFirestoreError(err, FirestoreOp.CREATE, `profiles/${userId}`);
          });
        }
      }, (error) => {
        this.handleFirestoreError(error, FirestoreOp.GET, `profiles/${userId}`);
      });
    } catch (error) {
      console.error("Error setting up profile listener:", error);
    }
  }
  
  // Admin Method
  async fetchAllUsers() {
      try {
        const querySnapshot = await getDocs(collection(db, 'profiles'));
        const users: AppUser[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          users.push({
            id: doc.id,
            email: data['email'] || 'hidden@user.com',
            fullName: data['full_name'],
            role: data['role'] || 'lawyer',
            plan: data['plan'],
            status: data['status'],
            credits: data['credits'],
            consents: data['consents']
          });
        });
        this._allUsers.set(users);
      } catch (error) {
        this.handleFirestoreError(error, FirestoreOp.LIST, 'profiles');
      }
  }

  async deleteUser(id: string) {
      try {
        await deleteDoc(doc(db, 'profiles', id));
        this._allUsers.update(u => u.filter(user => user.id !== id));
        this.notificationService.success('Utilizator șters.');
      } catch (error) {
        console.error("Error deleting user:", error);
        this.notificationService.error('Eroare la ștergerea utilizatorului.');
      }
  }

  async addCreditsToUser(id: string, amount: number) {
    // Quick local update for bypass/demo users
    if (id.startsWith('demo') || id.startsWith('bypass') || id.startsWith('admin')) {
      this._currentUser.update(u => u ? ({ ...u, credits: (u.credits || 0) + amount }) : null);
      this.notificationService.success(`S-au adăugat ${amount} credite.`);
      return;
    }

    try {
      const userRef = doc(db, 'profiles', id);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const currentCredits = userSnap.data()['credits'] || 0;
        await updateDoc(userRef, { credits: currentCredits + amount });
        this.notificationService.success(`S-au adăugat ${amount} credite.`);
      }
    } catch (error) {
      this.handleFirestoreError(error, FirestoreOp.UPDATE, `profiles/${id}`);
    }
  }

  async activateSubscription() {
    const user = this._currentUser();
    if (!user) return;

    if (user.id.startsWith('demo') || user.id.startsWith('bypass') || user.id.startsWith('admin')) {
        this._currentUser.update(u => u ? ({...u, status: 'active', plan: 'expert', credits: 150}) : null);
        this.notificationService.success('Abonament activat (Mod Demo).');
        return; 
    }

    try {
      await updateDoc(doc(db, 'profiles', user.id), { status: 'active' });
      await this.fetchProfile(user.id, user.email);
      this.notificationService.success('Abonament activat cu succes!');
    } catch (error) {
      console.error("Error activating subscription:", error);
      this.notificationService.error('Eroare la activarea abonamentului.');
    }
  }
}
