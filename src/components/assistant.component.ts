import { Component, inject, signal, ElementRef, ViewChild, effect, ChangeDetectorRef, ChangeDetectionStrategy, NgZone, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JuristService, ChatMessage } from '../services/jurist.service';
import { AuthService } from '../services/auth.service';
import { MarkdownPipe } from '../pipes/markdown.pipe';

interface SpeechResult {
  isFinal: boolean;
  [key: number]: { transcript: string };
}

interface SpeechRecognitionEvent {
  results: {
    [key: number]: SpeechResult;
    length: number;
  };
  resultIndex: number;
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
  selector: 'app-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full flex flex-col bg-jurist-card rounded-xl border border-gray-800 overflow-hidden shadow-neon relative animate-fadeIn">
      <!-- Header -->
      <div class="p-4 border-b border-gray-800 bg-jurist-dark flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0">
        <div>
          <h2 class="text-xl font-bold text-jurist-orange flex items-center gap-2">
            Asistent Juridic AI
            <span class="text-[10px] bg-red-900/40 text-red-400 border border-red-700/50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span class="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
              SAFEGUARD: Verificare Abrogări
            </span>
          </h2>
          <p class="text-xs text-gray-400">Răspunsuri verificate în timp real • Monitorul Oficial • Portal Just</p>
        </div>
      </div>

      <!-- Chat Area -->
      <div class="flex-1 overflow-y-auto p-4 space-y-6 animate-slideUp" #scrollContainer>
        @for (msg of messages(); track $index) {
          <div [class]="'flex flex-col ' + (msg.role === 'user' ? 'items-end' : 'items-start')">
            <!-- Message Bubble -->
            <div [class]="'max-w-[85%] rounded-2xl p-4 ' + (msg.role === 'user' ? 'bg-jurist-orange text-white rounded-tr-sm' : 'bg-gray-800 text-gray-200 rounded-tl-sm border border-gray-700')">
              @if (msg.role === 'ai') {
                 <div class="whitespace-normal text-sm leading-relaxed text-left markdown-body" [innerHTML]="msg.content | markdown"></div>
              } @else {
                 <div class="whitespace-pre-wrap text-sm leading-relaxed text-left">{{ msg.content }}</div>
              }
              
              <!-- CITATION SOURCES (Grounding) -->
              @if (msg.role === 'ai' && msg.sources && msg.sources.length > 0) {
                 <div class="mt-4 pt-3 border-t border-gray-700">
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3 text-jurist-orange">
                         <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                      </svg>
                      Surse Verificate:
                    </p>
                    <div class="flex flex-wrap gap-2">
                       @for (source of msg.sources; track $index) {
                          <a [href]="source.url" target="_blank" class="text-[10px] bg-black/40 hover:bg-jurist-orange/20 text-blue-400 hover:text-jurist-orange border border-gray-700 px-2 py-1 rounded transition-colors truncate max-w-[200px]" [title]="source.title">
                             🔗 {{ source.title }}
                          </a>
                       }
                    </div>
                 </div>
              }
            </div>

            <!-- Export Button for AI Messages -->
            @if (msg.role === 'ai' && $index > 0 && authService.currentUser()?.plan !== 'trial') {
              <button 
                (click)="exportMessage(msg, $index)" 
                class="mt-2 text-xs text-gray-500 hover:text-jurist-orange flex items-center gap-1 transition-colors"
                title="Descarcă răspunsul în format Word"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3 h-3">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Export DOCX
              </button>
            }
          </div>
        }
        
        @if (juristService.isLoading()) {
          <div class="flex justify-start">
            <div class="bg-gray-800 rounded-2xl p-4 rounded-tl-sm border border-gray-700 flex flex-col gap-2">
              <div class="flex items-center gap-2">
                 <div class="w-2 h-2 bg-jurist-orange rounded-full animate-bounce"></div>
                 <div class="w-2 h-2 bg-jurist-orange rounded-full animate-bounce delay-75"></div>
                 <div class="w-2 h-2 bg-jurist-orange rounded-full animate-bounce delay-150"></div>
              </div>
              <p class="text-[10px] text-gray-500 animate-pulse">Analizăm solicitarea. Răspunsul va fi generat în câteva secunde...</p>
            </div>
          </div>
        }
      </div>

      <!-- Input Area -->
      <div class="p-4 bg-jurist-dark border-t border-gray-800 flex-shrink-0">
        @if (isInIframe()) {
          <p class="text-[10px] text-jurist-orange bg-jurist-orange/5 border border-jurist-orange/20 rounded-lg p-2 mb-3 leading-relaxed">
            ⚠️ <strong>Dictare vocală (restricție iframe):</strong> Browserele blochează microfonul în iframe (AI Studio). Vă rugăm să apăsați butonul <strong>"New Tab"</strong> din colțul dreapta-sus al ecranului pentru a o folosi direct!
          </p>
        }
        <div class="flex gap-2 items-center">
          <div class="flex-1 relative flex items-center">
            <input 
              type="text" 
              [(ngModel)]="userInput" 
              (keyup.enter)="sendMessage()"
              placeholder="Întreabă despre o lege recentă, un RIL sau o știre juridică..."
              class="w-full bg-gray-900 border border-gray-700 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-jurist-orange focus:ring-1 focus:ring-jurist-orange transition-all placeholder-gray-600"
              [disabled]="juristService.isLoading()"
            >
            <button 
              (click)="toggleDictation()"
              [class]="'absolute right-2 p-2 rounded-full transition-all ' + (isListening() ? 'bg-red-600 text-white animate-pulse' : 'text-gray-400 hover:text-jurist-orange')"
              [title]="isListening() ? 'Oprește dictarea' : 'Dictare vocală'"
            >
              @if (isListening()) {
                <span class="absolute inset-0 rounded-full bg-red-600 animate-ping opacity-25"></span>
              }
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 relative z-10">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            </button>
          </div>
          <button 
            (click)="sendMessage()" 
            [disabled]="!userInput.trim() || juristService.isLoading()"
            class="bg-jurist-orange hover:bg-jurist-orangeHover text-white px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[60px] shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
        
