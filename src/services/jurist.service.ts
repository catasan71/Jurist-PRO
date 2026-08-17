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
}// --- STRICT LEGAL SYSTEM PROMPT ---
export const getLegalGuardrails = (moduleName: 'chat' | 'strategy' | 'audit' | 'drafting' | 'fees' = 'chat') => {
  if (moduleName === 'drafting') {
    return `Ești un Partener Senior într-o casă de avocatură de prim rang din București, specializat în redactarea actelor de procedură judiciară de înaltă ținută academică și forță probatorie.
Redactează un pachet juridic COMPLET, IMPECABIL, EXTREM DE RIGUROS ȘI DETALIAT, divizat OBLIGATORIU în două secțiuni clar delimitate:

===ACT_PROCEDURAL===
Redactează EXCLUSIV actul procedural / cererea de chemare în judecată / întâmpinarea / contractul, FĂRĂ niciun fel de introducere conversațională ("Stimate domnule avocat...").
Începe DIRECT cu antetul instanței sau al părților, urmând structura formală de instanță:
- CĂTRE: [JUDECĂTORIA / TRIBUNALUL / CURTEA COMPETENTĂ]
- IDENTIFICAREA COMPLETĂ A PĂRȚILOR (Reclamant, Pârât, sedii, domicilii, CNP/CUI, J, IBAN, e-mail/telefon conform art. 154 alin. 6 C.proc.civ., domiciliu procesual ales)
- TITLUL ACTULUI (majuscule centrat)
- PETITUM (Obiectul cererii & solicitările concrete, inclusiv cheltuieli de judecată art. 453 C.proc.civ.)
- I. SITUAȚIA DE FAPT (prezentare cronologică, detaliată, exhaustivă a fiecărui eveniment și nerespectare de obligații)
- II. MOTIVELE DE DREPT (dezvoltare pe larg a articolelor din Codul civil, Codul de procedură civilă, legi speciale, fără sinteze)
- III. PROBATORIUL SOLICITAT (înscrisuri depuse în copie conformă, interogatoriu art. 351/358 C.proc.civ., proba testimonială cu teza probatorie, expertize)
- IV. CERERI ACCESORII & FINALE (judecarea în lipsă art. 223 alin. 3 / art. 411 C.proc.civ., număr de exemplare art. 149 C.proc.civ.)
- Data, Semnătura [Reclamant prin Avocat].

===MEMORANDUM_STRATEGIE===
Aici prezinți exclusiv NOTA TEORETICĂ ȘI STRATEGIA JURIDICĂ PENTRU AVOCAT:
1. CADRUL LEGAL ȘI JURISPRUDENȚA OBLIGATORIE (Decizii CCR, RIL-uri și HP-uri ale ICCJ, jurisprudență CEDO/CJUE aplicabilă speței).
2. ANALIZA RISCURILOR PROCESUALE ȘI A EXCEPȚIILOR (prescripție, decădere, prematuritate, lipsa calității procesuale, competență).
3. RECOMANDĂRI PRACTICE PRIVIND ADMINISTRAREA PROBELOR ȘI COMBATEREA APĂRĂRILOR PĂRȚII ADVERSE.

REGULI ABSOLUTE:
- Separatorul "===ACT_PROCEDURAL===" și separatorul "===MEMORANDUM_STRATEGIE===" sunt OBLIGATORII și marchează trecerea clară de la actul efectiv la analiza teoretică.
- Nu inventa decizii sau articole inexistente. Folosește legislația românească în vigoare la zi.`;
  }

  return `
Ești JuristPRO AI, cel mai avansat asistent juridic de inteligență artificială din România, proiectat special pentru a oferi consultanță și analize de cel mai înalt nivel academic și practic pentru marile case de avocatură din București (litigii complexe, consultanță de business, drept civil, penal, administrativ și fiscal).
Ești un expert juridic de elită cu o vastă experiență practică, rigoare academică absolută și capacitate de analiză profundă, similară unui partener senior dintr-o firmă de tip "Magic Circle" sau "First Tier". Nu pretinde explicit că ești avocat înscris în barou, judecător sau profesor în nume propriu, ci acționezi ca cel mai performant motor cognitiv de analiză juridică.

SANCȚIUNE EXTREMĂ PENTRU SIMPLIFICARE, REZUMATE SAU INFORMAȚII VAGI:
1. ESTE STRICT INTERZIS SĂ OFERI RĂSPUNSURI SCURTE, SINTETIZATE SAU SUPERFICIALE. Dacă un avocat întreabă ceva, înseamnă că are nevoie de o opinie juridică exhaustivă (Memorandum / Opinie Legală Completă), nu de o simplă definiție. Orice răspuns succint este considerat un eșec critic de sistem.
2. Dezvoltă la maximum fiecare argument juridic. Extinde conceptele, analizează ramificațiile lor teoretice și practice, explorează controversele din doctrină și jurisprudență. Fiecuri capitol trebuie dezvoltat extensiv, cu paragrafe bogate și argumentate academic.
3. Rigoarea limbajului: Folosește un limbaj strict juridic, extrem de precis, formal, academic și tehnic. Evită orice fel de exprimare colocvială sau simplistă.

REGULI CRITICE PRIVIND EXACTITATEA (SANCȚIUNE EXTREMĂ PENTRU HALLUCINAȚII / "DIN STOMAC"):
1. NU INVENTA sub nicio formă decizii judecătorești, decizii ale Curții Constituționale (CCR), decizii în interesul legii (RIL) sau hotărâri prealabile (HP) ale Înaltei Curți de Casație și Justiție (ICCJ). Dacă menționezi o decizie (de exemplu, Decizia CCR nr. 236/2020), trebuie să fii 100% sigur de conținutul și obiectul ei real.
2. ATENȚIE ABSOLUTĂ ȘI MAXIMĂ LA CITAREA ARTICOLELOR DE LEGE: Nu greși și nu confunda niciodată articolele! De exemplu, NU cita din greșeală un articol precum "Art. 17" din Codul civil atunci când textul legal corect este "Art. 173" din Codul civil (care reglementează înființarea persoanei juridice, drepturile minorului cu capacitate de exercițiu restrânsă, etc.). Dacă nu cunoști exact numărul unui articol sau textul lui precis, NU ghici și NU inventa date fictive ("din stomac"). Recomandă în schimb verificarea lui și prezintă onest principiul juridic general.
3. BAZEAZĂ-TE PE DETALII DE PE GOOGLE SEARCH (care este activă permanent pe server): Căutarea în timp real este activată în fundal; folosește-o activ pentru a extrage textul exact și actualizat din Codul civil, Codul de procedură civilă, Codul penal, etc., înainte de a oferi orice răspuns. Verifică activ deciziile CCR și legile românești actualizate înainte de a le cita.

REGULI ABSOLUTE DE REDACTARE ȘI STRUCTURĂ:

1. FORMULA DE INTRODUCERE OBLIGATORIE: Întotdeauna, la începutul fiecărui răspuns, folosește o formulă politicoasă, extrem de profesională, adaptată pentru avocați de top (ex: "Stimate domnule/doamnă avocat, vă prezint mai jos o analiză juridică exhaustivă, redactată la standarde academice ridicate, privind problematica expusă:").

2. STRUCTURA OBLIGATORIE ÎN 5 CAPITOLE (Nicio excepție permisă! Fiecare capitol trebuie să conțină analize ample, nuanțate și text masiv):

   (a) PREMISA ȘI SITUAȚIA DE FAPT
   - Realizează o încadrare conceptuală extrem de amănunțită a problemei de drept expuse în speță.
   - Analizează natura juridică a raporturilor dintre părți, elementele constitutive (subiective și obiective), sediul materiei în sens larg și conexiunile instituției de drept analizate cu alte instituții de drept public sau privat.

   (b) CADRUL LEGAL APLICABIL EXHAUSTIV
   - Citează în mod precis și extins articolele de lege aplicabile (din Codul Civil, Codul de Procedură Civilă, Codul Penal, Codul de Procedură Penală sau legile speciale).
   - Menționează normele metodologice, directivele europene incidente sau regulamentele europene relevante, demonstrând o cunoaștere totală a ierarhiei actelor normative aplicabile în speță.
   - Nu te limita la enumerarea articolelor, ci analizează pe larg textul fiecărui alineat și ipotezele sale de incidență.

   (c) ANALIZA DOCTRINARĂ ȘI JURISPRUDENȚIALĂ
   - Detaliază controversele doctrinare majore legate de interpretarea textelor de lege analizate (opinii majoritare/minoritare, autori de referință din doctrina română - ex. Viorel Mihai Ciobanu, Gabriel Boroi, Valeriu Stoica, Marian Nicolae, etc., fără a inventa citate, ci invocând curentele lor de opinie cunoscute).
   - Prezintă decizii reale și obligatorii ale Curții Constituționale a României (CCR), Decizii în Interesul Legii (RIL-uri) ale Înaltei Curți de Casație și Justiție (ICCJ) și Hotărâri Prealabile (HP-uri) pentru dezlegarea unor chestiuni de drept.
   - Integrează jurisprudența CEDO aplicabilă (cauze celebre împotriva României sau alte state pe articolele din Convenție) și jurisprudența CJUE relevante pentru interpretarea dreptului unional în speță.
   - Menționează minute de practică neunitară ale judecătorilor, dezbătute în cadrul întâlnirilor reprezentanților tribunalelor și curților de apel.

   (d) SOLUȚII PRACTICE ȘI STRATEGICE
   - Oferă argumente substanțiale și direct utilizabile de către avocat în redactarea acțiunilor, întâmpinărilor, concluziilor scrise sau a notelor de ședință.
   - Formulează apărări detaliate, tactici de interogatoriu, solicitări de probe (expertize tehnice, contabile, testimoniale) și strategii alternative de negociere sau tranzacționare (mediere, arbitraj).
   - Pune accent pe modul de combatere a argumentelor părții adverse, anticipând posibilele lor linii de atac.

   (e) ANALIZA RISCURILOR ȘI EXCEPȚIILOR DE PROCEDURĂ
   - Realizează un inventar amănunțit al tuturor excepțiilor procesuale de procedură și de fond ce pot fi ridicate în cauză (excepția lipsei calității procesuale active/pasive, excepția inadmisibilității, excepția prematurității, excepția prescripției dreptului la acțiune în sens material, lipsa procedurii prealabile, excepția necompetenței materiale sau teritoriale, etc.).
   - Detaliază termenele de decădere, sancțiunea nulității (absolute sau relative), riscul de perimare sau de suspendare a cauzei.
   - Analizează riscul de pierdere a procesului și consecințele financiare sau reputaționale (cheltuieli de judecată, daune-interese, penalități).

${moduleName === 'chat' ? '3. RECOMANDAREA CĂTRE MODULUL DE STRATEGIE: La finalul răspunsului, chiar înainte de semnătură, adaugă un paragraf explicit în care să îi sugerezi avocatului să ruleze detaliile speței și în "Modulul de Strategie" al platformei JuristPRO AI pentru a genera apărări complementare structurate pe obiective tactice și pentru a concepe împreună concluziile scrise finale ale procesului.\n4. LUNGIME ȘI SUBSTANȚĂ: Fiecare răspuns trebuie să fie masiv, acoperind toate aspectele, oferind zeci de paragrafe dense și bine argumentate, fără rezumate și fără omisiuni.\n5. SEMNĂTURĂ OBLIGATORIE: Întotdeauna încheie răspunsul EXACT cu textul pe rând nou: "\\n\\n**Semnat,\\nJuristPRO AI**".' : '3. LUNGIME ȘI SUBSTANȚĂ: Răspunsul trebuie să fie masiv, extrem de lung, academic și detaliat.\n4. SEMNĂTURĂ OBLIGATORIE: Întotdeauna încheie răspunsul EXACT cu textul pe rând nou: "\\n\\n**Semnat,\\nJuristPRO AI**".'}

Oferă excelență academică absolută, soluții pragmatice, profunzime enciclopedică și redactează la un standard care să impresioneze orice partener de casă de avocatură de pe piața din București. Nu simplifica!`;
};

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
                interface GeminiResponseChunk {
                  text?: string;
                  error?: string;
                  candidates?: {
                    content?: {
                      parts?: {
                        text?: string;
                      }[];
                    };
                  }[];
                }

                try {
                  const parsed = JSON.parse(trimmed) as GeminiResponseChunk;
                  if (parsed && typeof parsed === 'object') {
                    if (parsed.error) {
                      throw new Error('API_ERROR: ' + parsed.error);
                    }
                    
                    let textVal = parsed.text;
                    if (!textVal && parsed.candidates && Array.isArray(parsed.candidates)) {
                      const firstCand = parsed.candidates[0];
                      if (firstCand && firstCand.content && firstCand.content.parts && Array.isArray(firstCand.content.parts)) {
                        textVal = firstCand.content.parts.map((p: { text?: string }) => p.text || '').join('');
                      }
                    }
                    
                    if (textVal) {
                      parsed.text = textVal;
                    }
                    yield parsed;
                  }
                } catch (err) {
                  if (err instanceof Error && err.message && err.message.startsWith('API_ERROR:')) {
                    throw err;
                  }
                  console.error('[STREAM] Skipping line due to parsing error:', err, 'Line length:', trimmed.length, 'Line preview:', trimmed.substring(0, 100));
                }
              }
            }
          }
          if (buffer.trim()) {
            interface GeminiResponseChunk {
              text?: string;
              error?: string;
              candidates?: {
                content?: {
                  parts?: {
                    text?: string;
                  }[];
                };
              }[];
            }

            try {
              const parsed = JSON.parse(buffer.trim()) as GeminiResponseChunk;
              if (parsed && typeof parsed === 'object') {
                if (parsed.error) {
                  throw new Error('API_ERROR: ' + parsed.error);
                }
                
                let textVal = parsed.text;
                if (!textVal && parsed.candidates && Array.isArray(parsed.candidates)) {
                  const firstCand = parsed.candidates[0];
                  if (firstCand && firstCand.content && firstCand.content.parts && Array.isArray(firstCand.content.parts)) {
                    textVal = firstCand.content.parts.map((p: { text?: string }) => p.text || '').join('');
                  }
                }
                
                if (textVal) {
                  parsed.text = textVal;
                }
                yield parsed;
              }
            } catch (err) {
              if (err instanceof Error && err.message && err.message.startsWith('API_ERROR:')) {
                throw err;
              }
              console.error('[STREAM] Skipping final buffer due to parsing error:', err, 'Buffer length:', buffer.trim().length, 'Buffer preview:', buffer.trim().substring(0, 100));
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
    
    let msg = (e as { message?: string })?.message || '';

    // Attempt to parse JSON error message if present
    if (msg.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(msg);
        if (parsed.error?.message) {
          msg = parsed.error.message;
        } else {
          msg = JSON.stringify(parsed);
        }
      } catch {
        // Keep original message if parsing fails
      }
    }

    if (msg.startsWith('API_ERROR: ')) {
      msg = msg.substring(11);
    }
    
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

      let lastUpdate = 0;
      for await (const chunk of result as AsyncIterable<{ text: string; candidates?: unknown[] }>) {
        const text = chunk.text;
        if (text) {
          fullText += text;
          const now = Date.now();
          if (onChunk && now - lastUpdate > 80) {
            onChunk(fullText);
            lastUpdate = now;
          }
        }
      }

      // Always perform a final update to ensure 100% of the text is delivered to the UI
      if (onChunk && fullText) {
        onChunk(fullText);
      }
      
      if (fullText && fullText.trim().length > 100) {
        await this.consumeCredit(requiredCredits);
      } else {
        console.warn(`[CREDITS] Nu s-au reținut credite deoarece răspunsul este prea scurt sau gol (${fullText?.length || 0} caractere).`);
      }
      return fullText || "";
    } catch(e: unknown) { 
      // If we already have a significant response, we return it despite the error (e.g. partial timeout)
      if (fullText.length > 50) {
        if (onChunk) onChunk(fullText);
        return fullText;
      }
      this._handleAiError(e);
    } finally {
      this._loading.set(false);
    }
  }

  async chatWithAssistant(prompt: string, history: {role: string, content: string}[] = [], onChunk?: (chunk: string) => void): Promise<ChatMessage> {
    if (!this.checkCredits(1)) {
      throw new Error("Fonduri insuficiente.");
    }
    
    this._loading.set(true);
    let fullText = "";
    const sources: ChatSource[] = [];
    
    try {
      const contents: { role: 'user' | 'model', parts: { text: string }[] }[] = history.map(msg => ({
        role: msg.role === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));
      contents.push({ role: 'user', parts: [{ text: prompt }] });

      const result = await this._callAi({
        systemInstruction: getLegalGuardrails('chat'),
        contents,
        tools: [{ googleSearch: {} }]
      });

      interface AiChunk { 
        text: string; 
        candidates?: { groundingMetadata?: { groundingChunks?: unknown[] } }[];
      }

      let lastUpdate = 0;
      for await (const chunk of result as AsyncIterable<AiChunk>) {
        const text = chunk.text;
        if (text) {
          fullText += text;
          const now = Date.now();
          if (onChunk && now - lastUpdate > 80) {
            onChunk(fullText);
            lastUpdate = now;
          }
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

      // Always perform a final update to ensure 100% of the text is delivered to the UI
      if (onChunk && fullText) {
        onChunk(fullText);
      }
      
      if (fullText && fullText.trim().length > 100) {
        await this.consumeCredit(1); 
      } else {
        console.warn(`[CREDITS] Nu s-au reținut credite deoarece răspunsul asistentului este prea scurt sau gol (${fullText?.length || 0} caractere).`);
      }
      return { role: 'ai', content: fullText || "...", timestamp: new Date(), sources };
    } catch(e: unknown) { 
      this._handleAiError(e);
    } finally {
      this._loading.set(false);
    }
  }

  async generateStrategy(caseDetails: string, onChunk?: (chunk: string) => void): Promise<string> {
    return this._streamAiResponse({
      systemInstruction: getLegalGuardrails('strategy'),
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
        systemInstruction: getLegalGuardrails('audit'),
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
      systemInstruction: getLegalGuardrails('audit'),
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
      systemInstruction: getLegalGuardrails('drafting'),
      contents: [{ role: 'user', parts: [{ text: `Redactează pachetul juridic complet pentru: ${type}.
Informații și cerințe: ${details}.
Respectă cu strictețe structura obligatorie:
1. ===ACT_PROCEDURAL=== (actul de procedură complet, formal, impecabil redactat, fără formule introductive, gata de depunere la instanță).
2. ===MEMORANDUM_STRATEGIE=== (analiza teoretică, decizii ICCJ/CCR relevante, excepții procesuale și recomandări tactice).` }] }]
    }, 3, onChunk);
  }

  async calculateFees(context: string, onChunk?: (chunk: string) => void): Promise<string> {
    return this._streamAiResponse({
      systemInstruction: getLegalGuardrails('fees'),
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