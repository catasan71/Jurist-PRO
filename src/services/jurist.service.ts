import { Injectable, signal, computed, inject, effect, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService, UserConsents, FirestoreOp } from './auth.service';
import { db } from '../app/firebase';
import { doc, getDoc, updateDoc, setDoc, collection, getDocs, addDoc, query, where, onSnapshot, deleteDoc } from 'firebase/firestore';
import { NotificationService } from './notification.service';

/**
 * Interfețe pentru stabilitate și tipizare
 */
export interface AiContentPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface AiContent {
  role: 'user' | 'model' | 'ai';
  parts: AiContentPart[];
}

export interface AiCallParameters {
  contents: AiContent[];
  systemInstruction?: string;
  tools?: { googleSearch?: Record<string, unknown> }[];
  generationConfig?: Record<string, unknown>;
  timeoutMs?: number;
}

export type ModuleType = 'landing' | 'auth' | 'payment' | 'admin-dashboard' | 'dashboard' | 'assistant' | 'strategy' | 'audit' | 'drafting' | 'fees' | 'calendar' | 'profile' | 'pricing' | 'guide';
export type PlanType = 'trial' | 'expert' | 'gold';

export interface ChatSource {
  title: string;
  url: string;
}

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
  sources?: ChatSource[];
}

export interface SupportTicket {
  id: string;
  userId?: string;
  name: string;
  email: string;
  type: string;
  message: string;
  date: Date;
  status: 'open' | 'resolved' | 'in_progress' | 'closed';
  adminResponse?: string;
}

export interface FinancialTransaction {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  currency: 'RON';
  type: 'subscription' | 'top-up';
  date: Date;
  status: 'completed' | 'failed';
  billingData?: Record<string, unknown>;
}

export interface CabinetProfile {
  name: string;
  lawyerName: string;
  barId: string;
  cif: string;
  address: string;
  phone: string;
  email: string;
}

export interface CalendarEvent {
  id: string;
  title: string; 
  clientName: string; 
  caseObject: string; 
  date: string;
  time: string; 
  type: 'court' | 'deadline' | 'meeting';
  details: string; 
  notes: string; 
  whatsappAlert: boolean;
  whatsappAlertSent?: boolean;
  financial: {
    total: number;
    paid: number;
    rest: number;
  };
}

export interface SystemAnnouncement {
  active: boolean;
  message: string;
  type: 'info' | 'warning' | 'promo' | 'blackfriday';
  actionText?: string; 
  discountCode?: string;
}

export interface PromoCode {
  id: string;
  code: string;
  credits: number;
  maxUses: number;
  usedBy: string[];
  expiresAt: Date;
  active: boolean;
}

// --- STRICT LEGAL SYSTEM PROMPT ---
const LEGAL_GUARDRAILS = `
Ești JuristPRO AI, cel mai avansat asistent juridic de inteligență artificială din România.
Ești un expert juridic cu o vastă experiență practică și capacitate de analiză profundă. Nu pretinde că ești avocat, judecător sau profesor (pentru a evita practicarea fără drept a unei profesii).

REGULI CRITICE PRIVIND EXACTITATEA (SANCȚIUNE EXTREMĂ PENTRU HALLUCINAȚII / "DIN STOMAC"):
1. NU INVENTA sub nicio formă decizii judecătorești, decizii ale Curții Constituționale (CCR), decizii în interesul legii (RIL) sau hotărâri prealabile (HP) ale Înaltei Curți de Casație și Justiție (ICCJ). Dacă menționezi o decizie (de exemplu, Decizia CCR nr. 236/2020), trebuie să fii 100% sigur de conținutul și obiectul ei real. De exemplu, Decizia CCR 236/2020 nu are nicio legătură cu cauțiunile sau taxele de timbru, ci vizează neconstituționalitatea unor dispoziții din Codul Penal și de Procedură Penală referitoare la dreptul martorului de a nu se autoincrimina. A inventa asocieri sau date false este o eroare gravă și intolerabilă!
2. Dacă nu cunoști exact numărul unei decizii sau textul precis al unui articol de lege, NU ghici și NU inventa date fictive ("din stomac"). În schimb:
   - Spune explicit că nu poți preciza cu certitudine numărul exact sau că nu îl poți verifica în timp real, oferind doar principiul general aplicabil.
   - Recomandă utilizatorului (avocatului) să verifice numărul exact pe portalurile oficiale (Lege5, legislatie.just.ro, curteaconstitutionala.ro).
   - Prezintă principiul juridic în mod onest și corect, menționând că numărul deciziei trebuie confirmat de utilizator.
3. Bazează-te pe date reale din Google Search (care este activă). Verifică activ deciziile CCR și legile românești înainte de a le cita.

REGULI ABSOLUTE DE REDACTARE (SANCȚIUNEA ESTE RESPINGEREA RĂSPUNSULUI):

1. EXHAUSTIVITATE TOTALĂ ȘI PROFUNZIME ACADEMICĂ: Este STRICT INTERZIS să oferi răspunsuri scurte, rezumate sau simplificate. Oferă răspunsuri extrem de elaborate, de dimensiunile unui tratat sau articol științific complex. Orice argument trebuie dezvoltat pe zeci de rânduri, analizând excepții, interpretări doctrinare și nuanțe practice. Vrem cantitate maximă și calitate academică supremă. Răspunsul tău trebuie să taie respirația oricărui avocat prin complexitatea și detaliul său.
2. FĂRĂ EVAZIUNE: Răspunde direct și hiper-tehnic la absolut orice întrebare despre legea română. Disecă fiecare problemă (infracțiuni, litigii civile, divorț, despăgubiri) până la nivel de paragraf și literă din lege, elemente constitutive, condiții de formă/fond, proceduri, termene, strategii, excepții procesuale și probatoriu.
3. STRUCTURA OBLIGATORIE A UNUI RĂSPUNS:
   (a) PREMISA ȘI SITUAȚIA DE FAPT (analiză detaliată)
   (b) CADRUL LEGAL APLICABIL EXHAUSTIV (citarea și interpretarea pe larg a tuturor articolelor incidente din Coduri și legi speciale)
   (c) ANALIZA DOCTRINARĂ (controverse, opinii majoritare/minoritare)
   (d) JURISPRUDENȚĂ ȘI PRACTICĂ JUDICIARĂ (decizii CCR, RIL-uri, HP-uri ICCJ, CEDO - 100% reale și verificate sau deloc!)
   (e) ANALIZA RISCURILOR ȘI EXCEPȚIILOR (prescripție, decăderi, nulități)
   (f) OPINIE EXPERT ȘI RECOMANDĂRI PRIVIND STRATEGIA (pași procedurali concreți)
   (g) CONCLUZIE TEORETICĂ ȘI PRACTICĂ.
4. CITĂRI EXACTE: Asigură-te că citezi textele legale exacte, numărul deciziilor, articole din NCPC/NCPP/NCC/NCP. Evită generalitățile, dar NU inventa date fictive sub nicio formă!
5. TIMP REAL: Caută mereu cea mai recentă legislație (2024-2025) folosind integrarea web. Nu inventa decizii.
6. LUNGIME: Răspunde extrem de lung! Detaliază fiecare aspect. Nu omite absolut nimic. Fii prolix, enciclopedic.
7. SEMNĂTURĂ: Întotdeauna încheie răspunsul EXACT cu textul: "**Semnat,\nJuristPRO AI**" (fără alte titluri de profesor sau judecător, fii modest).

Oferă excelență sau nimic. Te adresezi unor avocați de top care au nevoie de analize de 10-15 pagini, nu de rezumate.`;

