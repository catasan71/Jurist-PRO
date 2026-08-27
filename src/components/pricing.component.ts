import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JuristService, PlanType } from '../services/jurist.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col items-center justify-start p-6 bg-jurist-black overflow-y-auto animate-fadeIn relative scroll-smooth">
      
      @if (authService.currentUser()?.credits !== undefined && (authService.currentUser()?.credits ?? 0) < 5 && authService.currentUser()?.plan !== 'trial') {
        <div class="w-full max-w-6xl bg-red-950/40 border border-red-500/30 rounded-2xl p-6 mb-8 mt-4 flex flex-col md:flex-row items-center justify-between animate-slideUp">
           <div class="text-left mb-4 md:mb-0">
             <h3 class="text-xl font-bold text-red-400 mb-1 flex items-center gap-2"><span class="text-2xl">⚠️</span> Ați epuizat creditele incluse în abonament</h3>
             <p class="text-red-200/70 text-sm">Pentru a putea continua să generați documente și strategii, achiziționați un pachet de credite Top-Up.</p>
           </div>
           <button (click)="scrollToTopUp()" class="px-6 py-3 bg-red-600/90 text-white font-bold rounded-xl hover:bg-red-500 transition-colors shadow-lg whitespace-nowrap mt-2 md:mt-0">Cumpără Credite Top-Up</button>
        </div>
      }

      <!-- Subscription Section -->
      <div class="text-center mb-12 mt-8">
        <h2 class="text-4xl font-bold text-white mb-4">Alege Abonamentul <span class="text-jurist-orange">JuristPRO</span></h2>
        <p class="text-gray-400 max-w-lg mx-auto">Investește în eficiența ta juridică. Deblochează puterea completă a AI-ului juridic.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full mb-20 animate-slideUp">
        <!-- Trial -->
        <div class="bg-gray-900 rounded-2xl p-8 border border-gray-800 hover:border-gray-600 transition-all flex flex-col">
          <h3 class="text-xl font-bold text-white">Trial</h3>
          <div class="my-4"><span class="text-3xl font-bold text-white">GRATUIT</span></div>
          <p class="text-gray-400 text-sm mb-6">Testează platforma timp de 5 zile.</p>
          <ul class="space-y-3 mb-8 flex-1">
            <li class="flex items-center text-sm text-gray-300"><span class="text-jurist-orange mr-2">✓</span> 5 Credite AI</li>
            <li class="flex items-center text-sm text-gray-300"><span class="text-jurist-orange mr-2">✓</span> Acces Asistent AI</li>
            <li class="flex items-center text-sm text-gray-300"><span class="text-gray-600 mr-2">✕</span> Fără Export DOCX</li>
            <li class="flex items-center text-sm text-gray-300"><span class="text-gray-600 mr-2">✕</span> Fără Strategie Avansată</li>
            <li class="flex items-center text-sm text-gray-300"><span class="text-gray-600 mr-2">✕</span> Fără Pachete Top-Up</li>
          </ul>
          <button (click)="selectPlan('trial')" class="w-full py-3 rounded-xl border border-gray-600 text-white hover:bg-gray-800 transition-colors">Alege Trial</button>
        </div>

        <!-- Expert -->
        <div class="bg-gray-900 rounded-2xl p-8 border-2 border-jurist-orange shadow-neon transform scale-105 flex flex-col relative z-10">
          <div class="absolute top-0 right-0 bg-jurist-orange text-black text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">RECOMANDAT</div>
          <h3 class="text-xl font-bold text-white">Expert</h3>
          <div class="my-4"><span class="text-3xl font-bold text-white">200 RON</span> <span class="text-gray-500">/ lună</span></div>
          <p class="text-gray-400 text-sm mb-6">Pentru cabinete individuale.</p>
          <ul class="space-y-3 mb-8 flex-1">
            <li class="flex items-center text-sm text-gray-300"><span class="text-jurist-orange mr-2">✓</span> 150 Credite AI / lună</li>
            <li class="flex items-center text-sm text-gray-300"><span class="text-jurist-orange mr-2">✓</span> Strategie Completă</li>
            <li class="flex items-center text-sm text-gray-300"><span class="text-jurist-orange mr-2">✓</span> Export DOCX Inclus</li>
            <li class="flex items-center text-sm text-gray-300"><span class="text-jurist-orange mr-2">✓</span> Analiză Documente (OCR)</li>
          </ul>
          <button (click)="selectPlan('expert')" class="w-full py-3 rounded-xl bg-jurist-orange text-white font-bold hover:bg-jurist-orangeHover transition-colors shadow-lg">Activează Expert</button>
        </div>

        <!-- Gold -->
        <div class="bg-gradient-to-b from-[#18160e] to-gray-900 rounded-2xl p-8 border-2 border-amber-500/50 hover:border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.1)] transition-all flex flex-col relative overflow-hidden">
          <div class="absolute top-0 right-0 bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-xs font-black px-3.5 py-1 rounded-bl-lg tracking-wider uppercase shadow-md">VIP</div>
          <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-600 via-amber-400 to-yellow-300"></div>
          <h3 class="text-2xl font-black text-amber-300">Gold</h3>
          <div class="my-4"><span class="text-3xl font-black text-white">500 RON</span> <span class="text-amber-200/80 font-semibold">/ lună</span></div>
          <p class="text-gray-300 text-sm mb-6 font-medium">Pentru elită și case de avocatură.</p>
          <ul class="space-y-3 mb-8 flex-1">
            <li class="flex items-center text-sm text-white font-medium"><span class="text-amber-400 mr-2 font-bold text-base">✓</span> 500 Credite AI / lună</li>
            <li class="flex items-center text-sm text-white font-medium"><span class="text-amber-400 mr-2 font-bold text-base">✓</span> Export DOCX Nelimitat</li>
            <li class="flex items-center text-sm text-white font-medium"><span class="text-amber-400 mr-2 font-bold text-base">✓</span> Formular Contact Expert</li>
            <li class="flex items-center text-sm text-white font-medium"><span class="text-amber-400 mr-2 font-bold text-base">✓</span> Suport Prioritar Dedicat</li>
          </ul>
          <button (click)="selectPlan('gold')" class="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:brightness-110 active:scale-98 text-black font-black shadow-lg transition-all">Alege Gold</button>
        </div>
      </div>

      <!-- Credit Consumption Explanation Card -->
      <div class="w-full max-w-6xl bg-gray-900/40 border border-gray-800 rounded-2xl p-6 md:p-8 mt-2">
        <div class="flex flex-col md:flex-row gap-6 items-center">
          <div class="shrink-0 w-12 h-12 bg-jurist-orange/20 rounded-xl flex items-center justify-center text-jurist-orange">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
          </div>
          <div class="flex-1 w-full">
            <h4 class="text-base md:text-lg font-bold text-white mb-1">Ghid Transparent: Consum Credite per Operațiune</h4>
            <p class="text-gray-400 text-xs md:text-sm mb-4">Fiecare modul consumă un număr exact de credite, proporțional cu volumul de procesare AI și complexitatea juridică:</p>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div class="bg-black/60 p-3 rounded-xl border border-gray-800">
                <span class="text-jurist-orange font-bold text-base block">1 Credit</span>
                <span class="text-[11px] text-gray-300 font-medium">Asistent Chat / Termene</span>
              </div>
              <div class="bg-black/60 p-3 rounded-xl border border-gray-800">
                <span class="text-jurist-orange font-bold text-base block">3 Credite</span>
                <span class="text-[11px] text-gray-300 font-medium">Redactare Documente</span>
              </div>
              <div class="bg-black/60 p-3 rounded-xl border border-gray-800">
                <span class="text-jurist-orange font-bold text-base block">2 Credite</span>
                <span class="text-[11px] text-gray-300 font-medium">Calcul Taxe & Deviz</span>
              </div>
              <div class="bg-black/60 p-3 rounded-xl border border-gray-800">
                <span class="text-jurist-orange font-bold text-base block">5 Credite</span>
                <span class="text-[11px] text-gray-300 font-medium">Strategie / Audit Probe</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Top-Up Section -->
      <div id="topup-section" class="w-full max-w-6xl border-t border-gray-800 pt-16">
        <div class="text-center mb-12">
           <h2 class="text-3xl font-bold text-white mb-4">Reîncărcare Credite <span class="text-purple-500">(Top-Up)</span></h2>
           <p class="text-gray-400 max-w-lg mx-auto">Ai nevoie de mai mult? Adaugă pachete de credite <strong class="text-white">PERMANENTE</strong>. Acestea nu expiră la finalul lunii și se consumă doar după terminarea abonamentului.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
           @for (pack of juristService.topUpPackages(); track pack.id) {
             <div class="bg-gray-900/50 rounded-xl p-6 border border-gray-700 hover:border-purple-500 transition-all flex items-center justify-between group relative overflow-hidden">
                <div class="absolute inset-0 bg-purple-500/5 group-hover:bg-purple-500/10 transition-colors"></div>
                <div class="relative z-10">
                  <h4 class="text-lg font-bold text-white mb-1">{{ pack.name }}</h4>
                  <p class="text-purple-400 font-bold text-2xl">{{ pack.credits }} Credite AI</p>
                </div>
                <button 
                  (click)="buyTopUp(pack.price)" 
                  [disabled]="authService.currentUser()?.plan === 'trial'"
                  class="relative z-10 bg-gray-800 text-white px-6 py-3 rounded-lg font-bold border border-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-800 disabled:hover:border-gray-600 [&:not(:disabled)]:hover:bg-purple-600 [&:not(:disabled)]:hover:border-purple-600"
                  [title]="authService.currentUser()?.plan === 'trial' ? 'Disponibil doar pentru abonamentele Expert sau Gold' : ''"
                >
                  {{ pack.price }} RON
                </button>
             </div>
           }
        </div>
        <p class="text-center text-xs text-gray-600 mt-6">* Creditele Top-Up sunt valabile pe viață, atâta timp cât contul este activ.</p>
      </div>

      <!-- Promo Code Section -->
      <div class="w-full max-w-6xl border-t border-gray-800 pt-16 mb-16">
        <div class="bg-gray-900/50 rounded-2xl p-8 border border-gray-700 max-w-2xl mx-auto text-center">
           <h3 class="text-2xl font-bold text-white mb-4">Ai un cod promoțional?</h3>
           <p class="text-gray-400 mb-6">Introdu codul mai jos pentru a primi credite gratuite.</p>
           
           <div class="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input type="text" [(ngModel)]="promoCodeInput" class="flex-1 bg-black border border-gray-600 rounded-xl p-3 text-white uppercase font-mono text-center sm:text-left focus:border-jurist-orange outline-none transition-colors" placeholder="EX: JURIST15">
              <button (click)="redeemPromoCode()" [disabled]="isRedeemingPromo()" class="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                 @if (isRedeemingPromo()) {
                    <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                 }
                 Aplică
              </button>
           </div>
           @if (promoMessage()) {
              <p [class]="'mt-4 text-sm font-bold ' + (promoSuccess() ? 'text-green-400' : 'text-red-400')">{{ promoMessage() }}</p>
           }
        </div>
      </div>

      <!-- Billing Modal for Top-Up -->
      @if (showBillingModal()) {
        <div class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div class="bg-[#121212] border border-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 class="text-xl font-bold text-white mb-4 border-b border-gray-800 pb-3">Date Facturare</h3>
            <p class="text-sm text-gray-400 mb-6">Avem nevoie de datele de facturare pentru a procesa această plată.</p>

            <div class="space-y-4">
               <div class="flex gap-4 mb-4">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="entityType" value="fizica" [(ngModel)]="billingType" class="accent-jurist-orange">
                    <span class="text-sm text-gray-300">Persoană Fizică</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="entityType" value="juridica" [(ngModel)]="billingType" class="accent-jurist-orange">
                    <span class="text-sm text-gray-300">Persoană Juridică</span>
                  </label>
               </div>

               @if (billingType === 'juridica') {
                 <div>
                   <label for="pricing-company" class="block text-xs text-gray-400 mb-1">Nume Cabinet / Firmă *</label>
                   <input id="pricing-company" type="text" [(ngModel)]="billingData.companyName" class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-jurist-orange outline-none" placeholder="ex: Cabinet Avocat Popescu">
                 </div>
                 <div>
                   <label for="pricing-cui" class="block text-xs text-gray-400 mb-1">CUI / CIF *</label>
                   <input id="pricing-cui" type="text" [(ngModel)]="billingData.cui" class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-jurist-orange outline-none" placeholder="ex: RO12345678">
                 </div>
                 <div>
                   <label for="pricing-regcom" class="block text-xs text-gray-400 mb-1">Nr. Reg. Com. (Opțional)</label>
                   <input id="pricing-regcom" type="text" [(ngModel)]="billingData.regCom" class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-jurist-orange outline-none" placeholder="ex: J40/1234/2020">
                 </div>
               } @else {
                 <div>
                   <label for="pricing-fullname" class="block text-xs text-gray-400 mb-1">Nume Complet *</label>
                   <input id="pricing-fullname" type="text" [(ngModel)]="billingData.fullName" class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-jurist-orange outline-none" placeholder="ex: Ion Popescu">
                 </div>
               }

               <div>
                 <label for="pricing-address" class="block text-xs text-gray-400 mb-1">Adresă Completă *</label>
                 <textarea id="pricing-address" [(ngModel)]="billingData.address" rows="2" class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-jurist-orange outline-none resize-none" placeholder="Strada, Număr, Oraș, Județ"></textarea>
               </div>

               @if (billingError()) {
                 <p class="text-red-500 text-xs mt-2">{{ billingError() }}</p>
               }

               <div class="flex gap-3 mt-6">
                 <button (click)="showBillingModal.set(false)" class="px-4 py-2.5 rounded-xl border border-gray-700 text-gray-300 text-sm hover:bg-gray-800 transition-colors">Anulează</button>
                 <button (click)="processBillingAndTopUp()" [disabled]="processing()" class="flex-1 bg-jurist-orange hover:bg-jurist-orangeHover text-white rounded-xl font-bold py-2.5 text-sm transition-all shadow-lg flex items-center justify-center gap-2">
                   @if (processing()) {
                     <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                   }
                   Continuă spre Plată
                 </button>
               </div>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class PricingComponent {
  juristService = inject(JuristService);
  authService = inject(AuthService);

  showBillingModal = signal(false);
  processing = signal(false);
  billingError = signal('');
  pendingTopUpAmount = signal<number | null>(null);
  pendingPlan: PlanType | null = null;

  billingType: 'fizica' | 'juridica' = 'juridica';
  billingData = {
    companyName: '',
    cui: '',
    regCom: '',
    fullName: '',
    address: ''
  };

  scrollToTopUp() {
    const el = document.getElementById('topup-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Promo Code State
  promoCodeInput = '';
  isRedeemingPromo = signal(false);
  promoMessage = signal('');
  promoSuccess = signal(false);

  async redeemPromoCode() {
    if (!this.promoCodeInput.trim()) {
      this.promoMessage.set('Te rugăm să introduci un cod.');
      this.promoSuccess.set(false);
      return;
    }

    this.isRedeemingPromo.set(true);
    this.promoMessage.set('');
    
    const result = await this.juristService.redeemPromoCode(this.promoCodeInput.trim());
    
    this.promoSuccess.set(result.success);
    this.promoMessage.set(result.message);
    this.isRedeemingPromo.set(false);
    
    if (result.success) {
      this.promoCodeInput = '';
      setTimeout(() => this.promoMessage.set(''), 5000);
    }
  }

  async selectPlan(plan: PlanType) {
    if (plan === 'trial') {
      this.juristService.upgradePlan(plan);
      return;
    }

    const user = this.authService.currentUser();
    if (!user) return;

    if (!user.billing_data) {
      this.pendingTopUpAmount.set(null); // null means it's a subscription upgrade
      this.pendingPlan = plan;
      this.showBillingModal.set(true);
      this.billingError.set('');
      if (!this.billingData.fullName) {
        this.billingData.fullName = user.fullName || '';
      }
    } else {
      const result = await this.juristService.upgradePlan(plan);
      if (result && result.error) {
         alert(result.error);
      }
    }
  }

  async buyTopUp(amount: number) {
    const user = this.authService.currentUser();
    if (!user) return;

    if (!user.billing_data) {
      // Show billing modal if no billing data exists
      this.pendingTopUpAmount.set(amount);
      this.showBillingModal.set(true);
      this.billingError.set('');
      if (!this.billingData.fullName) {
        this.billingData.fullName = user.fullName || '';
      }
    } else {
      // Proceed directly if billing data exists
      const result = await this.juristService.purchaseTopUp(amount);
      if (result && result.error) {
         alert(result.error);
      }
    }
  }

  async processBillingAndTopUp() {
    this.billingError.set('');

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

    const amount = this.pendingTopUpAmount();
    let result: { error?: string | null } | undefined = undefined;
    
    if (amount) {
      result = await this.juristService.purchaseTopUp(amount) as { error?: string | null } | undefined;
    } else if (this.pendingPlan) {
      result = await this.juristService.upgradePlan(this.pendingPlan) as { error?: string | null } | undefined;
    }
    
    this.processing.set(false);
    if (result && result.error) {
      this.billingError.set(result.error);
    } else {
      this.showBillingModal.set(false);
    }
  }
}
