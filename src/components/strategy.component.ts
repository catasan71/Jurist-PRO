import { Component, inject, signal, ChangeDetectorRef, ChangeDetectionStrategy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JuristService } from '../services/jurist.service';
import { AuthService } from '../services/auth.service';
import { MarkdownPipe } from '../pipes/markdown.pipe';

interface SpeechRecognitionEvent {
  results: { transcript: string }[][];
}

interface ISpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: { error: string }) => void;
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
  selector: 'app-strategy',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full flex flex-col bg-jurist-card rounded-xl border border-gray-800 shadow-neon overflow-hidden animate-fadeIn">
      <!-- Header Fixed -->
      <div class="p-6 border-b border-gray-800 bg-jurist-dark flex-shrink-0">
        <h2 class="text-2xl font-bold text-jurist-orange mb-1">Strategie Act Juridic</h2>
        <p class="text-sm text-gray-400">Analiză 360° • Soluții Multiple (Ofensiv/Defensiv/Amiabil) • Doctrină</p>
      </div>

      <!-- Main Scrollable Area -->
      <div class="flex-1 overflow-y-auto p-6 scroll-smooth">
        <div class="max-w-5xl mx-auto flex flex-col gap-8 pb-10 animate-slideUp">
          
          <!-- ROW 1: Input Section (Situation of Fact) -->
          <div class="w-full bg-gray-900/50 p-6 rounded-xl border border-gray-700 shadow-lg">
            <div class="flex justify-between items-center mb-3">
              <span class="block text-sm font-medium text-gray-300 flex items-center gap-2">
                <span class="w-2 h-2 bg-jurist-orange rounded-full"></span>
                Descrieți situația de fapt
              </span>
              <div class="flex items-center gap-3">
                <button (click)="toggleDictation()" [class]="'flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ' + (isListening() ? 'bg-red-600 text-white border-red-500 animate-pulse' : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-jurist-orange')">
                  @if (isListening()) {
                    <span class="w-2 h-2 rounded-full bg-white"></span>
                  }
                  {{ isListening() ? 'ASCULTĂM...' : '🎤 DICTARE VOCALĂ' }}
                </button>
                <span class="text-[10px] text-orange-400 bg-orange-900/20 px-2 py-1 rounded border border-orange-500/50 font-bold uppercase tracking-wider">Cost: 5 Credite</span>
              </div>
            </div>
            
            @if (isInIframe()) {
              <p class="text-[10px] text-jurist-orange bg-jurist-orange/5 border border-jurist-orange/20 rounded-lg p-2 mb-3 leading-relaxed">
                ⚠️ <strong>Restricție browser:</strong> Browserele blochează accesul la microfon în ferestrele tip iframe (AI Studio). Pentru a putea folosi funcția de dictare, vă rugăm să deschideți aplicația într-o filă nouă făcând click pe butonul <strong>"New Tab"</strong> din colțul dreapta-sus al ecranului!
              </p>
            }
            
            <textarea 
              [(ngModel)]="caseDetails" 
              rows="5" 
              class="w-full bg-black border border-gray-800 rounded-lg p-4 text-sm focus:border-jurist-orange focus:ring-1 focus:ring-jurist-orange transition-all placeholder-gray-600 resize-y"
              placeholder="Ex: Clientul a fost notificat pentru evacuare din spațiul comercial, deși a plătit chiria la timp, dar proprietarul invocă o clauză de forță majoră neclară..."
            ></textarea>
            
            <!-- Security Info -->
            <div class="bg-green-900/10 border border-green-900/30 rounded-xl p-4 flex items-start gap-3 mt-4">
              <div class="bg-green-900/30 p-1.5 rounded-lg shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 text-green-500">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <div>
                <h4 class="text-green-500 font-bold text-xs mb-1">Date Securizate (AES-256)</h4>
                <p class="text-[10px] text-gray-400 leading-relaxed">
                  Informațiile introduse sunt procesate temporar în memorie (RAM) și <strong>șterse definitiv</strong> după generare. Nu stocăm datele clienților și nu antrenăm modele AI cu ele.
                </p>
              </div>
            </div>

            <div class="mt-4 flex justify-end">
              <button 
                (click)="generate()" 
                [disabled]="!caseDetails || juristService.isLoading()"
                class="bg-jurist-orange hover:bg-jurist-orangeHover text-white px-8 py-3 rounded-lg font-bold transition-all shadow-[0_0_15px_rgba(255,140,0,0.3)] disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
              >
                @if (juristService.isLoading()) {
                  <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Se Elaborează Strategia...
                } @else {
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                  Generează Strategiile
                }
              </button>
            </div>
          </div>

          <!-- ROW 2: Output Section (The Strategy Report) - DARK MODE -->
          <div class="w-full min-h-[400px]">
             @if (strategyResult()) {
               <div class="animate-fadeIn w-full flex justify-center">
                  <!-- Dark Dossier Effect -->
                  <div class="bg-[#18181b] border border-gray-700 text-gray-300 p-10 md:p-16 rounded-xl shadow-2xl relative font-sans w-full max-w-[210mm]">
                    
                    <!-- Decorative Top Line -->
                    <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-jurist-orange"></div>

                    <!-- Stamp -->
                    <div class="absolute top-8 right-8 border border-blue-500/50 text-blue-400 font-bold px-4 py-1 text-xs transform opacity-80 uppercase tracking-widest hidden md:block rounded">
                       Strategie Juridică
                    </div>

                    <div class="mb-8 border-b border-gray-700 pb-4">
                      <h2 class="text-3xl font-bold text-center uppercase tracking-tight text-white">Raport Strategic</h2>
                      <p class="text-center text-sm text-gray-500 mt-2">Sinteză & Scenarii • JuristPRO AI</p>
                    </div>

                    <!-- Output Area -->
                    <div class="text-sm text-justify leading-relaxed space-y-2" [innerHTML]="strategyResult() | markdown"></div>
                    
                    <div class="mt-10 pt-6 border-t border-gray-700 flex justify-between items-center">
                      <span class="text-xs text-gray-500 italic">Document confidențial generat automat.</span>
                      @if (authService.currentUser()?.plan !== 'trial') {
                        <button (click)="exportDoc()" class="bg-jurist-orange text-white px-6 py-2 rounded-lg hover:bg-jurist-orangeHover transition-colors flex items-center gap-2 text-sm font-sans font-bold shadow-lg">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                          Export DOCX
                        </button>
                      }
                    </div>
                  </div>
               </div>
             } @else if (juristService.isLoading()) {
               <div class="flex flex-col items-center justify-center text-gray-500 space-y-6 py-20 border border-gray-800 rounded-xl bg-gray-900/20">
                 <div class="w-16 h-16 border-4 border-jurist-orange border-t-transparent rounded-full animate-spin"></div>
                 <div class="text-center">
                   <p class="text-lg font-bold text-white mb-1">Elaborăm Strategia...</p>
                   <p class="text-sm text-gray-400">Analizăm datele și formulăm scenariile. Vă rugăm așteptați câteva secunde...</p>
                 </div>
               </div>
             } @else {
               <div class="flex flex-col items-center justify-center text-gray-600 opacity-40 py-20 border border-dashed border-gray-800 rounded-xl">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" class="w-24 h-24 mb-4">
                   <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
                 </svg>
                 <p class="text-lg font-medium">Raportul strategic va apărea aici.</p>
               </div>
             }
          </div>

        </div>
      </div>
    </div>
  `
})
export class StrategyComponent {
  juristService = inject(JuristService);
  authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  caseDetails = '';
  strategyResult = signal<string>('');

  isListening = signal(false);
  recognition: ISpeechRecognition | null = null;

  constructor() {
    // Lazy-loaded speech recognition initialized on-demand
  }

  isInIframe() {
    return typeof window !== 'undefined' && window.self !== window.top;
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
      this.recognition.continuous = false;
      this.recognition.interimResults = false;

      this.recognition.onstart = () => {
        this.ngZone.run(() => {
          this.isListening.set(true);
          this.cdr.detectChanges();
        });
        console.log('Strategy dictation started...');
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        this.ngZone.run(() => {
          this.caseDetails += (this.caseDetails ? ' ' : '') + transcript;
          this.cdr.detectChanges();
        });
      };

      this.recognition.onerror = (event: { error?: string }) => {
        console.error('Strategy speech error:', event.error || event);
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
        console.log('Strategy dictation ended.');
      };

      this.recognition.start();

    } catch (e) {
      console.error('Failed to initialize speech recognition:', e);
      alert('Nu s-a putut inițializa microfonul. Vă rugăm să deschideți aplicația într-o filă nouă (New Tab) pentru a acorda permisiuni direct.');
      this.isListening.set(false);
      this.cdr.detectChanges();
    }
  }

  async generate() {
    if (!this.caseDetails) return;
    this.strategyResult.set(""); // Clear previous result
    const result = await this.juristService.generateStrategy(this.caseDetails, (text) => {
      this.strategyResult.set(text);
      this.cdr.detectChanges();
    });
    this.strategyResult.set(result);
  }

  exportDoc() {
    const filenamePrompt = this.caseDetails ? `Strategie_${this.caseDetails}` : 'Strategie_Juridica';
    this.juristService.downloadDocx(this.strategyResult(), filenamePrompt);
  }
}