import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JuristService } from '../services/jurist.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen w-full flex items-center justify-center bg-[#0a0a0a] font-sans relative overflow-hidden animate-fadeIn p-4">
       <!-- Background Ambient -->
       <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

       <!-- Main Payment Card -->
       <div class="relative z-10 w-full max-w-lg bg-[#121212] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl animate-fadeIn">
          
          <!-- Header -->
          <div class="flex justify-between items-center mb-6 border-b border-gray-800 pb-5">
             <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-black border border-gray-700 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-neon">
                   <span class="text-jurist-orange">J</span>
                </div>
                <div>
                   <h1 class="font-bold text-white text-lg leading-tight">Jurist<span class="text-jurist-orange">PRO</span></h1>
                   <p class="text-xs text-gray-500">Checkout Securizat Revolut Pay</p>
                </div>
             </div>
             <div class="text-right">
                <p class="text-xs text-gray-500 uppercase font-bold tracking-wider">Total de plată</p>
                <p class="text-2xl sm:text-3xl font-bold text-white">{{ amount }} <span class="text-sm text-gray-400">RON</span></p>
             </div>
          </div>

          <!-- Order Summary -->
          <div class="bg-gray-900/50 p-4 rounded-2xl mb-6 border border-gray-800 flex items-center gap-4">
             <div class="w-11 h-11 bg-gray-800 rounded-full flex items-center justify-center text-2xl shadow-inner shrink-0">
                💎
             </div>
             <div class="min-w-0">
                <h3 class="font-bold text-white text-base sm:text-lg">Abonament {{ plan | titlecase }}</h3>
                <p class="text-xs text-gray-400">Acces complet 30 zile • Facturare securizată</p>
             </div>
          </div>

          @if (!showBillingForm()) {
            <!-- Initial Payment Options -->
            <div class="space-y-4">
               <p class="text-xs text-gray-400 font-bold uppercase ml-1">Pasul 1: Date Facturare & Consimțământ</p>
               
               <!-- Distance Contract Checkbox (Step 1) -->
               <div class="p-3.5 bg-black/60 rounded-xl border border-gray-800 space-y-2">
                 <label class="flex items-start gap-3 cursor-pointer select-none">
                   <input type="checkbox" [(ngModel)]="termsAccepted" class="mt-0.5 w-4 h-4 rounded bg-gray-900 border-gray-700 text-jurist-orange accent-jurist-orange focus:ring-jurist-orange cursor-pointer shrink-0">
                   <span class="text-xs text-gray-300 leading-snug">
                     Sunt de acord cu <button type="button" (click)="openLegalModal('terms')" class="text-jurist-orange underline hover:text-white font-semibold inline">Termenii și Condițiile</button> și <button type="button" (click)="openLegalModal('privacy')" class="text-blue-400 underline hover:text-white font-semibold inline">Politica de Confidențialitate & DPA</button>.
                   </span>
                 </label>
                 <p class="text-[11px] text-gray-500 pl-7 leading-normal">
                   Bifarea reprezintă consimțământul dvs. expres pentru constituirea contractului la distanță (conform OUG 34/2014) și executarea imediată a serviciilor digitale.
                 </p>
               </div>

               @if (!termsAccepted()) {
                 <p class="text-amber-400/90 text-xs flex items-center gap-1.5 px-2">
                   <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                   Bifați căsuța de mai sus pentru a continua spre datele de facturare.
                 </p>
               }

               <button 
                 (click)="startBillingProcess()" 
                 [disabled]="!termsAccepted()"
                 class="w-full h-14 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-black rounded-xl font-bold flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] shadow-lg relative overflow-hidden border border-gray-200"
               >
                  <div class="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-pink-500 animate-pulse"></div>
                  <span>Continuă spre Date Facturare & Plată &rarr;</span>
               </button>
            </div>
          } @else {
            <!-- Billing Form -->
            <div class="space-y-4 animate-fadeIn">
               <div class="flex items-center justify-between">
                 <p class="text-xs text-jurist-orange font-bold uppercase">Pasul 2: Date Facturare</p>
                 <span class="text-[10px] text-gray-500">Contract la Distanță OUG 34/2014</span>
               </div>
               
               <div class="flex gap-4 mb-3">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="entityType" value="fizica" [(ngModel)]="billingType" class="accent-jurist-orange">
                    <span class="text-xs sm:text-sm text-gray-300">Persoană Fizică</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="entityType" value="juridica" [(ngModel)]="billingType" class="accent-jurist-orange">
                    <span class="text-xs sm:text-sm text-gray-300">Persoană Juridică / Cabinet</span>
                  </label>
               </div>

               @if (billingType === 'juridica') {
                 <div>
                   <label for="billing-company" class="block text-xs text-gray-400 mb-1">Nume Cabinet / Firmă *</label>
                   <input id="billing-company" type="text" [(ngModel)]="billingData.companyName" class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-jurist-orange outline-none" placeholder="ex: Cabinet Avocat Popescu">
                 </div>
                 <div>
                   <label for="billing-cui" class="block text-xs text-gray-400 mb-1">CUI / CIF *</label>
                   <input id="billing-cui" type="text" [(ngModel)]="billingData.cui" class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-jurist-orange outline-none" placeholder="ex: RO12345678">
                 </div>
                 <div>
                   <label for="billing-regcom" class="block text-xs text-gray-400 mb-1">Nr. Reg. Com. / Barou (Opțional)</label>
                   <input id="billing-regcom" type="text" [(ngModel)]="billingData.regCom" class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-jurist-orange outline-none" placeholder="ex: Decizia Barou 123/2020">
                 </div>
               } @else {
                 <div>
                   <label for="billing-fullname" class="block text-xs text-gray-400 mb-1">Nume Complet *</label>
                   <input id="billing-fullname" type="text" [(ngModel)]="billingData.fullName" class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-jurist-orange outline-none" placeholder="ex: Ion Popescu">
                 </div>
               }

               <div>
                 <label for="billing-address" class="block text-xs text-gray-400 mb-1">Adresă Completă *</label>
                 <textarea id="billing-address" [(ngModel)]="billingData.address" rows="2" class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-jurist-orange outline-none resize-none" placeholder="Strada, Număr, Oraș, Județ"></textarea>
               </div>

               <!-- Mandatory Un-checked Consent Checkbox in Billing Form -->
               <div class="p-3 bg-black/60 rounded-xl border border-gray-800 space-y-2">
                 <label class="flex items-start gap-2.5 cursor-pointer select-none">
                   <input type="checkbox" [(ngModel)]="termsAccepted" class="mt-0.5 w-4 h-4 rounded bg-gray-900 border-gray-700 text-jurist-orange accent-jurist-orange focus:ring-jurist-orange cursor-pointer shrink-0">
                   <span class="text-xs text-gray-300 leading-snug">
                     Confirm acordul cu <button type="button" (click)="openLegalModal('terms')" class="text-jurist-orange underline hover:text-white font-semibold inline">Termenii și Condițiile</button> și <button type="button" (click)="openLegalModal('privacy')" class="text-blue-400 underline hover:text-white font-semibold inline">Politica DPA</button> pentru încheierea contractului online.
                   </span>
                 </label>
                 <div class="text-[10px] text-gray-400 pl-6 space-y-1">
                   <p>• <strong>Confirmare pe suport durabil:</strong> Notificarea de activare și rezumatul contractului se transmit automat pe e-mail.</p>
                   <p>• <strong>Factură fiscală:</strong> Factura aferentă primei plăți va fi emisă și trimisă separat de către furnizor.</p>
                 </div>
               </div>

               @if (billingError()) {
                 <p class="text-red-500 text-xs mt-2">{{ billingError() }}</p>
               }

               <div class="flex gap-3 mt-5">
                 <button (click)="showBillingForm.set(false)" class="px-4 py-2.5 rounded-xl border border-gray-700 text-gray-300 text-sm hover:bg-gray-800 transition-colors">Înapoi</button>
                 <button 
                   (click)="processRevolutPayment()" 
                   [disabled]="processing() || !termsAccepted()" 
                   class="flex-1 bg-jurist-orange hover:bg-jurist-orangeHover disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold py-2.5 text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                 >
                   @if (processing()) {
                     <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                   }
                   Plătește prin Revolut Pay
                 </button>
               </div>
            </div>
          }

          <div class="mt-6 text-center border-t border-gray-800/60 pt-4">
             <p class="text-[11px] text-gray-500 flex items-center justify-center gap-1.5">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5 text-blue-500 shrink-0">
                 <path fill-rule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clip-rule="evenodd" />
               </svg>
               Plată securizată și procesată direct prin Revolut Pay (Criptare TLS 1.3).
             </p>
             <button (click)="cancel()" class="mt-3 text-xs text-gray-500 hover:text-white transition-colors underline">Renunță și Anulează</button>
          </div>
       </div>

       <!-- Full Screen Processing Overlay -->
       @if (processing() && !showBillingForm()) {
         <div class="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center backdrop-blur-md animate-fadeIn">
            <div class="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
            <h2 class="text-2xl font-bold text-white mb-2">Redirecționare către Revolut...</h2>
            <p class="text-gray-400 text-sm">Vă rugăm nu închideți fereastra.</p>
         </div>
       }

       <!-- Legal Modal Viewer (For Reading Terms / Privacy in Checkout) -->
       @if (activeLegalModal()) {
         <div class="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
           <div class="bg-[#121212] border border-gray-700 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
             <div class="p-5 border-b border-gray-800 flex items-center justify-between bg-black/40">
               <div class="flex items-center gap-2">
                 <span class="text-xl">{{ activeLegalModal() === 'terms' ? '📜' : '🛡️' }}</span>
                 <h3 class="text-lg font-bold text-white">{{ activeLegalModal() === 'terms' ? 'Termeni și Condiții de Utilizare & Contract la Distanță' : 'Politica GDPR & Acordul DPA' }}</h3>
               </div>
               <button (click)="activeLegalModal.set(null)" class="text-gray-400 hover:text-white text-xl p-1 font-bold">✕</button>
             </div>
             
             <div class="flex-1 overflow-y-auto p-6 text-gray-300 text-sm leading-relaxed space-y-6">
               @if (activeLegalModal() === 'terms') {
                 <div class="space-y-4">
                   <div class="p-4 bg-jurist-orange/10 border border-jurist-orange/20 rounded-xl text-xs text-gray-300">
                     <p class="font-bold text-jurist-orange mb-1">Identificare Furnizor & Contract la Distanță (OUG 34/2014):</p>
                     <p>Furnizor: <strong>Cătălin MI SANDU</strong> (ID/CIF 54552543), Strada Înfrățirii Nr. 15, Craiova, România. E-mail: <span class="text-jurist-orange">office@juridicpro.ro</span>.</p>
                   </div>
                   
                   <h4 class="font-bold text-white text-base border-l-4 border-jurist-orange pl-3">1. Constituirea Contractului și Acordul Voluntar</h4>
                   <p class="text-xs text-gray-400">Bifarea căsuței de acceptare înainte de checkout reprezintă consimțământul expres al utilizatorului pentru încheierea valabilă a contractului la distanță. Confirmarea încheierii contractului pe suport durabil este transmisă pe adresa de e-mail a utilizatorului.</p>

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
               <button (click)="termsAccepted.set(true); activeLegalModal.set(null)" class="bg-jurist-orange hover:bg-jurist-orangeHover text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer">
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
export class PaymentComponent {
  juristService = inject(JuristService);
  authService = inject(AuthService);
  
  // State
  processing = signal(false);
  showBillingForm = signal(false);
  billingError = signal('');
  termsAccepted = signal(false); // Explicit un-checked by default
  activeLegalModal = signal<'terms' | 'privacy' | null>(null);

  billingType: 'fizica' | 'juridica' = 'juridica';
  billingData = {
    companyName: '',
    cui: '',
    regCom: '',
    fullName: '',
    address: ''
  };

  get plan() { return this.authService.currentUser()?.plan || 'expert'; }
  get amount() { return this.plan === 'gold' ? 500 : 200; }

  openLegalModal(type: 'terms' | 'privacy') {
    this.activeLegalModal.set(type);
  }

  startBillingProcess() {
    if (!this.termsAccepted()) {
      this.billingError.set('Trebuie să acceptați Termenii și Condițiile pentru a continua.');
      return;
    }
    this.showBillingForm.set(true);
    this.billingError.set('');
    // Pre-fill name if individual
    if (!this.billingData.fullName) {
      this.billingData.fullName = this.authService.currentUser()?.fullName || '';
    }
  }

  async processRevolutPayment() {
    this.billingError.set('');

    if (!this.termsAccepted()) {
      this.billingError.set('Trebuie să bifați acceptarea Termenilor și Condițiilor și a Politicii DPA conform OUG 34/2014.');
      return;
    }

    // Validation
    if (this.billingType === 'juridica') {
      if (!this.billingData.companyName.trim() || !this.billingData.cui.trim() || !this.billingData.address.trim()) {
        this.billingError.set('Vă rugăm completați Numele Cabinetului, CUI-ul și Adresa.');
        return;
      }
    } else {
      if (!this.billingData.fullName.trim() || !this.billingData.address.trim()) {
        this.billingError.set('Vă rugăm completați Numele și Adresa.');
        return;
      }
    }

    this.processing.set(true);
    
    const user = this.authService.currentUser();
    if (user) {
      const finalBillingData = {
        type: this.billingType,
        name: this.billingType === 'juridica' ? this.billingData.companyName : this.billingData.fullName,
        cui: this.billingType === 'juridica' ? this.billingData.cui : null,
        regCom: this.billingType === 'juridica' ? this.billingData.regCom : null,
        address: this.billingData.address
      };
      
      // Do not await this to prevent popup blocker in the subsequent calls
      this.authService.updateBillingData(user.id, finalBillingData).catch(console.error);
    }

    await this.juristService.upgradePlan(this.plan);
    this.processing.set(false);
  }

  cancel() {
    this.authService.logout();
    this.juristService.setModule('landing');
  }
}