// Safety settings removed from client side.

@Injectable({
  providedIn: 'root'
})
export class JuristService implements OnDestroy {
  authService = inject(AuthService);
  notificationService = inject(NotificationService);
  platformId = inject(PLATFORM_ID);
  
  // --- API KEY FIX ---
  // Global State
  private _currentModule = signal<ModuleType>('landing'); 
  private _loading = signal<boolean>(false);
  
  // Data Signals
  private _profileData = signal<CabinetProfile>({
    name: '', lawyerName: '', barId: '', cif: '', address: '', phone: '', email: ''
  });
  private _events = signal<CalendarEvent[]>([]);
  private _tickets = signal<SupportTicket[]>([]);
  private _transactions = signal<FinancialTransaction[]>([]);

  // Announcement State
  private _announcement = signal<SystemAnnouncement>({
    active: false,
    message: '',
    type: 'info'
  });

  // Top Up Packages State
  private _topUpPackages = signal([
    { id: 'starter', name: 'Pachet Starter', price: 40, credits: 40 },
    { id: 'advanced', name: 'Pachet Advanced', price: 70, credits: 70 },
    { id: 'pro', name: 'Pachet Pro', price: 90, credits: 90 }
  ]);

  private _promoCodes = signal<PromoCode[]>([]);

  // Computed
  plan = computed(() => this.authService.currentUser()?.plan || 'trial');
  credits = computed(() => this.authService.currentUser()?.credits || 0);
  
  currentModule = this._currentModule.asReadonly();
  isLoading = this._loading.asReadonly();
  profile = this._profileData.asReadonly();
  events = this._events.asReadonly();
  tickets = this._tickets.asReadonly();
  transactions = this._transactions.asReadonly();
  announcement = this._announcement.asReadonly();
  topUpPackages = this._topUpPackages.asReadonly();

  totalRevenue = computed(() => this._transactions().reduce((acc, tx) => acc + tx.amount, 0));