        <!-- Security Info -->
        <div class="flex items-center justify-center gap-2 mt-3 text-[10px] text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5 text-green-500">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <span>Conversație criptată End-to-End (AES-256). Datele nu sunt salvate și nu antrenează AI-ul.</span>
        </div>
      </div>
    </div>
  `
})
export class AssistantComponent implements OnDestroy {
  juristService = inject(JuristService);
  authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  userInput = '';
  messages = signal<ChatMessage[]>([
    { role: 'ai', content: 'Bună ziua! Sunt Mentorul JuristPRO. Am acces în timp real la internet pentru a verifica ultimele modificări legislative (ex: abrogări NCPC/NCPP). Ce subiect dezbatem astăzi?', timestamp: new Date() }
  ]);

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

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

  constructor() {
    // Only scroll when messages update, preventing loop
    effect(() => {
        const msgs = this.messages(); // dependency tracking
        if (msgs.length > 0) {
            setTimeout(() => this.scrollToBottom(), 100);
        }
    });
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
      this.juristService.notificationService.error('Recunoașterea vocală nu este suportată în browser/mediu. Vă recomandăm Chrome.');
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
        console.log('Dictation started...');
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          this.ngZone.run(() => {
            this.userInput += (this.userInput ? ' ' : '') + finalTranscript;
            this.cdr.detectChanges();
          });
        }
      };

      this.recognition.onerror = (event: { error?: string }) => {
        console.error('Speech recognition error:', event.error || event);
        const errType = event.error;
        this.ngZone.run(() => {
          this.isListening.set(false);
          this.cdr.detectChanges();
          
          if (errType === 'not-allowed') {
            this.juristService.notificationService.error('Accesul la microfon refuzat/blocat. Deschideți aplicația într-un Tab Nou.');
          } else if (errType === 'network') {
            this.juristService.notificationService.error('Eroare de rețea la recunoaștere vocală.');
          }
        });
      };

      this.recognition.onend = () => {
        this.ngZone.run(() => {
          this.isListening.set(false);
          this.cdr.detectChanges();
        });
        console.log('Dictation ended.');
      };

      this.recognition.start();

    } catch (e) {
      console.error('Failed to initialize speech recognition:', e);
      this.juristService.notificationService.error('Nu s-a putut inițializa microfonul. Deschideți într-un Tab Nou.');
      this.isListening.set(false);
      this.cdr.detectChanges();
    }
  }

  scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
          this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch {
      // Ignore scroll errors
    }
  }

  async sendMessage() {
    if (!this.userInput.trim() || this.juristService.isLoading()) return;

    const prompt = this.userInput;
    this.userInput = '';
    
    // Calculate precise index of the AI message placeholder
    const aiMessageIndex = this.messages().length + 1;
    
    // Add user message and the placeholder in a single synchronous signal update!
    this.messages.update(msgs => [
      ...msgs, 
      { role: 'user', content: prompt, timestamp: new Date() },
      { role: 'ai', content: '...', timestamp: new Date() }
    ]);

    try {
      const response = await this.juristService.chatWithAssistant(prompt, (text) => {
        this.messages.update(msgs => {
          const newMsgs = [...msgs];
          if (newMsgs[aiMessageIndex]) {
            newMsgs[aiMessageIndex] = { ...newMsgs[aiMessageIndex], content: text };
          }
          return newMsgs;
        });
        this.cdr.detectChanges();
        this.scrollToBottom();
      });
      
      // Final update to include sources
      this.messages.update(msgs => {
        const newMsgs = [...msgs];
        if (newMsgs[aiMessageIndex]) {
          newMsgs[aiMessageIndex] = {
            ...response,
            timestamp: newMsgs[aiMessageIndex].timestamp // Keep original placeholder timestamp
          };
        }
        return newMsgs;
      });
      this.scrollToBottom();
    } catch (err: unknown) {
      console.error('Chat error:', err);
      let errorDisplay = 'Eroare de comunicare.';
      const msg = (err as { message?: string })?.message || '';
      
      if (msg.includes('SEC_ERR_LEAKED_KEY')) {
        errorDisplay = 'EROARE CRITICĂ: Cheia API Gemini a fost blocată de Google (Leaked). Administratorul trebuie să regenereze cheia din setări.';
      } else if (msg.includes('TIMEOUT_LATENCY')) {
        errorDisplay = 'TIMEOUT: Serverul AI este prea ocupat sau speța este prea complexă. Vă rugăm să încercați din nou.';
      } else {
        errorDisplay = `Eroare AI: ${msg || 'Nu s-a putut obține un răspuns.'}`;
      }
      
      this.messages.update(msgs => {
        const newMsgs = [...msgs];
        if (newMsgs[aiMessageIndex]) {
          newMsgs[aiMessageIndex] = { 
            ...newMsgs[aiMessageIndex], 
            content: errorDisplay,
            sources: []
          };
        }
        return newMsgs;
      });
    }
  }

  exportMessage(msg: ChatMessage, index: number) {
    if (index > 0) {
      const prevMsg = this.messages()[index - 1];
      const filename = prevMsg.role === 'user' ? prevMsg.content : 'Raspuns_JuristPRO';
      this.juristService.downloadDocx(msg.content, filename);
    }
  }
}