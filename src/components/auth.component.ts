import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { JuristService } from '../services/jurist.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen w-full flex items-center justify-center bg-black relative overflow-hidden font-sans animate-fadeIn">
      <!-- Background Ambient -->
      <div class="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] bg-jurist-orange/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div class="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div class="relative z-10 w-full max-w-lg sm:max-w-xl p-4 sm:p-6">
        <!-- Brand -->
        <div class="flex flex-col items-center mb-6 sm:mb-8">
          <div class="w-14 h-14 sm:w-16 sm:h-16 bg-jurist-orange rounded-xl flex items-center justify-center shadow-neon mb-3 sm:mb-4">
             <span class="text-black font-bold text-3xl sm:text-4xl">J</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-bold text-white tracking-wide">Jurist<span class="text-jurist-orange">PRO</span></h1>
          <p class="text-gray-400 mt-1 text-xs sm:text-sm font-medium">Platformă de Asistență Juridică AI</p>
        </div>

        <!-- Auth Card -->
        <div class="bg-[#121212] border border-gray-800/90 rounded-2xl p-6 sm:p-9 shadow-2xl backdrop-blur-sm relative">
          
          @if (loading()) {
            <div class="absolute inset-0 bg-black/80 z-20 flex items-center justify-center rounded-2xl flex-col gap-4">
              <div class="w-10 h-10 border-4 border-jurist-orange border-t-transparent rounded-full animate-spin"></div>
              <p class="text-jurist-orange font-bold text-sm">Se procesează...</p>
            </div>
          }

          <!-- SUCCESS MESSAGE BANNER -->
          @if (successMessage()) {
             <div class="mb-6 p-4 bg-green-900/20 border border-green-500/50 rounded-lg flex items-start gap-3 animate-fadeIn">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p class="text-green-400 text-sm font-bold">Succes</p>
                  <p class="text-green-300 text-xs mt-1 leading-relaxed whitespace-pre-line">{{ successMessage() }}</p>
                </div>
                <button (click)="successMessage.set('')" class="text-green-500 hover:text-white ml-auto">✕</button>
             </div>
          }

          <!-- ERROR MESSAGE BANNER -->
          @if (errorMessage()) {
             <div class="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg flex items-start gap-3 animate-fadeIn">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <div>
                  <p class="text-red-400 text-sm font-bold">Atenție</p>
                  <p class="text-red-300 text-xs mt-1 leading-relaxed whitespace-pre-line">{{ errorMessage() }}</p>
                </div>
                <button (click)="errorMessage.set('')" class="text-red-500 hover:text-white ml-auto">✕</button>
             </div>
          }

          <!-- Tabs -->
          <div class="flex border-b border-gray-800 mb-5 sm:mb-8">
             <button (click)="switchView('login')" [class]="'flex-1 pb-2 sm:pb-3 text-sm font-bold transition-colors ' + (view() === 'login' ? 'text-white border-b-2 border-jurist-orange' : 'text-gray-500 hover:text-gray-300')">Autentificare</button>
             <button (click)="switchView('register')" [class]="'flex-1 pb-2 sm:pb-3 text-sm font-bold transition-colors ' + (view() === 'register' ? 'text-white border-b-2 border-jurist-orange' : 'text-gray-500 hover:text-gray-300')">Înregistrare Cont</button>
          </div>

          <!-- LOGIN -->
          @if (view() === 'login') {
            <form (ngSubmit)="login()" class="space-y-3 sm:space-y-4 animate-fadeIn">
               <div>
                 <label for="email" class="block text-xs font-bold text-gray-400 mb-1 uppercase">Email</label>
                 <input id="email" name="email" type="email" [(ngModel)]="email" class="w-full bg-black border border-gray-700 rounded-lg py-2.5 px-3 sm:p-3 text-sm sm:text-base text-white focus:border-jurist-orange transition-colors" placeholder="nume@exemplu.ro">
               </div>
               <div>
                 <div class="flex justify-between items-center mb-1">
                   <label for="password" class="block text-xs font-bold text-gray-400 uppercase">Parolă</label>
                   <button type="button" (click)="switchView('forgot-password')" class="text-xs text-jurist-orange hover:text-white transition-colors">Am uitat parola</button>
                 </div>
                 <input id="password" name="password" type="password" [(ngModel)]="password" class="w-full bg-black border border-gray-700 rounded-lg py-2.5 px-3 sm:p-3 text-sm sm:text-base text-white focus:border-jurist-orange transition-colors" placeholder="••••••••">
               </div>

               <button type="submit" class="w-full bg-jurist-orange hover:bg-jurist-orangeHover text-white font-bold py-2.5 sm:py-3 rounded-xl mt-2 sm:mt-4 shadow-neon transition-all text-sm sm:text-base">
                 Intră în Cont
               </button>
               
               <div class="relative flex items-center py-3 sm:py-4">
                 <div class="flex-grow border-t border-gray-800"></div>
                 <span class="flex-shrink-0 mx-4 text-gray-500 text-xs">SAU</span>
                 <div class="flex-grow border-t border-gray-800"></div>
               </div>

               <button type="button" (click)="loginWithGoogle()" class="w-full bg-transparent border border-gray-700 hover:border-gray-500 hover:bg-gray-800/50 text-white font-bold py-2.5 sm:py-3 rounded-xl flex items-center justify-center gap-2 sm:gap-3 transition-all text-sm sm:text-base">
                 <svg class="w-5 h-5" viewBox="0 0 24 24">
                   <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                   <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                   <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                   <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                 </svg>
                 Continuă cu Google
               </button>
               
               <p class="text-[10px] text-gray-500 text-center mt-2.5 leading-tight">
                 Prin autentificare, confirmați acordul cu <button type="button" (click)="openLegalModal('terms')" class="text-gray-400 hover:text-jurist-orange underline inline cursor-pointer">Termenii</button> și <button type="button" (click)="openLegalModal('privacy')" class="text-gray-400 hover:text-jurist-orange underline inline cursor-pointer">Politica GDPR</button>.
               </p>
               
               <p class="text-center text-xs text-gray-500 mt-4">
                 Nu ai cont? <span tabindex="0" role="button" (keydown.enter)="switchView('register')" (click)="switchView('register')" class="text-jurist-orange cursor-pointer hover:underline">Creează unul acum</span>.
               </p>
            </form>
          }

          <!-- FORGOT PASSWORD -->
          @if (view() === 'forgot-password') {
            <form (ngSubmit)="resetPassword()" class="space-y-3 sm:space-y-4 animate-fadeIn">
               <p class="text-sm text-gray-400 mb-4 text-justify">Introduceți adresa de email asociată contului dumneavoastră. Vă vom trimite un link securizat pentru a vă reseta parola.</p>
               <div>
                 <label for="resetEmail" class="block text-xs font-bold text-gray-400 mb-1 uppercase">Email</label>
                 <input id="resetEmail" name="resetEmail" type="email" [(ngModel)]="email" class="w-full bg-black border border-gray-700 rounded-lg py-2.5 px-3 sm:p-3 text-sm sm:text-base text-white focus:border-jurist-orange transition-colors" placeholder="nume@exemplu.ro">
               </div>

               <button type="submit" class="w-full bg-jurist-orange hover:bg-jurist-orangeHover text-white font-bold py-2.5 sm:py-3 rounded-xl mt-2 sm:mt-4 shadow-neon transition-all text-sm sm:text-base">
                 Trimite Link Resetare
               </button>
               
               <p class="text-center text-xs text-gray-500 mt-4">
                 V-ați amintit parola? <span tabindex="0" role="button" (keydown.enter)="switchView('login')" (click)="switchView('login')" class="text-jurist-orange cursor-pointer hover:underline">Înapoi la Autentificare</span>.
               </p>
            </form>
          }

          <!-- REGISTER -->
          @if (view() === 'register') {
            <form (ngSubmit)="register()" class="space-y-3 sm:space-y-4 animate-fadeIn">
               <div>
                 <label for="fullName" class="block text-[10px] sm:text-xs font-bold text-gray-400 mb-1 uppercase">Nume Complet / Cabinet</label>
                 <input id="fullName" name="fullName" [(ngModel)]="fullName" class="w-full bg-black border border-gray-700 rounded-lg py-2 px-3 sm:p-3 text-sm sm:text-base text-white focus:border-jurist-orange transition-colors" placeholder="Av. Popescu Ion">
               </div>
               <div>
                 <label for="regEmail" class="block text-[10px] sm:text-xs font-bold text-gray-400 mb-1 uppercase">Email</label>
                 <input id="regEmail" name="regEmail" type="email" [(ngModel)]="email" class="w-full bg-black border border-gray-700 rounded-lg py-2 px-3 sm:p-3 text-sm sm:text-base text-white focus:border-jurist-orange transition-colors" placeholder="avocat@cabinet.ro">
               </div>
               <div>
                 <label for="regPassword" class="block text-[10px] sm:text-xs font-bold text-gray-400 mb-1 uppercase">Parolă</label>
                 <input id="regPassword" name="regPassword" type="password" [(ngModel)]="password" class="w-full bg-black border border-gray-700 rounded-lg py-2 px-3 sm:p-3 text-sm sm:text-base text-white focus:border-jurist-orange transition-colors" placeholder="••••••••">
               </div>
               
               <div>
                 <label for="selectedPlan" class="block text-[10px] sm:text-xs font-bold text-gray-400 mb-1 uppercase">Alege Abonament</label>
                 <select id="selectedPlan" name="selectedPlan" [(ngModel)]="selectedPlan" class="w-full bg-black border border-gray-700 rounded-lg py-2 px-3 sm:p-3 text-sm sm:text-base text-white focus:border-jurist-orange transition-colors">
                   <option value="trial">Trial (Gratuit 5 zile - 5 Credite)</option>
                   <option value="expert">Expert (200 RON/lună)</option>
                   <option value="gold">Gold (500 RON/lună)</option>
                 </select>
               </div>

               <!-- GDPR CHECKBOXES (MANDATORY) -->
               <div class="pt-2 sm:pt-3 border-t border-gray-800 space-y-2.5">
                  <div class="flex items-center justify-between text-[11px]">
                    <span class="font-bold text-gray-300">Acorduri legale obligatorii</span>
                    <span class="text-jurist-orange text-[10px]">Bifați pentru a activa contul</span>
                  </div>

                  <label class="flex items-start gap-2.5 cursor-pointer group select-none">
                     <div class="relative flex items-center mt-0.5 shrink-0">
                        <input type="checkbox" name="agreeTerms" [(ngModel)]="agreeTerms" class="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-600 bg-black checked:bg-jurist-orange checked:border-jurist-orange transition-all" />
                        <svg class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 text-black opacity-0 peer-checked:opacity-100 pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                     </div>
                     <span class="text-xs text-gray-300 group-hover:text-white">
                        Sunt de acord cu <button type="button" (click)="openLegalModal('terms')" class="text-jurist-orange underline hover:text-white cursor-pointer font-semibold inline">Termenii și Condițiile</button>.
                     </span>
                  </label>

                  <label class="flex items-start gap-2.5 cursor-pointer group select-none">
                     <div class="relative flex items-center mt-0.5 shrink-0">
                        <input type="checkbox" name="agreeGdpr" [(ngModel)]="agreeGdpr" class="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-600 bg-black checked:bg-jurist-orange checked:border-jurist-orange transition-all" />
                        <svg class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 text-black opacity-0 peer-checked:opacity-100 pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                     </div>
                     <span class="text-xs text-gray-300 group-hover:text-white leading-relaxed">
                        Confirm că am citit <button type="button" (click)="openLegalModal('privacy')" class="text-jurist-orange underline hover:text-white cursor-pointer font-semibold inline">Politica de Confidențialitate & DPA</button> și sunt de acord cu prelucrarea datelor.
                     </span>
                  </label>
               </div>

               <button type="submit" [disabled]="!agreeTerms || !agreeGdpr" class="w-full bg-jurist-orange hover:bg-jurist-orangeHover text-white font-bold py-2.5 sm:py-3 rounded-xl mt-1 sm:mt-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm sm:text-base cursor-pointer shadow-neon">
                 Creează Cont
               </button>

               <div class="relative flex items-center py-2 sm:py-3">
                 <div class="flex-grow border-t border-gray-800"></div>
                 <span class="flex-shrink-0 mx-4 text-gray-500 text-xs">SAU</span>
                 <div class="flex-grow border-t border-gray-800"></div>
               </div>

               <button type="button" (click)="loginWithGoogle()" [disabled]="!agreeTerms || !agreeGdpr" class="w-full bg-transparent border border-gray-700 hover:border-gray-500 hover:bg-gray-800/50 text-white font-bold py-2.5 sm:py-3 rounded-xl flex items-center justify-center gap-2 sm:gap-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm sm:text-base cursor-pointer">
                 <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                   <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                   <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                   <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                   <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                 </svg>
                 Continuă cu Google
               </button>

               @if (!agreeTerms || !agreeGdpr) {
                 <p class="text-[11px] text-gray-400 bg-gray-900/80 border border-gray-800 rounded-lg p-2.5 text-center mt-2.5 flex items-center justify-center gap-1.5 transition-all">
                   <span class="text-jurist-orange">ℹ️</span>
                   <span>Bifați acordul cu documentele de mai sus pentru a debloca înregistrarea (inclusiv prin Google).</span>
                 </p>
               }
            </form>
          }

        </div>
        
        <div class="text-center mt-8">
           <button (click)="goHome()" class="text-gray-500 text-sm hover:text-white transition-colors">&larr; Înapoi la Landing Page</button>
        </div>
      </div>
      <!-- Legal Modal Viewer (For Reading Terms / Privacy) -->
      @if (activeLegalModal()) {
        <div class="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div class="bg-[#121212] border border-gray-700 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-left">
            <div class="p-5 border-b border-gray-800 flex items-center justify-between bg-black/40">
              <div class="flex items-center gap-2">
                <span class="text-xl">{{ activeLegalModal() === 'terms' ? '📜' : '🛡️' }}</span>
                <h3 class="text-lg font-bold text-white">{{ activeLegalModal() === 'terms' ? 'Termeni și Condiții de Utilizare (OUG 34/2014)' : 'Politica GDPR & Acordul DPA' }}</h3>
              </div>
              <button (click)="activeLegalModal.set(null)" class="text-gray-400 hover:text-white text-xl p-1 font-bold cursor-pointer">✕</button>
            </div>
            
            <div class="flex-1 overflow-y-auto p-6 text-gray-300 text-sm leading-relaxed space-y-4">
              @if (activeLegalModal() === 'terms') {
                <div class="space-y-4">
                  <div class="p-4 bg-jurist-orange/10 border border-jurist-orange/20 rounded-xl text-xs text-gray-300">
                    <p class="font-bold text-jurist-orange mb-1">Identificare Furnizor & Contract la Distanță (OUG 34/2014):</p>
                    <p>Furnizor: <strong>Cătălin MI SANDU</strong> (ID/CIF 54552543), Strada Înfrățirii Nr. 15, Craiova, România. E-mail: <span class="text-jurist-orange">office@juridicpro.ro</span>.</p>
                  </div>
                  
                  <h4 class="font-bold text-white text-base border-l-4 border-jurist-orange pl-3">1. Constituirea Contractului și Acordul Voluntar</h4>
                  <p class="text-xs text-gray-400">Bifarea căsuței de acceptare înainte de înregistrare/checkout reprezintă consimțământul expres al utilizatorului pentru încheierea valabilă a contractului la distanță. Confirmarea încheierii contractului pe suport durabil este transmisă pe adresa de e-mail a utilizatorului.</p>

                  <h4 class="font-bold text-white text-base border-l-4 border-jurist-orange pl-3">2. Factura Fiscală</h4>
                  <p class="text-xs text-gray-400">Factura fiscală aferentă fiecărui abonament sau pachet de credite este emisă și transmisă separat de către furnizor pe adresa de e-mail specificată de utilizator în datele de facturare.</p>

                  <h4 class="font-bold text-white text-base border-l-4 border-jurist-orange pl-3">3. Furnizarea Conținutului Digital și Dreptul de Retragere</h4>
                  <p class="text-xs text-gray-400">Serviciul JuristPRO constă în acces imediat la software și conținut digital online. Conform art. 16 lit. m din OUG 34/2014, utilizatorul își exprimă acordul prealabil expres pentru începerea prestării serviciului și confirmă că ia la cunoștință faptul că își va pierde dreptul de retragere odată cu activarea serviciului.</p>

                  <h4 class="font-bold text-white text-base border-l-4 border-jurist-orange pl-3">4. Garanția Interzicerii Antrenării AI (No Training)</h4>
                  <p class="text-xs text-gray-400">Garantăm contractual că datele cabinetului, documentele încărcate și solicitările introduse NU sunt utilizate pentru antrenarea modelelor de inteligență artificială.</p>
                </div>
              } @else {
                <div class="space-y-4">
                  <div class="p-4 bg-blue-950/40 border border-blue-500/30 rounded-xl text-xs text-gray-300">
                    <p class="font-bold text-blue-400 mb-1">Acord de Prelucrare a Datelor (DPA conform Art. 28 GDPR):</p>
                    <p>JuristPRO acționează ca Persoană Împuternicită pentru datele prelucrate în numele avocatului/utilizatorului titular.</p>
                  </div>
                  
                  <h4 class="font-bold text-white text-base border-l-4 border-blue-500 pl-3">Măsuri Tehnice și de Securitate</h4>
                  <ul class="list-disc pl-5 space-y-1.5 text-xs text-gray-400">
                    <li>Criptare în tranzit TLS 1.3 și în repaus AES-256.</li>
                    <li>Găzduire exclusivă în Uniunea Europeană (Frankfurt, Germania) pe infrastructură certificată ISO 27001.</li>
                    <li>Ștergere efemeră a documentelor de analiză din memoria RAM după generare.</li>
                  </ul>
                </div>
              }
            </div>

            <div class="p-4 border-t border-gray-800 bg-black/40 flex justify-between items-center">
              <button (click)="agreeTerms = true; agreeGdpr = true; activeLegalModal.set(null)" class="bg-jurist-orange hover:bg-jurist-orangeHover text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer">
                Accept și Închide
              </button>
              <button (click)="activeLegalModal.set(null)" class="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold px-4 py-2 rounded-lg border border-gray-700 transition-colors cursor-pointer">
                Închide
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class AuthComponent {
  authService = inject(AuthService);
  juristService = inject(JuristService);

  view = signal<'login' | 'register' | 'forgot-password'>('login');
  email = '';
  password = '';
  fullName = '';
  selectedPlan: 'trial' | 'expert' | 'gold' = 'expert';
  
  agreeTerms = false;
  agreeGdpr = false;
  agreeMarketing = false;
  activeLegalModal = signal<'terms' | 'privacy' | null>(null);
  
  loading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  openLegalModal(type: 'terms' | 'privacy') {
    this.activeLegalModal.set(type);
  }

  switchView(v: 'login' | 'register' | 'forgot-password') {
      this.view.set(v);
      this.errorMessage.set('');
      this.successMessage.set('');
  }

  async login() {
    this.errorMessage.set('');
    
    // Aggressive sanitization
    const safeEmail = this.email.toLowerCase().replace(/\s+/g, '');
    const safePass = this.password.trim();

    if (!safeEmail || !safePass) {
      this.errorMessage.set("Vă rugăm să introduceți adresa de email și parola.");
      return;
    }

    this.loading.set(true);

    try {
      const result = await this.authService.login(safeEmail, safePass);
      
      if (result.error) {
        this.errorMessage.set(result.error);
        this.loading.set(false);
      } else {
        // Wait for profile to be fetched via onAuthStateChanged
        const checkInterval = setInterval(() => {
          if (this.authService.currentUser()) {
            clearInterval(checkInterval);
            clearTimeout(timeoutId);
            this.loading.set(false);
            this.redirectUser();
          }
        }, 100);
        
        // Fallback timeout
        const timeoutId = setTimeout(() => {
          clearInterval(checkInterval);
          this.loading.set(false);
          this.authService.forceFallbackUserIfAuthenticated();
          this.redirectUser();
        }, 5000);
      }
    } catch {
       this.errorMessage.set("Eroare de conexiune la server.");
       this.loading.set(false);
    }
  }

  async resetPassword() {
    this.errorMessage.set('');
    this.successMessage.set('');
    
    const safeEmail = this.email.toLowerCase().replace(/\s+/g, '');
    
    if (!safeEmail) {
      this.errorMessage.set("Vă rugăm să introduceți adresa de email pentru a reseta parola.");
      return;
    }

    this.loading.set(true);

    try {
      const result = await this.authService.resetPassword(safeEmail);
      if (result.error) {
        this.errorMessage.set(result.error);
      } else {
        this.successMessage.set("Emailul de resetare a fost trimis! Verificați inbox-ul (inclusiv folderul Spam).");
      }
    } catch {
      this.errorMessage.set("Eroare de conexiune.");
    } finally {
      this.loading.set(false);
    }
  }

  async loginWithGoogle() {
    this.errorMessage.set('');

    if (this.view() === 'register' && (!this.agreeTerms || !this.agreeGdpr)) {
      this.errorMessage.set("Pentru crearea contului este necesar să bifați acordul cu Termenii și Condițiile și Politica GDPR.");
      return;
    }

    this.loading.set(true);

    try {
      let result;
      if (this.view() === 'register') {
        result = await this.authService.loginWithGoogle(this.selectedPlan, {
          terms: this.agreeTerms,
          gdpr: this.agreeGdpr,
          marketing: this.agreeMarketing,
          tracking: true
        });
      } else {
        result = await this.authService.loginWithGoogle();
      }
      
      if (result.error) {
        this.errorMessage.set(result.error);
        this.loading.set(false);
      } else {
        // Force session refresh to ensure profile is fetched
        await this.authService.refreshSession();
        
        // Wait for profile to be fetched via onAuthStateChanged
        const checkInterval = setInterval(() => {
          if (this.authService.currentUser()) {
            clearInterval(checkInterval);
            clearTimeout(timeoutId);
            this.loading.set(false);
            this.redirectUser();
          }
        }, 100);
        
        // Fallback timeout
        const timeoutId = setTimeout(() => {
          clearInterval(checkInterval);
          this.loading.set(false);
          this.authService.forceFallbackUserIfAuthenticated();
          this.redirectUser();
        }, 5000);
      }
    } catch {
       this.errorMessage.set("Eroare de conexiune la Google.");
       this.loading.set(false);
    }
  }
  async register() {
    this.errorMessage.set('');
    
    // 1. Sanitize Aggressively: Remove ALL whitespace and lowercase it
    const safeEmail = this.email.toLowerCase().replace(/\s+/g, '');
    const safePass = this.password.trim();
    const safeName = this.fullName.trim();

    // 2. Client-Side Email Validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!safeEmail || !safePass || !safeName) {
      this.errorMessage.set("Toate câmpurile sunt obligatorii.");
      return;
    }

    if (!emailRegex.test(safeEmail)) {
        this.errorMessage.set("Formatul email-ului este invalid.\n\nAsigurați-vă că nu există spații libere și că formatul este corect (exemplu: nume@domeniu.com).");
        return;
    }

    // 3. Block problematic "test" emails
    if (safeEmail.startsWith('test@') || safeEmail.startsWith('admin@') || safeEmail.includes('example.com')) {
        this.errorMessage.set("Adresele de tip 'test@...' sau 'admin@...' sunt blocate de sistemul de securitate.\n\nVă rugăm folosiți o adresă de email reală.");
        return;
    }

    if (!this.agreeTerms || !this.agreeGdpr) {
      this.errorMessage.set("Trebuie să acceptați Termenii și Politica GDPR.");
      return;
    }

    this.loading.set(true);
    
    try {
        const result = await this.authService.register(
          safeEmail, 
          safePass, 
          safeName, 
          this.selectedPlan,
          {
            terms: this.agreeTerms,
            gdpr: this.agreeGdpr,
            marketing: this.agreeMarketing,
            tracking: true
          }
        );

        if (result.error) {
           if (result.error.includes("User already registered")) {
               this.errorMessage.set("Există deja un cont cu acest email. Vă rugăm să vă autentificați.");
           } else if (result.error.toLowerCase().includes("rate limit")) {
               this.errorMessage.set("LIMITĂ ATINSĂ: Prea multe încercări.\n\nSfat: Încercați o altă adresă de email sau așteptați 30 minute.");
           } else {
               this.errorMessage.set("Eroare la înregistrare: " + result.error);
           }
        } else {
           // SUCCESS PATH (Either Real or Bypassed)
           if (result.warning) {
             this.errorMessage.set(result.warning);
           }

           if (this.selectedPlan === 'trial') {
             if (this.authService.currentUser()) {
                 this.redirectUser();
             } else {
                 this.errorMessage.set("Cont creat! Vă rugăm verificați emailul pentru confirmare.");
                 this.view.set('login');
             }
           } else {
             if (this.authService.currentUser()) {
                 this.redirectUser();
             } else {
                 this.juristService.setModule('payment');
             }
           }
        }
    } catch {
        this.errorMessage.set("A apărut o eroare neașteptată. Verificați conexiunea.");
    } finally {
        this.loading.set(false);
    }
  }

  async redirectUser() {
    this.loading.set(true);
    const user = await this.authService.waitForProfile();
    this.loading.set(false);
    
    let isAdmin = this.authService.isAdmin();
    
    // Explicit hardcoded check just in case the signal hasn't propagated or DB update delayed:
    const adminEmails = ['catalinsandu07@gmail.com', 'admin@juristpro.ai', 'juristpro.ai@gmail.com'];
    const emailToUse = user.email ? user.email.toLowerCase().trim() : '';
    
    if (adminEmails.includes(emailToUse)) {
        isAdmin = true;
    }

    if (isAdmin) {
        this.juristService.setModule('admin-dashboard');
    } else if (user.status === 'pending_payment') {
      this.juristService.setModule('payment');
    } else {
      this.juristService.setModule('dashboard');
    }
  }

  openLegal() {
    this.juristService.setModule('landing');
  }

  goHome() {
    this.juristService.setModule('landing');
  }
}