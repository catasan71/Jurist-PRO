import { Component, inject, signal, computed, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JuristService, CalendarEvent } from '../services/jurist.service';

interface SpeechRecognitionEvent {
  results: { transcript: string }[][];
}

interface ISpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: { error?: string }) => void;
  onstart: () => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: new () => ISpeechRecognition;
  webkitSpeechRecognition?: new () => ISpeechRecognition;
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full flex flex-col bg-jurist-card rounded-xl border border-gray-800 shadow-neon overflow-hidden relative animate-fadeIn">
      <!-- Loading Overlay -->
      @if (saving()) {
        <div class="absolute inset-0 bg-black/60 z-50 flex items-center justify-center">
           <div class="bg-gray-900 p-6 rounded-xl border border-jurist-orange flex flex-col items-center gap-4">
             <div class="w-8 h-8 border-4 border-jurist-orange border-t-transparent rounded-full animate-spin"></div>
             <span class="text-white font-bold">Salvăm Dosarul...</span>
           </div>
        </div>
      }

      <!-- Header -->
      <div class="p-6 border-b border-gray-800 bg-jurist-dark flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 class="text-2xl font-bold text-jurist-orange mb-1">Calendar & Termene</h2>
           <p class="text-sm text-gray-400">Management dosare • Termene procedurale • Memento</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="relative">
            <input 
              type="text" 
              [(ngModel)]="searchQuery" 
              placeholder="Caută dosar..." 
              class="bg-black border border-gray-700 rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:border-jurist-orange outline-none w-full md:w-64"
            >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <button (click)="openModal(null)" class="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm border border-gray-600 transition-colors flex items-center gap-2 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span class="hidden sm:inline">Dosar Nou</span>
          </button>
        </div>
      </div>

      <!-- Mobile Tabs Switcher -->
      <div class="lg:hidden flex border-b border-gray-800 bg-gray-900/50">
        <button 
          (click)="mobileTab.set('agenda')" 
          [class]="'flex-1 py-3 text-sm font-bold transition-colors ' + (mobileTab() === 'agenda' ? 'text-jurist-orange border-b-2 border-jurist-orange' : 'text-gray-400')"
        >
          📅 Agenda
        </button>
        <button 
          (click)="mobileTab.set('calculator')" 
          [class]="'flex-1 py-3 text-sm font-bold transition-colors ' + (mobileTab() === 'calculator' ? 'text-jurist-orange border-b-2 border-jurist-orange' : 'text-gray-400')"
        >
          🤖 Calculator AI
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-4 lg:p-6 flex flex-col lg:flex-row gap-6 animate-slideUp">
        
        <!-- Timeline View (Agenda) -->
        <div [class]="'flex-1 space-y-6 ' + (mobileTab() === 'agenda' ? 'block' : 'hidden lg:block')">
          <h3 class="text-white font-bold mb-4 pl-2 border-l-4 border-jurist-orange hidden lg:block">Agenda Următoare</h3>
          
          <div class="space-y-4">
             @for (event of filteredEvents(); track event.id) {
               <div (click)="openModal(event)" (keyup.enter)="openModal(event)" tabindex="0" class="bg-gray-900 border border-gray-800 p-4 sm:p-5 rounded-xl flex items-start gap-3 sm:gap-4 hover:border-jurist-orange transition-all cursor-pointer relative overflow-hidden group">
                 <!-- Date Badge -->
                 <div class="bg-gray-800 rounded-lg p-2 text-center min-w-[70px] sm:min-w-[80px] self-stretch flex flex-col justify-center">
                   <span class="block text-xs text-gray-400 uppercase">{{ event.date | date:'MMM' }}</span>
                   <span class="block text-2xl sm:text-3xl font-bold text-white">{{ event.date | date:'dd' }}</span>
                   <span class="block text-[10px] sm:text-xs text-gray-400 font-mono">{{ event.time }}</span>
                 </div>
                 
                 <!-- Content -->
                 <div class="flex-1 min-w-0">
                   <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                     <div class="min-w-0">
                       <h4 class="text-base sm:text-lg font-bold text-white truncate pr-2">{{ event.title }}</h4>
                       <p class="text-jurist-orange text-xs sm:text-sm font-semibold truncate">{{ event.clientName }}</p>
                     </div>
                     <span [class]="getBadgeClass(event.type) + ' self-start sm:self-auto'">{{ getTypeLabel(event.type) }}</span>
                   </div>
                   
                   <p class="text-gray-400 text-xs sm:text-sm mt-1 italic truncate">{{ event.caseObject }}</p>
                   
                   <!-- FIX: Financial Mini-Status & Alerts (Wrapped for mobile) -->
                   <div class="mt-3 flex flex-wrap items-center justify-between gap-y-2 text-xs border-t border-gray-800 pt-2">
                     <div class="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono w-full sm:w-auto">
                       <span class="text-gray-400 whitespace-nowrap">Total: <span class="text-white">{{ event.financial.total }}</span></span>
                       <span [class]="(event.financial.rest > 0 ? 'text-red-400' : 'text-green-500') + ' whitespace-nowrap'">
                         Rest: {{ event.financial.rest }}
                       </span>
                     </div>
                     @if (event.whatsappAlert) {
                       <button 
                         (click)="$event.stopPropagation(); juristService.sendWhatsAppAlert(event)" 
                         class="flex items-center gap-1 text-green-400 hover:text-green-300 ml-auto sm:ml-0 bg-green-400/10 px-2 py-0.5 rounded border border-green-400/20 transition-colors" 
                         title="Trimite Alerta WhatsApp Acum"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-whatsapp" viewBox="0 0 16 16">
                           <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
                         </svg>
                         <span class="text-[10px] font-bold">Trimite Alertă</span>
                       </button>
                     }
                   </div>
                 </div>
                 
                 <!-- Edit Icon on Hover (Desktop) / Always Visible (Mobile - Optional, but keeping clean) -->
                 <div class="hidden sm:block absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div class="bg-jurist-orange p-2 rounded-full text-black shadow-neon">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                      </svg>
                    </div>
                 </div>
               </div>
             }
             
             @if (juristService.events().length === 0) {
               <div class="text-center text-gray-600 py-10">Nu există dosare programate.</div>
             }
          </div>
        </div>

        <!-- AI Sidebar (Calcul Termene) -->
        <div [class]="'w-full lg:w-1/3 bg-gray-900/50 lg:border-l border-gray-800 lg:p-6 p-1 rounded-xl lg:rounded-none ' + (mobileTab() === 'calculator' ? 'block' : 'hidden lg:block')">
          <h3 class="text-jurist-orange font-bold mb-4 flex items-center gap-2">
             <span>🤖</span> Calculator Termene AI
          </h3>
          <p class="text-sm text-gray-400 mb-4">Introduceți data comunicării și durata termenului. AI-ul va calcula data scadentă conform CPC (sistemul "pe zile libere", weekend-uri, sărbători).</p>
          
          <div class="relative group">
            <textarea 
                [(ngModel)]="aiPrompt"
                rows="5" 
                class="w-full bg-black border border-gray-700 rounded-lg p-4 text-sm text-white mb-3 focus:border-jurist-orange leading-relaxed"
                placeholder="Ex: Hotărârea mi-a fost comunicată Vineri, 1 Octombrie 2024. Când se împlinește termenul de apel de 30 de zile?"
            ></textarea>
            <div class="absolute bottom-5 right-3 text-[10px] text-gray-500 bg-black/80 px-1 rounded">
                Referință: Art. 181 NCPC
            </div>
          </div>

          <button 
             (click)="askAI()"
             [disabled]="!aiPrompt || juristService.isLoading()"
             class="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
          >
            @if(juristService.isLoading()) {
                <div class="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
            }
            Calculează Termene Exacte
          </button>
          
          @if (dateResult()) {
            <div class="mt-6 p-5 bg-gray-800 rounded-xl border border-gray-600 shadow-lg relative animate-fadeIn">
                <div class="absolute -top-3 left-4 bg-jurist-orange text-black text-[10px] font-bold px-2 py-0.5 rounded">REZULTAT CALCUL</div>
                <div class="text-xl font-bold text-white mb-4">{{ dateResult() }}</div>
                
                <button (click)="showMethodology.set(!showMethodology())" class="text-xs text-jurist-orange hover:underline">
                  {{ showMethodology() ? 'Ascunde metodologia' : 'Vezi metodologia de calcul' }}
                </button>
                
                @if (showMethodology() && methodologyResult()) {
                  <div class="mt-3 pt-3 border-t border-gray-700 text-sm text-gray-400 whitespace-pre-wrap leading-relaxed font-mono">
                    {{ methodologyResult() }}
                  </div>
                }
            </div>
          }
        </div>
      </div>

      <!-- Edit/Create Modal - CLEAN STABLE DESIGN -->
      @if (showModal()) {
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div class="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[95vh] flex flex-col overflow-hidden">
            
            <div class="p-6 border-b border-gray-800 flex justify-between items-center bg-jurist-dark">
              <div class="flex items-center gap-3">
                <div class="w-3 h-3 rounded-full bg-jurist-orange animate-pulse"></div>
                <h3 class="text-xl text-white font-bold">{{ editingEvent.id ? 'Editare Dosar' : 'Constituire Dosar Nou' }}</h3>
              </div>
              <button (click)="closeModal()" class="text-gray-400 hover:text-white p-2 hover:bg-gray-800 rounded-lg transition-colors">✕</button>
            </div>

            <div class="flex-1 overflow-y-auto p-6 space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="caseTitle" class="block text-xs font-bold text-gray-400 uppercase mb-1">Număr / Titlu Dosar</label>
                  <input id="caseTitle" [(ngModel)]="editingEvent.title" placeholder="Ex: 1234/3/2024" class="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-jurist-orange outline-none transition-all">
                </div>
                <div>
                  <label for="caseType" class="block text-xs font-bold text-gray-400 uppercase mb-1">Tipologie</label>
                  <select id="caseType" [(ngModel)]="editingEvent.type" class="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-jurist-orange outline-none cursor-pointer">
                    <option value="court">Instanță Judecătorească</option>
                    <option value="deadline">Termen Procedural</option>
                    <option value="meeting">Întâlnire Client</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="caseDate" class="block text-xs font-bold text-gray-400 uppercase mb-1">Data</label>
                  <input id="caseDate" type="date" [(ngModel)]="editingEvent.date" class="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-jurist-orange outline-none [color-scheme:dark]">
                </div>
                <div>
                  <label for="caseTime" class="block text-xs font-bold text-gray-400 uppercase mb-1">Ora</label>
                  <input id="caseTime" type="time" [(ngModel)]="editingEvent.time" class="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-jurist-orange outline-none [color-scheme:dark]">
                </div>
              </div>

              <div>
                <label for="caseClient" class="block text-xs font-bold text-gray-400 uppercase mb-1">Client Beneficiar</label>
                <input id="caseClient" [(ngModel)]="editingEvent.clientName" placeholder="Nume client" class="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-jurist-orange outline-none transition-all">
              </div>

              <div>
                <label for="caseDetails" class="block text-xs font-bold text-gray-400 uppercase mb-1">Instanța / Detalii Locație</label>
                <input id="caseDetails" [(ngModel)]="editingEvent.details" placeholder="Ex: Judecătoria Sector 1" class="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-jurist-orange outline-none transition-all">
              </div>

              <div class="bg-gray-800/20 p-5 rounded-xl border border-gray-800 shadow-inner">
                <span class="block text-xs font-bold text-gray-500 uppercase mb-4 border-l-2 border-green-500 pl-2">Gestiune Financiară (RON)</span>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label for="caseTotal" class="text-[10px] text-gray-400 block mb-1">Onorariu Total</label>
                    <input id="caseTotal" type="number" [(ngModel)]="editingEvent.financial.total" class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-white outline-none focus:border-green-500">
                  </div>
                  <div>
                    <label for="casePaid" class="text-[10px] text-gray-400 block mb-1">Suma Încasată</label>
                    <input id="casePaid" type="number" [(ngModel)]="editingEvent.financial.paid" class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-white outline-none focus:border-green-500">
                  </div>
                </div>
                <div class="mt-4 pt-3 border-t border-gray-800 flex justify-between items-center text-sm">
                  <span class="text-gray-400 font-medium">Rest de plată estimat:</span>
                  <span class="font-bold text-jurist-orange text-lg">{{ (editingEvent.financial.total || 0) - (editingEvent.financial.paid || 0) }} RON</span>
                </div>
              </div>

              <div>
                <div class="flex justify-between items-center mb-2">
                  <label for="caseNotes" class="block text-xs font-bold text-gray-400 uppercase">Strategie & Note Tactice</label>
                  <button type="button" (click)="toggleDictation()" [class]="'flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black transition-all border shadow-lg ' + (isListening() ? 'bg-red-600 text-white border-red-500 animate-pulse' : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-jurist-orange hover:text-white')">
                    @if (isListening()) {
                      <span class="relative flex h-2 w-2">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                      </span>
                    }
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                    </svg>
                    {{ isListening() ? 'ASCULT...' : 'DICTARE VOCALĂ' }}
                  </button>
                </div>
                @if (isInIframe()) {
                  <p class="text-[10px] text-jurist-orange bg-jurist-orange/5 border border-jurist-orange/20 rounded-lg p-2 mb-2 leading-relaxed">
                    ⚠️ <strong>Restricție browser:</strong> Browserele blochează accesul la microfon în ferestrele tip iframe (AI Studio). Pentru a putea folosi funcția de dictare, vă rugăm să deschideți aplicația într-o filă nouă făcând click pe butonul <strong>"New Tab"</strong> din colțul dreapta-sus al ecranului!
                  </p>
                }
                <textarea id="caseNotes" [(ngModel)]="editingEvent.notes" rows="5" class="w-full bg-black border border-gray-700 rounded-xl p-4 text-sm text-gray-200 focus:border-jurist-orange outline-none resize-none transition-all placeholder-gray-800" placeholder="Strategia, probe, martori propuși..."></textarea>
              </div>

              <div class="flex items-center gap-4 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10 hover:border-emerald-500/30 transition-all group">
                <div class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" id="alert" [(ngModel)]="editingEvent.whatsappAlert" [disabled]="!juristService.profile().phone" class="w-5 h-5 accent-jurist-orange cursor-pointer">
                </div>
                <label for="alert" class="text-sm text-gray-300 cursor-pointer select-none">
                  <span class="font-bold text-white block">Alertă WhatsApp Automată</span>
                  <span class="text-xs text-gray-500 group-hover:text-gray-400">Notificăm beneficiarul cu 24h înainte de termenul de judecată.</span>
                </label>
              </div>
            </div>

            <div class="p-6 border-t border-gray-800 flex justify-end gap-3 bg-jurist-dark">
              <button (click)="closeModal()" class="px-6 py-2.5 rounded-xl text-gray-400 hover:text-white font-bold transition-colors">Renunță</button>
              <button (click)="saveEvent()" [disabled]="saving() || !editingEvent.title" class="bg-jurist-orange hover:bg-orange-600 text-black px-10 py-2.5 rounded-xl font-black transition-all active:scale-95 disabled:opacity-30 shadow-lg flex items-center justify-center gap-2">
                @if (saving()) {
                  <div class="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                }
                {{ editingEvent.id ? 'Actualizează Dosar' : 'Salvează Dosar' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class CalendarComponent implements OnInit, OnDestroy {
  juristService = inject(JuristService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  aiPrompt = '';
  searchQuery = signal('');
  dateResult = signal<string>('');
  methodologyResult = signal<string>('');
  showMethodology = signal(false);
  
  // New state for mobile tabs
  mobileTab = signal<'agenda' | 'calculator'>('agenda');
  
  showModal = signal(false);
  saving = signal(false);
  
  filteredEvents = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const events = this.juristService.events();
    if (!q) return events;
    return events.filter(e => 
      e.title.toLowerCase().includes(q) || 
      e.clientName.toLowerCase().includes(q) || 
      e.caseObject.toLowerCase().includes(q) ||
      e.details.toLowerCase().includes(q) ||
      e.notes.toLowerCase().includes(q)
    );
  });

  defaultEvent: CalendarEvent = {
    id: '',
    title: '',
    clientName: '',
    caseObject: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    type: 'court',
    details: '',
    notes: '',
    whatsappAlert: false,
    financial: { total: 0, paid: 0, rest: 0 }
  };

  // Local object for modal to decouple from signals during editing
  editingEvent: CalendarEvent = { ...this.defaultEvent };

  isListening = signal(false);
  recognition: ISpeechRecognition | null = null;

  ngOnDestroy() {
    if (this.isListening() && this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.warn('Speech stop error on destroy:', e);
      }
    }
  }

  currentEventSignal = signal<Partial<CalendarEvent>>({ ...this.defaultEvent });
  
  get currentEvent() { return this.currentEventSignal(); }
  
  // Helper to update signal properties
  updateCurrentEvent(field: string, value: string | boolean | undefined) {
    this.currentEventSignal.update(s => ({ ...s, [field]: value }));
    console.log('Event updated:', field, value);
  }

  // Helper for nested financial field
  updateFinancial(field: 'total' | 'paid', value: number) {
    this.currentEventSignal.update(s => {
      const total = field === 'total' ? value : (s.financial?.total || 0);
      const paid = field === 'paid' ? value : (s.financial?.paid || 0);
      const rest = total - paid;
      return { 
        ...s, 
        financial: { total, paid, rest } 
      };
    });
  }

  constructor() {
    // Lazy-loaded speech recognition initialized on-demand
  }

  getBadgeClass(type: string) {
    switch(type) {
      case 'court': return 'px-2 py-0.5 rounded text-[10px] font-bold bg-red-900/50 text-red-200 border border-red-800 uppercase tracking-wide';
      case 'deadline': return 'px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-900/50 text-yellow-200 border border-yellow-800 uppercase tracking-wide';
      case 'meeting': return 'px-2 py-0.5 rounded text-[10px] font-bold bg-blue-900/50 text-blue-200 border border-blue-800 uppercase tracking-wide';
      default: return '';
    }
  }
  
  getTypeLabel(type: string) {
    switch(type) {
      case 'court': return 'Instanță';
      case 'deadline': return 'Termen';
      case 'meeting': return 'Întâlnire';
      default: return type;
    }
  }

  isInIframe() {
    return typeof window !== 'undefined' && window.self !== window.top;
  }

  async askAI() {
    // 1. Get Today's Date in Romanian Format
    const today = new Date().toLocaleDateString('ro-RO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // 2. Construct a stronger context for the AI
    const context = `
      Ești un Expert Calculator de Termene Procedurale (Codul de Procedură Civilă/Penală din România).
      DATA DE REFERINȚĂ (ASTĂZI) ESTE: ${today}.
      
      Reguli obligatorii de calcul (Art. 181 NCPC):
      1. Nu lua în calcul prima zi (ziua de pornire/comunicare), cu excepția termenelor pe ore.
      2. Termenul se împlinește la ora 24:00 a ultimei zile.
      3. Dacă ultima zi e nelucrătoare (sâmbătă, duminică, sărbătoare legală), termenul se prelungește automat până la sfârșitul primei zile lucrătoare următoare.
      4. Sistemul este "pe zile libere" (nu intră în calcul nici ziua de start, nici ziua de final) DOAR dacă utilizatorul specifică explicit acest lucru (de regulă pentru termenele de depunere a concluziilor scrise). Altfel, folosește regula standard.

      Sarcina ta:
      Calculează exact data împlinirii termenului pe baza input-ului utilizatorului.
      Specifică clar dacă data cade în weekend și se prorogă.
      RĂSPUNSUL TĂU TREBUIE SĂ FIE ÎN FORMATUL URMĂTOR:
      DATA: [Data calculată, de ex. 01.10.2024]
      METODOLOGIE: [Detalierea metodologiei conform Art. 181 NCPC]

      Input utilizator: ${this.aiPrompt}
    `;

    this.dateResult.set("");
    this.methodologyResult.set("");
    this.showMethodology.set(false);
    
    try {
      this.juristService.toggleLoading(true);
      const res = await this.juristService.chatWithAssistant(context, () => {
        // We might want to handle partial updates, but for parsing logic, 
        // it's easier to handle after the full response.
      });
      
      const content = res.content;
      const parts = content.split('METODOLOGIE:');
      const datePart = parts[0].replace('DATA:', '').trim();
      const methodologyPart = parts[1]?.trim() || '';
      
      this.dateResult.set(datePart);
      this.methodologyResult.set(methodologyPart);
      
    } catch (e) {
      console.error(e);
      this.dateResult.set("Eroare calcul");
      this.methodologyResult.set("A apărut o eroare la calcularea termenelor.");
    } finally {
      this.juristService.toggleLoading(false);
    }
  }

  openModal(event: CalendarEvent | null) {
    if (event) {
      // Deep copy to local editing object
      this.editingEvent = JSON.parse(JSON.stringify(event));
    } else {
      this.editingEvent = JSON.parse(JSON.stringify(this.defaultEvent));
      this.editingEvent.id = ''; // Ensure it's empty for creation
      
      if (this.juristService.profile().phone) {
        this.editingEvent.whatsappAlert = true;
      }
    }
    this.showModal.set(true);
    this.cdr.detectChanges();
  }

  ngOnInit() {
    this.checkPendingAlerts();
  }

  // AUTOMATION: Proactively check for upcoming alerts that haven't been sent
  private checkPendingAlerts() {
    setTimeout(() => {
      const todayStr = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const pending = this.juristService.events().filter(e => 
        (e.date === todayStr || e.date === tomorrowStr) && 
        e.whatsappAlert
      );

      if (pending.length > 0 && this.juristService.profile().phone) {
        // We could automatically pop one here, but it's better to show a "Sync" button if multiple
        console.log(`Found ${pending.length} pending WhatsApp alerts.`);
      }
    }, 2000);
  }

  closeModal() {
    this.showModal.set(false);
    if (this.isListening() && this.recognition) {
      this.recognition.stop();
    }
  }

  async saveEvent() {
    if(!this.editingEvent.title) {
       this.juristService.notificationService.warning("Vă rugăm să introduceți un titlu pentru dosar.");
       return;
    }

    this.saving.set(true);
    try {
      const eventToSave: CalendarEvent = JSON.parse(JSON.stringify(this.editingEvent));
      
      // Ensure financial rest is calculated correctly
      const total = eventToSave.financial?.total || 0;
      const paid = eventToSave.financial?.paid || 0;
      eventToSave.financial = { total, paid, rest: total - paid };

      if (eventToSave.id) {
        await this.juristService.updateEvent(eventToSave);
      } else {
        await this.juristService.addEvent(eventToSave);
      }

      this.saving.set(false);
      this.closeModal();
    } catch (err) {
      console.error('Error saving event:', err);
      this.saving.set(false);
      this.cdr.detectChanges();
    }
  }

  toggleDictation() {
    if (this.isListening()) {
      if (this.recognition) {
        try {
          this.recognition.stop();
        } catch (e) {
          console.warn('Silent stop error:', e);
        }
      }
      this.isListening.set(false);
      this.cdr.detectChanges();
      return;
    }

    if (typeof window === 'undefined') return;

    const win = window as unknown as WindowWithSpeechRecognition;
    const SpeechRecognitionObj = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognitionObj) {
      alert('Recunoașterea vocală nu este suportată în acest browser sau mediu. Vă recomandăm să folosiți Google Chrome sau Safari.');
      return;
    }

    try {
      this.recognition = new SpeechRecognitionObj();
      this.recognition.lang = 'ro-RO';
      this.recognition.continuous = true;
      this.recognition.interimResults = true;

      this.recognition.onstart = () => {
        this.ngZone.run(() => {
          this.isListening.set(true);
          this.cdr.detectChanges();
        });
        console.log('Calendar notes dictation started...');
      };

      this.recognition.onresult = (event: any) => {
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          this.ngZone.run(() => {
            this.editingEvent.notes = (this.editingEvent.notes || '') + (this.editingEvent.notes ? ' ' : '') + finalTranscript;
            this.cdr.detectChanges();
          });
        }
      };

      this.recognition.onerror = (event: { error?: string }) => {
        console.error('Calendar speech error:', event.error || event);
        const errType = event.error;
        this.ngZone.run(() => {
          this.isListening.set(false);
          this.cdr.detectChanges();
          
          if (errType === 'not-allowed') {
            alert('Accesul la microfon a fost refuzat sau blocat.\n\nSFAT IMPORTANT: Dacă folosiți preview-ul AI Studio (modul iframe), browserele blochează accesul la microfon dintr-un cadru de securitate. Vă rugăm să faceți click pe butonul de deschidere în filă nouă (New Tab) din colțul din dreapta-sus al ecranului, pentru ca aplicația să poată solicita permisiunea de microfon direct!');
          } else if (errType === 'network') {
            alert('Eroare de rețea la serviciul de recunoaștere vocală al browserului.');
          }
        });
      };

      this.recognition.onend = () => {
        this.ngZone.run(() => {
          this.isListening.set(false);
          this.cdr.detectChanges();
        });
        console.log('Calendar notes dictation ended.');
      };

      this.recognition.start();

    } catch (e) {
      console.error('Failed to initialize speech recognition:', e);
      alert('Nu s-a putut inițializa microfonul. Vă rugăm să deschideți aplicația într-o filă nouă (New Tab) pentru a acorda permisiuni direct.');
      this.isListening.set(false);
      this.cdr.detectChanges();
    }
  }
}