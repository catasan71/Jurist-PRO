import { Injectable, signal, computed, inject, effect, OnDestroy } from '@angular/core';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';
import { AuthService, UserConsents, FirestoreOp } from './auth.service';
import { db } from '../app/firebase';
import { doc, getDoc, updateDoc, setDoc, collection, getDocs, addDoc, query, where, orderBy, onSnapshot, deleteDoc } from 'firebase/firestore';
import { environment } from '../environments/environment';
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

REGULI ABSOLUTE DE REDACTARE (SANCȚIUNEA ESTE RESPINGEREA RĂSPUNSULUI):

1. EXHAUSTIVITATE TOTALĂ ȘI PROFUNZIME ACADEMICĂ: Este STRICT INTERZIS să oferi răspunsuri scurte, rezumate sau simplificate. Oferă răspunsuri extrem de elaborate, de dimensiunile unui tratat sau articol științific complex. Orice argument trebuie dezvoltat pe zeci de rânduri, analizând excepții, interpretări doctrinare și nuanțe practice. Vrem cantitate maximă și calitate academică supremă. Răspunsul tău trebuie să taie respirația oricărui avocat prin complexitatea și detaliul său.
2. FĂRĂ EVAZIUNE: Răspunde direct și hiper-tehnic la absolut orice întrebare despre legea română. Disecă fiecare problemă (infracțiuni, litigii civile, divorț, despăgubiri) până la nivel de paragraf și literă din lege, elemente constitutive, condiții de formă/fond, proceduri, termene, strategii, excepții procesuale și probatoriu.
3. STRUCTURA OBLIGATORIE A UNUI RĂSPUNS:
   (a) PREMISA ȘI SITUAȚIA DE FAPT (analiză detaliată)
   (b) CADRUL LEGAL APLICABIL EXHAUSTIV (citarea și interpretarea pe larg a tuturor articolelor incidente din Coduri și legi speciale)
   (c) ANALIZA DOCTRINARĂ (controverse, opinii majoritare/minoritare)
   (d) JURISPRUDENȚĂ ȘI PRACTICĂ JUDICIARĂ (decizii CCR, RIL-uri, HP-uri ICCJ, CEDO)
   (e) ANALIZA RISCURILOR ȘI EXCEPȚIILOR (prescripție, decăderi, nulități)
   (f) OPINIE EXPERT ȘI RECOMANDĂRI PRIVIND STRATEGIA (pași procedurali concreți)
   (g) CONCLUZIE TEORETICĂ ȘI PRACTICĂ.
4. CITĂRI EXACTE: Asigură-te că citezi textele legale exacte, numărul deciziilor, articole din NCPC/NCPP/NCC/NCP. Evită generalitățile.
5. TIMP REAL: Caută mereu cea mai recentă legislație (2024-2025) folosind integrarea web. Nu inventa decizii.
6. LUNGIME: Răspunde extrem de lung! Detaliază fiecare aspect. Nu omite absolut nimic. Fii prolix, enciclopedic.
7. SEMNĂTURĂ: Întotdeauna încheie răspunsul EXACT cu textul: "**Semnat,\nJuristPRO AI**" (fără alte titluri de profesor sau judecător, fii modest).