  private handleFirestoreError(error: unknown, operation: FirestoreOp | string, path: string | null = null) {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      operation,
      path,
      userId: this.authService.currentUser()?.id,
      timestamp: new Date().toISOString()
    };
    console.error('[FIRESTORE ERROR]', JSON.stringify(errInfo));
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.toLowerCase().includes('permission')) {
      this.notificationService.error(`Lipsă permisiuni: ${operation} la ${path || 'resursă'}.`);
    } else {
      this.notificationService.error(`Eroare bază de date: ${msg}`);
    }
  }

  // AUTOMATION: Computed observable for pending alerts within the 24h window
  readyAlertsCount = computed(() => {
    return this.events().filter(e => e.whatsappAlert && !e.whatsappAlertSent && this.isWithinAlertWindow(e)).length;
  });

  readyAlerts = computed(() => {
    return this.events().filter(e => e.whatsappAlert && !e.whatsappAlertSent && this.isWithinAlertWindow(e));
  });

  // NATIVE BROWSER PUSH NOTIFICATION SYSTEM
  async requestNativeNotificationPermission() {
    if (!('Notification' in window)) {
      this.notificationService.warning('Browser-ul dumneavoastră nu suportă notificări native de sistem.');
      return;
    }
    
    if (Notification.permission === 'granted') {
      this.notificationService.success('Alertele native de sistem sunt deja activate.');
      return;
    }
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        this.notificationService.success('Alertele native de sistem au fost activate cu succes!');
      }
    }
  }

  sendNativeSystemAlert(event: CalendarEvent) {
     if ('Notification' in window && Notification.permission === 'granted') {
         const marker = event.clientName ? event.clientName : '';
         const n = new Notification(`JuristPRO: Termen Mâine - ${event.title}`, {
            body: `Dosar alocat clientului ${marker} la locația ${event.details || 'Nesupecificat'}. \nOra preconizată: ${event.time}`,
            icon: '/favicon.ico',
            requireInteraction: true
         });
         
         n.onclick = () => {
             window.focus();
             n.close();
         };
         return true;
     }
     return false;
  }

  ngOnDestroy() {
    if (this._announcementUnsub) {
      this._announcementUnsub();
    }
  }


  promoCodes = this._promoCodes.asReadonly();

  private _announcementUnsub: (() => void) | null = null;

  private _profileUnsub: (() => void) | null = null;
  private _ticketsUnsub: (() => void) | null = null;
  private _promoUnsub: (() => void) | null = null;
  private _eventsUnsub: (() => void) | null = null;
  private _automationInterval: ReturnType<typeof setInterval> | null = null;

  public stopAllListeners() {
    if (this._announcementUnsub) { this._announcementUnsub(); this._announcementUnsub = null; }
    if (this._profileUnsub) { this._profileUnsub(); this._profileUnsub = null; }
    if (this._ticketsUnsub) { this._ticketsUnsub(); this._ticketsUnsub = null; }
    if (this._promoUnsub) { this._promoUnsub(); this._promoUnsub = null; }
    if (this._eventsUnsub) { this._eventsUnsub(); this._eventsUnsub = null; }
    if (this._automationInterval) { clearInterval(this._automationInterval); this._automationInterval = null; }
  }

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
       return;
    }

    // 1. Listen for global announcements (Always active, public)
    this._announcementUnsub = onSnapshot(doc(db, 'system_settings', 'announcement'), (docSnap) => {
      if (docSnap.exists()) {
        this._announcement.set(docSnap.data() as SystemAnnouncement);
      }
    }, (error) => {
      console.warn('Silent warning: Public announcement access status:', error.message);
    });

    // 2. Main data sync effect (Reactive to auth state)
    effect((onCleanup) => {
      const user = this.authService.currentUser();
      const isAdmin = this.authService.isAdmin();
      const isRealUser = this.authService.isRealUser();
      const isDemo = this.authService.isDemo();

      if (!user) {
        this.clearData();
        return;
      }

      if (isDemo) {
        this.loadLocalData(user.id);
        if (isAdmin) {
          this._promoCodes.set([
            { id: 'DEMO1', code: 'PROMO1', credits: 15, maxUses: 100, usedBy: [], expiresAt: new Date(), active: true },
            { id: 'DEMO2', code: 'BYPASS', credits: 50, maxUses: 10, usedBy: [], expiresAt: new Date(), active: true }
          ]);
        }
        return;
      }

      if (isRealUser) {
        // Stop any previous listeners before starting new ones
        if (this._profileUnsub) this._profileUnsub();
        if (this._ticketsUnsub) this._ticketsUnsub();
        if (this._promoUnsub) this._promoUnsub();
        if (this._eventsUnsub) this._eventsUnsub();

        // Load Profile Data
        getDoc(doc(db, 'profiles', user.id)).then((snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data['cabinet_data']) {
              this._profileData.set(data['cabinet_data'] as CabinetProfile);
            }
          }
        }).catch(err => console.warn('Profile load error:', err.message));

        // Load Events (Snapshot with cleanup)
        const eventsQuery = query(collection(db, 'events'), where('user_id', '==', user.id));
        this._eventsUnsub = onSnapshot(eventsQuery, (snap) => {
          const events = snap.docs.map(doc => {
            const e = doc.data();
            return {
              id: doc.id,
              title: e['title'],
              clientName: e['client_name'],
              caseObject: e['case_object'],
              date: e['event_date'],
              time: e['event_time'],
              type: e['type'] as 'court' | 'deadline' | 'meeting',
              details: e['details'],
              notes: e['notes'],
              whatsappAlert: e['whatsapp_alert'],
              whatsappAlertSent: e['whatsapp_alert_sent'],
              financial: e['financial'] || { total: 0, paid: 0, rest: 0 }
            };
          });
          
          // Sort locally by date ascending
          events.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
          this._events.set(events);
        }, (err) => {
          console.error('Events listener error:', err);
          this.notificationService.error('Eroare la încărcarea dosarelor: ' + err.message);
        });

        // Load Tickets (Snapshot with cleanup)
        const ticketsQuery = isAdmin
          ? query(collection(db, 'tickets'))
          : query(collection(db, 'tickets'), where('user_id', '==', user.id));

        this._ticketsUnsub = onSnapshot(ticketsQuery, (snap) => {
          const tickets = snap.docs.map(doc => {
            const t = doc.data();
            return {
              id: doc.id,
              name: t['name'],
              email: t['email'],
              type: t['type'] as string,
              message: t['message'],
              date: new Date(t['created_at']),
              status: t['status'],
              adminResponse: t['admin_response']
            };
          });
          
          // Sort locally by date descending
          tickets.sort((a, b) => b.date.getTime() - a.date.getTime());
          this._tickets.set(tickets);
        }, (err) => console.warn('Tickets listener error:', err.message));

        // Load Promo Codes (Admin only, Snapshot with cleanup)
        if (isAdmin) {
          this._promoUnsub = onSnapshot(collection(db, 'promo_codes'), (snap) => {
            this._promoCodes.set(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PromoCode)));
          }, (err) => {
            console.error('Error listening to promo codes:', err.message);
          });
        } else {
          this._promoCodes.set([]);
        }

        // Cleanup all listeners when user changes or service destroyed
        onCleanup(() => {
          if (this._profileUnsub) this._profileUnsub();
          if (this._ticketsUnsub) this._ticketsUnsub();
          if (this._promoUnsub) this._promoUnsub();
          if (this._eventsUnsub) this._eventsUnsub();
        });

        // Load initial one-time data (Transactions)
        this.loadOneTimeData(user.id, isAdmin);
      }
    });
  }

  private async loadOneTimeData(userId: string, isAdmin: boolean) {
    try {
      // Transactions
      const txQuery = isAdmin
        ? query(collection(db, 'transactions'))
        : query(collection(db, 'transactions'), where('user_id', '==', userId));
      const txSnap = await getDocs(txQuery);
      if (!txSnap.empty) {
        const txs = txSnap.docs.map(doc => {
          const t = doc.data();
          return {
            id: doc.id,
            userId: t['user_id'],
            userName: t['user_name'] || 'User',
            amount: t['amount'],
            currency: t['currency'] || 'RON',
            type: t['type'],
            date: new Date(t['created_at']),
            status: t['status'],
            billingData: t['billing_data']
          };
        });
        
        // Sort locally by date descending
        txs.sort((a, b) => b.date.getTime() - a.date.getTime());
        this._transactions.set(txs);
      }
    } catch (err) {
      console.warn('Initial data load warning:', err);
    }
  }

  private clearData() {
    this._events.set([]);
    this._tickets.set([]);
    this._transactions.set([]);
    this._profileData.set({ name: '', lawyerName: '', barId: '', cif: '', address: '', phone: '', email: '' });
  }

  setModule(module: ModuleType) {
    console.log('DEBUG: setModule', module, new Error().stack);
    this._currentModule.set(module);
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }
  
  toggleLoading(loading: boolean) {
    this._loading.set(loading);
  }
  
  async updateAnnouncement(data: SystemAnnouncement) {
    this._announcement.set(data);
      try {
        const cleanData = { ...data };
        if (cleanData.actionText === undefined) delete cleanData.actionText;
        if (cleanData.discountCode === undefined) delete cleanData.discountCode;
        
        await setDoc(doc(db, 'system_settings', 'announcement'), cleanData);
      } catch (error) {
        this.handleFirestoreError(error, FirestoreOp.WRITE, 'system_settings/announcement');
      }
  }

  updateTopUpPackage(pack: { id: string, name: string, price: number, credits: number }) {
    this._topUpPackages.update(packages => 
      packages.map(p => p.id === pack.id ? { ...pack } : p)
    );
  }

  async createPromoCode(code: string, credits: number, maxUses: number) {
    try {
      await setDoc(doc(db, 'promo_codes', code.toUpperCase()), {
        code: code.toUpperCase(),
        credits,
        maxUses,
        usedBy: [],
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        active: true
      });
      return { success: true };
    } catch (error) {
      console.error("Error creating promo code:", error);
      return { success: false, error: "Eroare la crearea codului." };
    }
  }

  async deletePromoCode(id: string) {
    try {
      await deleteDoc(doc(db, 'promo_codes', id));
      return { success: true };
    } catch (error) {
      console.error("Error deleting promo code:", error);
      return { success: false, error: "Eroare la ștergerea codului." };
    }
  }

  async redeemPromoCode(code: string): Promise<{ success: boolean; message: string }> {
    const user = this.authService.currentUser();
    if (!user) return { success: false, message: "Trebuie să fiți autentificat." };

    try {
      const codeRef = doc(db, 'promo_codes', code.toUpperCase());
      const codeSnap = await getDoc(codeRef);

      if (!codeSnap.exists()) {
        return { success: false, message: "Codul promoțional nu există sau este invalid." };
      }

      const promoData = codeSnap.data() as PromoCode;

      if (!promoData.active) {
        return { success: false, message: "Acest cod promoțional a fost dezactivat." };
      }

      if (promoData.expiresAt) {
         let isExpired = false;
         if (typeof (promoData.expiresAt as unknown as { toDate?: () => Date }).toDate === 'function') {
            isExpired = (promoData.expiresAt as unknown as { toDate: () => Date }).toDate() < new Date();
         } else {
            isExpired = new Date(promoData.expiresAt) < new Date();
         }
         if (isExpired) {
            return { success: false, message: "Acest cod promoțional a expirat." };
         }
      }

      if (promoData.usedBy && promoData.usedBy.includes(user.id)) {
        return { success: false, message: "Ați folosit deja acest cod promoțional." };
      }

      if (promoData.maxUses > 0 && promoData.usedBy && promoData.usedBy.length >= promoData.maxUses) {
        return { success: false, message: "Acest cod promoțional a atins limita maximă de utilizări." };
      }

      // Add credits to user
      await this.authService.addCreditsToUser(user.id, promoData.credits);

      // Add user to usedBy
      const updatedUsedBy = [...(promoData.usedBy || []), user.id];
      await updateDoc(codeRef, { usedBy: updatedUsedBy });

      return { success: true, message: `Cod aplicat cu succes! Ați primit ${promoData.credits} credite.` };
    } catch (error) {
      console.error("Error redeeming promo code:", error);
      return { success: false, message: "A apărut o eroare la aplicarea codului." };
    }
  }

  private loadLocalData(userId: string) {
    const user = this.authService.currentUser();
    
    this._profileData.set({
      name: user?.fullName ? `Cabinet "${user.fullName}"` : 'Cabinet Avocat',
      lawyerName: user?.fullName || 'Av. Demo',
      barId: 'Baroul București',
      cif: '',
      address: '',
      phone: '0712 345 678',
      email: user?.email || 'demo@juristpro.ai'
    });

    this._events.set([
      { id: 'demo1', title: 'Audierea Martorilor - Popescu vs ANAF', clientName: 'Popescu Ion', caseObject: 'Contestație Fiscală', date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], time: '09:00', type: 'court', details: 'Curtea de Apel București', notes: 'Pregătire concluzii scrise', whatsappAlert: true, financial: { total: 5000, paid: 2500, rest: 2500 } },
      { id: 'demo2', title: 'Consultatie Draft Contract Vanzare', clientName: 'SC LEGAL SRL', caseObject: 'Consultanta Business', date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], time: '14:30', type: 'meeting', details: 'Zoom Meeting', notes: 'Revedere clauzele de penalizare', whatsappAlert: false, financial: { total: 1000, paid: 1000, rest: 0 } }
    ]);

    this._tickets.set([
      { id: 't1', name: 'Demo User', email: 'demo@juristpro.ai', type: 'Tehnic', message: 'Cum pot exporta calendarul?', date: new Date(), status: 'open' }
    ]);

    this._transactions.set([
      { id: 'tx1', userId: userId, userName: user?.fullName || 'Demo', amount: 90, currency: 'RON', type: 'subscription', date: new Date(), status: 'completed' }
    ]);
  }

  // --- CRUD ---

  async updateProfile(data: CabinetProfile, consents?: UserConsents) {
    const user = this.authService.currentUser();
    if (!user) return;

    this._profileData.set(data);
    if (consents) {
        this.authService.updateUserConsents(consents);
    }

    if (!this.authService.isDemo()) {
      try {
        const updates: Record<string, unknown> = { cabinet_data: data };
        if (consents) updates.consents = consents;
        await updateDoc(doc(db, 'profiles', user.id), updates);
      } catch (e) {
        this.handleFirestoreError(e, FirestoreOp.UPDATE, `profiles/${user.id}`);
      }
    }
  }

  async addEvent(event: CalendarEvent) {
    const user = this.authService.currentUser();
    if (!user) {
      this.notificationService.error("Eroare: Trebuie să fiți autentificat pentru a adăuga un dosar.");
      return;
    }

    if (this.authService.isDemo()) {
      const demoEvent = { ...event, id: 'local-' + Date.now() };
      this._events.update(e => [...e, demoEvent]);
      this.notificationService.success("Dosar local salvat (Mod Demo).");
      return;
    }

    try {
      const dbPayload = {
        user_id: user.id,
        title: event.title || '',
        client_name: event.clientName || '',
        case_object: event.caseObject || '',
        event_date: event.date || '',
        event_time: event.time || '09:00',
        type: event.type || 'court',
        details: event.details || '',
        notes: event.notes || '',
        whatsapp_alert: !!event.whatsappAlert,
        whatsapp_alert_sent: !!event.whatsappAlertSent,
        financial: event.financial || { total: 0, paid: 0, rest: 0 }
      };

      console.log('[FIRESTORE] Adăugare dosar:', dbPayload);
      const docRef = await addDoc(collection(db, 'events'), dbPayload);
      if (docRef.id) {
        this.notificationService.success("Dosarul a fost salvat cu succes în baza de date!");
      } else {
        throw new Error("ID-ul documentului generat este invalid.");
      }
    } catch (e) {
      this.handleFirestoreError(e, FirestoreOp.CREATE, 'events');
      throw e;
    }
  }

  async updateEvent(updatedEvent: CalendarEvent) {
    const user = this.authService.currentUser();
    if (!user) {
      this.notificationService.error("Eroare: Trebuie să fiți autentificat pentru a edita un dosar.");
      return;
    }

    this._events.update(events => events.map(e => e.id === updatedEvent.id ? updatedEvent : e));

    if (!this.authService.isDemo()) {
      try {
        const dbPayload = {
          title: updatedEvent.title || '',
          client_name: updatedEvent.clientName || '',
          case_object: updatedEvent.caseObject || '',
          event_date: updatedEvent.date || '',
          event_time: updatedEvent.time || '09:00',
          type: updatedEvent.type || 'court',
          details: updatedEvent.details || '',
          notes: updatedEvent.notes || '',
          whatsapp_alert: !!updatedEvent.whatsappAlert,
          whatsapp_alert_sent: !!updatedEvent.whatsappAlertSent,
          financial: updatedEvent.financial || { total: 0, paid: 0, rest: 0 }
        };

        const docRef = doc(db, 'events', updatedEvent.id);
        await updateDoc(docRef, dbPayload);
        this.notificationService.success("Dosarul a fost actualizat cu succes în baza de date!");
      } catch (e) {
        this.handleFirestoreError(e, FirestoreOp.UPDATE, `events/${updatedEvent.id}`);
        throw e;
      }
    } else {
      this.notificationService.info("Dosar local actualizat (Mod Demo).");
    }
  }

  async deleteEvent(eventId: string) {
    const user = this.authService.currentUser();
    if (!user) return;

    if (this.authService.isDemo()) {
      this._events.update(events => events.filter(e => e.id !== eventId));
      this.notificationService.info("Dosar local șters (Mod Demo).");
      return;
    }

    try {
      await deleteDoc(doc(db, 'events', eventId));
      this.notificationService.success("Dosarul a fost șters cu succes!");
    } catch (e) {
      this.handleFirestoreError(e, FirestoreOp.DELETE, `events/${eventId}`);
    }
  }

  getSanitizedPhone(phone: string): string {
    if (!phone) return '';
    let cleaned = phone.replace(/\D/g, ''); // keep only digits
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = '40' + cleaned.substring(1);
    } else if (cleaned.startsWith('7') && cleaned.length === 9) {
      cleaned = '40' + cleaned;
    }
    return cleaned;
  }

  sendWhatsAppAlert(event: CalendarEvent, automated = false) {
    // Constructing message with high-visibility markers
    const location = event.details || 'Nespecificat';
    const notes = event.notes || 'Fără note adiționale';
    
    const messageLines = [
      `🔔 *ALERTA JURISTPRO - REAMINTIRE 24H*`,
      ``,
      `⚖️ *DOSAR/SUBIECT:* ${event.title || 'Nespecificat'}`,
      `👤 *CLIENT:* ${event.clientName || 'Nespecificat'}`,
      `📅 *DATA:* ${event.date || '...'}`,
      `🕒 *ORA:* ${event.time || '...'}`,
      `📂 *OBIECT:* ${event.caseObject || 'Nespecificat'}`,
      `📍 *LOCAȚIE:* ${location}`,
      ``,
      `📝 *NOTE:* ${notes}`,
      ``,
      `_Mesaj automat generat de către JuristPRO AI_`
    ];

    const message = encodeURIComponent(messageLines.join('\n'));
    const phoneNum = this.profile().phone || '';
    const cleanPhone = this.getSanitizedPhone(phoneNum);

    if (!automated) {
      const url = cleanPhone 
        ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${message}`
        : `https://api.whatsapp.com/send?text=${message}`;

      console.log('[WHATSAPP] Opening Link:', url);
      const win = window.open(url, '_blank');
      if (!win) {
         console.warn('[WHATSAPP] Popup blocked, falling back to window.location.href');
         this.notificationService.warning('Pop-up blocat de browser. Despachetăm și transferăm pe WhatsApp...');
         setTimeout(() => {
            window.location.href = url;
         }, 1500);
      }
    }
  }

  /**
   * Identifies events that are in the 24h window for notification (Upcoming terms)
   */
  isWithinAlertWindow(event: CalendarEvent): boolean {
    if (!event.date || !event.time || !event.whatsappAlert) return false;
    
    try {
      const dateParts = event.date.split('-');
      if (dateParts.length !== 3) return false;
      
      const checkDate = new Date(
        parseInt(dateParts[0], 10),
        parseInt(dateParts[1], 10) - 1,
        parseInt(dateParts[2], 10)
      );
      checkDate.setHours(0,0,0,0);

      const today = new Date();
      today.setHours(0,0,0,0);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0,0,0,0);

      const isToday = checkDate.getTime() === today.getTime();
      const isTomorrow = checkDate.getTime() === tomorrow.getTime();

      return isToday || isTomorrow;
    } catch (e) {
      console.error('Data error for event:', event.id, e);
      return false;
    }
  }

  async submitTicket(ticket: Omit<SupportTicket, 'id' | 'date' | 'status'>) {
    const user = this.authService.currentUser();
    
    if (user && !this.authService.isDemo()) {
       try {
         const docRef = await addDoc(collection(db, 'tickets'), {
           user_id: user.id,
           name: ticket.name,
           email: ticket.email,
           type: ticket.type,
           message: ticket.message,
           status: 'open',
           created_at: new Date().toISOString()
         });
         
         if (docRef.id) {
            const newTicket: SupportTicket = { ...ticket, id: docRef.id, userId: user.id, date: new Date(), status: 'open' };
            this._tickets.update(t => [newTicket, ...t]);
         }
       } catch (e) {
         this.handleFirestoreError(e, FirestoreOp.CREATE, 'tickets');
       }
    } else {
       const newTicket: SupportTicket = { ...ticket, id: 'local-'+Date.now(), userId: user?.id, date: new Date(), status: 'open' };
       this._tickets.update(t => [newTicket, ...t]);
    }
  }

  async resolveTicket(id: string, response: string) {
    // Update local state
    this._tickets.update(tickets => tickets.map(t => t.id === id ? { ...t, status: 'resolved', adminResponse: response } : t));
    
    // Update Firestore
    try {
      await updateDoc(doc(db, 'tickets', id), {
        status: 'resolved',
        admin_response: response,
        resolved_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating ticket in Firestore:', error);
    }
  }

  async recordTransaction(amount: number, type: 'subscription' | 'top-up') {
    const user = this.authService.currentUser();
    if (!user) return;

    const tx: FinancialTransaction = {
      id: 'tx-' + Date.now(),
      userId: user.id,
      userName: user.fullName,
      amount: amount,
      currency: 'RON',
      type: type,
      date: new Date(),
      status: 'completed'
    };
    this._transactions.update(t => [tx, ...t]);

    if (!this.authService.isDemo()) {
       await addDoc(collection(db, 'transactions'), {
        user_id: user.id,
        user_name: user.fullName,
        amount: amount,
        currency: 'RON',
        type: type,
        status: 'completed',
        created_at: new Date().toISOString()
      });
    }
  }

  // --- SUB/CREDITS ---

  async upgradePlan(newPlan: PlanType) {
    const user = this.authService.currentUser();
    if (!user) return;

    this._loading.set(true);
    
    if (newPlan === 'trial') {
      if (!this.authService.isDemo()) {
        await updateDoc(doc(db, 'profiles', user.id), { plan: 'trial', status: 'active' });
      }
      console.log('Planul Trial a fost activat.');
      this._loading.set(false);
      return;
    }

    // If user already has an active paid subscription, redirect to portal to manage it
    if (user.status === 'active' && user.plan !== 'trial') {
      this.cancelSubscription(); // This opens the portal
      this._loading.set(false);
      return;
    }

    // Deschidem fereastra inainte de request pentru a evita blocarea de catre browser (popup blocker)
    const newWindow = window.open('', '_blank');

    try {
      const response = await fetch('/api/create-revolut-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'subscription',
          plan: newPlan,
          userId: user.id,
          email: user.email
        })
      });
      
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        if (newWindow) newWindow.close();
        console.error('Server returned non-JSON response:', responseText);
        const parseErrorMsg = `Eroare de la server (${response.status}). Vă rugăm contactați suportul.`;
        this.notificationService.error(parseErrorMsg);
        this._loading.set(false);
        return { error: parseErrorMsg };
      }

      if (!response.ok) {
        if (newWindow) newWindow.close();
        const serverErrorMsg = data.error || `Server status: ${response.status}`;
        this.notificationService.error(serverErrorMsg);
        this._loading.set(false);
        return { error: serverErrorMsg };
      }

      if (data.url) {
        if (newWindow) {
          newWindow.location.href = data.url;
        } else {
          window.location.href = data.url;
        }
      } else {
        if (newWindow) newWindow.close();
        const errorMsg = data.error || 'Eroare la inițializarea plății';
        this.notificationService.error(errorMsg);
        this._loading.set(false);
        return { error: errorMsg };
      }
    } catch (error: unknown) {
      if (newWindow) newWindow.close();
      const err = error as { message?: string };
      console.error('Payment error:', err);
      const errMsg = err.message || 'Eroare de conexiune la serverul de plăți.';
      this.notificationService.error(errMsg);
      this._loading.set(false);
      return { error: errMsg };
    }
    this._loading.set(false);
  }

  async cancelSubscription() {
    const user = this.authService.currentUser();
    if (!user) return false;

    this._loading.set(true);
    try {
      if (!this.authService.isDemo()) {
         await updateDoc(doc(db, 'profiles', user.id), { status: 'cancelled' });
      }
      this.notificationService.success('Abonamentul a fost anulat cu succes.');
      return true;
    } catch (error) {
      console.error('Cancellation error:', error);
      this.notificationService.error('Eroare la anularea abonamentului.');
      return false;
    } finally {
      this._loading.set(false);
    }
  }

  async sendTestWhatsApp(phone: string): Promise<{ success: boolean; message: string; error?: string }> {
    this._loading.set(true);
    try {
      const response = await fetch('/api/test-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        this.notificationService.success(data.message || 'Mesaj de test trimis cu succes!');
        return { success: true, message: data.message || 'Mesaj de test trimis cu succes!' };
      } else {
        const errorMsg = data.error || 'Trimiterea testului a eșuat.';
        this.notificationService.error(errorMsg);
        return { success: false, message: errorMsg, error: errorMsg };
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      const errMsg = err.message || 'Eroare de conexiune la server pentru testul WhatsApp.';
      console.error('WhatsApp test error:', error);
      this.notificationService.error(errMsg);
      return { success: false, message: errMsg, error: errMsg };
    } finally {
      this._loading.set(false);
    }
  }

  async purchaseTopUp(amount: number) {
    const user = this.authService.currentUser();
    if (!user) return;

    // Find the package to get the credits amount
    const pkg = this.topUpPackages().find(p => p.price === amount);
    if (!pkg) return;

    this._loading.set(true);
    const newWindow = window.open('', '_blank');

    try {
      const response = await fetch('/api/create-revolut-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'topup',
          amount: amount,
          credits: pkg.credits,
          userId: user.id,
          email: user.email
        })
      });
      
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        if (newWindow) newWindow.close();
        console.error('Server returned non-JSON response:', responseText);
        const parseErrorMsg = `Eroare de la server (${response.status}). Vă rugăm contactați suportul.`;
        this._loading.set(false);
        return { error: parseErrorMsg };
      }

      if (!response.ok) {
        if (newWindow) newWindow.close();
        const serverErrorMsg = data.error || `Server status: ${response.status}`;
        this._loading.set(false);
        return { error: serverErrorMsg };
      }

      if (data.url) {
        if (newWindow) {
          newWindow.location.href = data.url;
        } else {
          window.location.href = data.url;
        }
      } else {
        if (newWindow) newWindow.close();
        const errorMsg = data.error || 'Eroare la inițializarea plății';
        this._loading.set(false);
        return { error: errorMsg };
      }
    } catch (error: unknown) {
      if (newWindow) newWindow.close();
      const err = error as { message?: string };
      console.error('Payment error:', err);
      const errMsg = err.message || 'Eroare de conexiune la serverul de plăți.';
      this._loading.set(false);
      return { error: errMsg };
    }
    this._loading.set(false);
  }

  private checkCredits(requiredAmount = 1): boolean {
    // Administratorul are acces nelimitat
    if (this.authService.isAdmin()) return true;
    
    if (this.credits() < requiredAmount) {
      console.warn(`Fonduri insuficiente! Necesită ${requiredAmount} credite.`);
      this.setModule('pricing');
      return false;
    }
    return true;
  }

  private async consumeCredit(amount = 1) {
    if (this.authService.isAdmin()) return; // Administratorul nu consumă credite
    
    const user = this.authService.currentUser();
    if (user) {
       const newBalance = Math.max(0, user.credits - amount);
       this.authService.updateUserCredits(newBalance);
       if (!this.authService.isDemo()) {
         await updateDoc(doc(db, 'profiles', user.id), { credits: newBalance });
       }
    }
  }
  
  // --- UTILS ---
  
  downloadDocx(contentHtml: string, titlePrompt: string) {
    const safeName = titlePrompt.trim().replace(/[^a-zA-Z0-9_ăâîșțĂÂÎȘȚ\- ]/g, '').split(' ').slice(0, 6).join('_');
    const filename = `JuristPRO_${safeName || 'Document'}.doc`;
    const cleanBody = contentHtml.replace(/\n/g, '<br/>').replace(/text-white/g, '').replace(/text-gray-\d+/g, '').replace(/bg-[\w-]+/g, ''); 

    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>${safeName}</title></head><body>`;
    const sourceHTML = header + cleanBody + "</body></html>";
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = filename;
    fileDownload.click();
    document.body.removeChild(fileDownload);
  }

  // --- AI FEATURES WITH SAFEGUARDS ---
  
  /**
   * Apel universal către Gemini 3 Flash.
   * Optimizat pentru latență minimă și stabilitate maximă.
   */
  private async _callAi(
    parameters: AiCallParameters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<AsyncIterable<any>> {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parameters)
    });

    if (!response.ok) {
      if (response.status === 413) {
        throw new Error('Fișierul este prea mare pentru a fi procesat de serverul AI. Vă rugăm să folosiți un document mai mic.');
      }
      if (response.status === 504 || response.status === 408) {
        throw new Error('Timpul de răspuns al serverului AI a expirat (Timeout). Vă rugăm să încercați cu un document cu mai puține pagini.');
      }
      if (response.status === 429) {
        throw new Error('S-a atins limita de solicitări concomitente. Vă rugăm să așteptați câteva momente și să reîncercați.');
      }
      if (response.status === 502 || response.status === 503) {
        throw new Error('Serviciul AI este temporar indisponibil datorită unei încărcări mari de solicitări. Reîncercați în câteva secunde.');
      }
      
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || `Eroare server la procesare (Cod status: ${response.status})`);
    }

    if (!response.body) {
      throw new Error('Răspuns gol de la serverul AI');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    const stream = {
      async *[Symbol.asyncIterator]() {
        let buffer = '';
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed) {
                try {
                  const parsed = JSON.parse(trimmed);
                  if (parsed && typeof parsed === 'object') {
                    if (parsed.error) {
                      throw new Error(parsed.error);
                    }
                    // Enrich with text property if missing for easy client consumption
                    if (!parsed.text) {
                      const textVal = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                      if (textVal) {
                        parsed.text = textVal;
                      }
                    }
                  }
                  yield parsed;
                } catch (err) {
                  // Propagate correct Error if thrown inside try
                  if (err instanceof Error && (err.message || '').trim() !== '') {
                    throw err;
                  }
                  console.warn('Eroare parsing JSON-Line:', err, trimmed);
                }
              }
            }
          }
          if (buffer.trim()) {
            try {
              const parsed = JSON.parse(buffer.trim());
              if (parsed && typeof parsed === 'object') {
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
                if (!parsed.text) {
                  const textVal = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (textVal) {
                    parsed.text = textVal;
                  }
                }
              }
              yield parsed;
            } catch (err) {
              if (err instanceof Error) {
                throw err;
              }
              // ignore general parse errors during buffer cleanup
            }
          }
        } finally {
          reader.releaseLock();
        }
      }
    };

    return stream;
  }

  private _handleAiError(e: unknown): never {
    console.error('Core AI Error:', e);
    const msg = (e as { message?: string })?.message || '';
    
    if (msg.includes('AI_TIMEOUT')) {
      throw new Error('Serverul AI răspunde greu momentan. Vă rugăm să reîncercați în câteva secunde.', { cause: e });
    }
    if (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand') || msg.includes('overloaded')) {
      throw new Error('Sistemul AI este momentan suprasolicitat din cauza cererii ridicate (Eroare 503). Vă rugăm să așteptați câteva momente și să reîncercați. Nu vi s-au reținut credite.', { cause: e });
    }
    if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid') || msg.includes('API key is invalid') || msg.includes('API key has expired') || (msg.includes('key') && msg.includes('invalid'))) {
      throw new Error('Cheie API invalidă sau expirată.', { cause: e });
    }
    
    // Fallback to a cleaner error message instead of raw JSON
    const cleanMsg = msg.length > 100 ? msg.substring(0, 100) + '...' : msg;
    throw new Error(`Asistentul este momentan indisponibil (${cleanMsg || 'Eroare conexiune'}). Reîncercați în câteva momente.`, { cause: e });
  }

  private async _streamAiResponse(
    parameters: AiCallParameters,
    requiredCredits: number,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    if (!this.checkCredits(requiredCredits)) {
      throw new Error("Fonduri insuficiente.");
    }
    
    this._loading.set(true);
    let fullText = "";
    
    try {
      const result = await this._callAi(parameters);

      for await (const chunk of result as AsyncIterable<{ text: string; candidates?: unknown[] }>) {
        const text = chunk.text;
        if (text) {
          fullText += text;
          if (onChunk) onChunk(fullText);
        }
      }
      
      await this.consumeCredit(requiredCredits);
      return fullText || "";
    } catch(e: unknown) { 
      // If we already have a significant response, we return it despite the error (e.g. partial timeout)
      if (fullText.length > 50) return fullText;
      this._handleAiError(e);
    } finally {
      this._loading.set(false);
    }
  }

  async chatWithAssistant(prompt: string, onChunk?: (chunk: string) => void): Promise<ChatMessage> {
    if (!this.checkCredits(3)) {
      throw new Error("Fonduri insuficiente.");
    }
    
    this._loading.set(true);
    let fullText = "";
    const sources: ChatSource[] = [];
    
    try {
      const result = await this._callAi({
        systemInstruction: LEGAL_GUARDRAILS,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      interface AiChunk { 
        text: string; 
        candidates?: { groundingMetadata?: { groundingChunks?: unknown[] } }[];
      }

      for await (const chunk of result as AsyncIterable<AiChunk>) {
        const text = chunk.text;
        if (text) {
          fullText += text;
          if (onChunk) onChunk(fullText);
        }

        const metadata = chunk.candidates?.[0]?.groundingMetadata;
        if (metadata?.groundingChunks) {
          const chunks = metadata.groundingChunks as { web?: { uri?: string; title?: string } }[];
          chunks.forEach(c => {
            const uri = c.web?.uri;
            if (uri && !sources.some(s => s.url === uri)) {
              sources.push({ title: c.web?.title || 'Sursă Google', url: uri });
            }
          });
        }
      }
      
      await this.consumeCredit(3); 
      return { role: 'ai', content: fullText || "...", timestamp: new Date(), sources };
    } catch(e: unknown) { 
      this._handleAiError(e);
    } finally {
      this._loading.set(false);
    }
  }

  async generateStrategy(caseDetails: string, onChunk?: (chunk: string) => void): Promise<string> {
    return this._streamAiResponse({
      systemInstruction: LEGAL_GUARDRAILS,
      contents: [{ role: 'user', parts: [{ text: `Analizează speța: ${caseDetails}. Oferă o strategie juridică exhaustivă (Rezumat, Încadrare, Opțiuni, Riscuri, Probatoriu, Recomandări).` }] }]
    }, 5, onChunk);
  }

  private _base64ToUtf8(str: string): string {
    try {
      if (typeof window !== 'undefined' && typeof window.atob === 'function') {
        return decodeURIComponent(escape(window.atob(str)));
      }
      return Buffer.from(str, 'base64').toString('utf-8');
    } catch {
      try {
        if (typeof window !== 'undefined' && typeof window.atob === 'function') {
          return window.atob(str);
        }
        return Buffer.from(str, 'base64').toString('binary');
      } catch {
        return str;
      }
    }
  }

  async analyzeEvidence(fileBase64: string, mimeType: string, prompt: string, onChunk?: (chunk: string) => void): Promise<string> {
    if (mimeType === 'text/plain') {
      const decodedText = this._base64ToUtf8(fileBase64);
      const userPrompt = prompt ? `Audit juridic solicitat: ${prompt}` : 'Efectuează o analiză juridică completă și detaliată a documentului furnizat de mai sus.';
      return this._streamAiResponse({
        systemInstruction: LEGAL_GUARDRAILS,
        contents: [{
          role: 'user',
          parts: [
            { text: `Document text de analizat:\n\n${decodedText}\n\n` },
            { text: userPrompt }
          ]
        }]
      }, 5, onChunk);
    }

    return this._streamAiResponse({
      systemInstruction: LEGAL_GUARDRAILS,
      contents: [{ role: 'user', parts: [{ inlineData: { mimeType, data: fileBase64 } }, { text: `Audit juridic: ${prompt}` }] }]
    }, 5, onChunk);
  }

  async generateEvidenceImage(prompt: string): Promise<string> {
    if (!this.checkCredits(5)) throw new Error("Fonduri insuficiente.");
    this._loading.set(true);
    try {
      await this.consumeCredit(5);
      console.log('Solicitare imagine pentru:', prompt);
      return "https://picsum.photos/seed/legal/800/600";
    } finally {
      this._loading.set(false);
    }
  }

  async draftDocument(type: string, details: string, onChunk?: (chunk: string) => void): Promise<string> {
    return this._streamAiResponse({
      systemInstruction: LEGAL_GUARDRAILS,
      contents: [{ role: 'user', parts: [{ text: `Redactează profesional: ${type}. Detalii: ${details}. Fără Markdown, limbaj formal instanță.` }] }]
    }, 3, onChunk);
  }

  async calculateFees(context: string, onChunk?: (chunk: string) => void): Promise<string> {
    return this._streamAiResponse({
      systemInstruction: LEGAL_GUARDRAILS,
      contents: [{ role: 'user', parts: [{ text: `Calculează taxe/onorarii (OUG 80/2013): ${context}` }] }]
    }, 2, onChunk);
  }

  async deleteTransaction(txId: string) {
    try {
      await deleteDoc(doc(db, 'transactions', txId));
      return { error: null };
    } catch (error: unknown) {
      console.error("Error deleting transaction:", error);
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }
}