Oferă excelență sau nimic. Te adresezi unor avocați de top care au nevoie de analize de 10-15 pagini, nu de rezumate.`;

// Safety settings - Force BLOCK_NONE to prevent evasive behavior on legal topics
const LEGAL_SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
];

@Injectable({
  providedIn: 'root'
})
export class JuristService implements OnDestroy {
  authService = inject(AuthService);
  notificationService = inject(NotificationService);

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

  private _aiInstance: GoogleGenAI | null = null;

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
    return this.events().filter(e => e.whatsappAlert && this.isWithinAlertWindow(e)).length;
  });

  readyAlerts = computed(() => {
    return this.events().filter(e => e.whatsappAlert && this.isWithinAlertWindow(e));
  });

  ngOnDestroy() {
    if (this._announcementUnsub) {
      this._announcementUnsub();
    }
  }

  private async getAiInstance(): Promise<GoogleGenAI> {
    if (this._aiInstance) return this._aiInstance;
    
    const apiKey = typeof GEMINI_API_KEY !== 'undefined' ? GEMINI_API_KEY : (environment as { geminiApiKey?: string }).geminiApiKey;
    
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey === '') {
      const msg = 'Cheia API Gemini nu este configurată. Administratorul platformei trebuie să regenereze cheia API.';
      this.notificationService.error(msg);
      throw new Error(msg);
    }
    
    try {
      this._aiInstance = new GoogleGenAI({ apiKey });
      return this._aiInstance;
    } catch (error) {
      this.notificationService.error('Eroare la inițializarea motorului AI.');
      throw error;
    }
  }
  
  promoCodes = this._promoCodes.asReadonly();

  private _announcementUnsub: (() => void) | null = null;
  private _profileUnsub: (() => void) | null = null;
  private _ticketsUnsub: (() => void) | null = null;
  private _promoUnsub: (() => void) | null = null;

  public stopAllListeners() {
    if (this._announcementUnsub) { this._announcementUnsub(); this._announcementUnsub = null; }
    if (this._profileUnsub) { this._profileUnsub(); this._profileUnsub = null; }
    if (this._ticketsUnsub) { this._ticketsUnsub(); this._ticketsUnsub = null; }
    if (this._promoUnsub) { this._promoUnsub(); this._promoUnsub = null; }
  }

  constructor() {
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

        // Load Profile Data (One-time or Snapshot)
        this._profileUnsub = onSnapshot(doc(db, 'profiles', user.id), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data['cabinet_data']) {
              this._profileData.set(data['cabinet_data'] as CabinetProfile);
            }
          }
        });

        // Load Tickets (Snapshot with cleanup)
        const ticketsQuery = isAdmin
          ? query(collection(db, 'tickets'), orderBy('created_at', 'desc'))
          : query(collection(db, 'tickets'), where('user_id', '==', user.id), orderBy('created_at', 'desc'));

        this._ticketsUnsub = onSnapshot(ticketsQuery, (snap) => {
          this._tickets.set(snap.docs.map(doc => {
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
          }));
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
        });

        // Load initial one-time data (Events, Transactions)
        this.loadOneTimeData(user.id, isAdmin);
      }
    });
  }

  private async loadOneTimeData(userId: string, isAdmin: boolean) {
    try {
      // Events
      const eventsQuery = query(collection(db, 'events'), where('user_id', '==', userId), orderBy('event_date', 'asc'));
      const eventsSnap = await getDocs(eventsQuery);
      if (!eventsSnap.empty) {
        this._events.set(eventsSnap.docs.map(doc => {
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
            financial: e['financial'] || { total: 0, paid: 0, rest: 0 }
          };
        }));
      }

      // Transactions
      const txQuery = isAdmin
        ? query(collection(db, 'transactions'), orderBy('created_at', 'desc'))
        : query(collection(db, 'transactions'), where('user_id', '==', userId), orderBy('created_at', 'desc'));
      const txSnap = await getDocs(txQuery);
      if (!txSnap.empty) {
        this._transactions.set(txSnap.docs.map(doc => {
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
        }));
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
    this._currentModule.set(module);
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
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
    if (!user) return;

    if (this.authService.isDemo()) {
      const demoEvent = { ...event, id: 'local-' + Date.now() };
      this._events.update(e => [...e, demoEvent]);
      return;
    }

    try {
      const dbPayload = {
        user_id: user.id,
        title: event.title,
        client_name: event.clientName,
        case_object: event.caseObject,
        event_date: event.date,
        event_time: event.time,
        type: event.type,
        details: event.details,
        notes: event.notes,
        whatsapp_alert: event.whatsappAlert,
        financial: event.financial
      };

      const docRef = await addDoc(collection(db, 'events'), dbPayload);
      if (docRef.id) {
        const newEvent = { ...event, id: docRef.id };
        this._events.update(e => [...e, newEvent]);
      }
    } catch (e) {
      this.handleFirestoreError(e, FirestoreOp.CREATE, 'events');
    }
  }

  async updateEvent(updatedEvent: CalendarEvent) {
    const user = this.authService.currentUser();
    if (!user) return;

    this._events.update(events => events.map(e => e.id === updatedEvent.id ? updatedEvent : e));

    if (!this.authService.isDemo()) {
      const dbPayload = {
        title: updatedEvent.title,
        client_name: updatedEvent.clientName,
        case_object: updatedEvent.caseObject,
        event_date: updatedEvent.date,
        event_time: updatedEvent.time,
        type: updatedEvent.type,
        details: updatedEvent.details,
        notes: updatedEvent.notes,
        whatsapp_alert: updatedEvent.whatsappAlert,
        financial: updatedEvent.financial
      };
      await updateDoc(doc(db, 'events', updatedEvent.id), dbPayload);
    }
  }

  sendWhatsAppAlert(event: CalendarEvent) {
    const phone = this.profile().phone;
    if (!phone) {
      this.notificationService.warning('Vă rugăm să configurați numărul de telefon în profil pentru a trimite alerte.');
      return;
    }

    // Clean phone number (keep only digits)
    let cleanPhone = phone.replace(/\D/g, '');
    
    // Ensure it starts with 40 (Romania)
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '40' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('7') && cleanPhone.length === 9) {
      cleanPhone = '40' + cleanPhone;
    }

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
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${message}`;
    window.open(url, '_blank');
  }

  /**
   * Identifies events that are in the 24h window for notification (Upcoming terms)
   */
  isWithinAlertWindow(event: CalendarEvent): boolean {
    if (!event.date || !event.time || !event.whatsappAlert) return false;
    
    try {
      // LOGIC: Check if event is exactly tomorrow (approx 24h away)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0,0,0,0);
      
      const checkDate = new Date(event.date);
      checkDate.setHours(0,0,0,0);

      // Return true only if it is exactly tomorrow
      return checkDate.getTime() === tomorrow.getTime();
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
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'subscription',
          plan: newPlan,
          userId: user.id,
          email: user.email
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server status: ${response.status}`);
      }

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        if (newWindow) newWindow.close();
        console.error('Server returned non-JSON response:', responseText);
        this.notificationService.error('Eroare de la server. Vă rugăm contactați suportul.');
        this._loading.set(false);
        return { error: 'Eroare de la server. Vă rugăm contactați suportul.' };
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
      this.notificationService.error('Eroare de conexiune la serverul de plăți.');
      this._loading.set(false);
      return { error: 'Eroare de conexiune la serverul de plăți' };
    }
    this._loading.set(false);
  }

  async cancelSubscription() {
    const user = this.authService.currentUser();
    if (!user) return false;

    this._loading.set(true);
    const newWindow = window.open('', '_blank');

    try {
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await response.json();
      if (data.url) {
        if (newWindow) {
           newWindow.location.href = data.url;
        } else {
           window.location.href = data.url;
        }
        return true;
      } else {
        if (newWindow) newWindow.close();
        // Fallback to local cancellation if no Stripe customer ID exists
        if (!this.authService.isDemo()) {
           await updateDoc(doc(db, 'profiles', user.id), { status: 'cancelled' });
        }
        return true;
      }
    } catch (error) {
      if (newWindow) newWindow.close();
      console.error('Portal error:', error);
      return false;
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
      const response = await fetch('/api/create-checkout-session', {
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
        this._loading.set(false);
        return { error: 'Eroare de la server. Vă rugăm contactați suportul.' };
      }

      if (data.url) {
        if (newWindow) {
           newWindow.location.href = data.url;
        } else {
           window.location.href = data.url;
        }
      } else {
        if (newWindow) newWindow.close();
        console.error('Eroare la inițializarea plății: ' + (data.error || 'Unknown error'));
        this._loading.set(false);
        return { error: data.error || 'Eroare la inițializarea plății' };
      }
    } catch (error) {
      if (newWindow) newWindow.close();
      console.error('Payment error:', error);
      this._loading.set(false);
      return { error: 'Eroare de conexiune la serverul de plăți' };
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
    const ai = await this.getAiInstance();
    const timeoutMs = parameters.timeoutMs || 90000;
    
    try {
      return await this._executeWithTimeout(ai, parameters, timeoutMs);
    } catch (e: unknown) {
      return this._handleAiError(e);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async _executeWithTimeout(ai: GoogleGenAI, parameters: AiCallParameters, timeoutMs: number): Promise<AsyncIterable<any>> {
    const responsePromise = ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: parameters.contents,
      config: {
        systemInstruction: parameters.systemInstruction,
        temperature: 0.3,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 8192,
        tools: parameters.tools,
        safetySettings: LEGAL_SAFETY_SETTINGS
      }
    });
    
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('AI_TIMEOUT')), timeoutMs)
    );
    
    return await Promise.race([responsePromise, timeoutPromise]);
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
    if (msg.includes('key')) {
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
      const errorMsg = (e as Error)?.message || 'Eroare necunoscută';
      this.notificationService.error(errorMsg);
      throw e;
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
        tools: [{ googleSearch: {} }]
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
      const errorMsg = (e as Error)?.message || 'Eroare necunoscută';
      this.notificationService.error(errorMsg);
      throw e;
    } finally {
      this._loading.set(false);
    }
  }

  async generateStrategy(caseDetails: string, onChunk?: (chunk: string) => void): Promise<string> {
    return this._streamAiResponse({
      systemInstruction: LEGAL_GUARDRAILS,
      contents: [{ role: 'user', parts: [{ text: `Analizează speța: ${caseDetails}. Oferă o strategie juridică exhaustivă (Rezumat, Încadrare, Opțiuni, Riscuri, Probatoriu, Recomandări).` }] }],
      tools: [{ googleSearch: {} }]
    }, 5, onChunk);
  }

  async analyzeEvidence(fileBase64: string, mimeType: string, prompt: string, onChunk?: (chunk: string) => void): Promise<string> {
    return this._streamAiResponse({
      systemInstruction: LEGAL_GUARDRAILS,
      contents: [{ role: 'user', parts: [{ inlineData: { mimeType, data: fileBase64 } }, { text: `Audit juridic: ${prompt}` }] }],
      tools: [{ googleSearch: {} }]
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
      contents: [{ role: 'user', parts: [{ text: `Redactează profesional: ${type}. Detalii: ${details}. Fără Markdown, limbaj formal instanță.` }] }],
      tools: [{ googleSearch: {} }]
    }, 3, onChunk);
  }

  async calculateFees(context: string, onChunk?: (chunk: string) => void): Promise<string> {
    return this._streamAiResponse({
      systemInstruction: LEGAL_GUARDRAILS,
      contents: [{ role: 'user', parts: [{ text: `Calculează taxe/onorarii (OUG 80/2013): ${context}` }] }],
      tools: [{ googleSearch: {} }]
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