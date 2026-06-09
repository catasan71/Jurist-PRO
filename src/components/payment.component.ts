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
    <div class="min-h-screen w-full flex items-center justify-center bg-[#0a0a0a] font-sans relative overflow-hidden animate-fadeIn">
       <!-- Background Ambient -->
       <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

       <!-- Main Payment Card -->
       <div class="relative z-10 w-full max-w-lg bg-[#121212] border border-gray-800 rounded-3xl p-8 shadow-2xl animate-fadeIn">
          
          <!-- Header -->
          <div class="flex justify-between items-center mb-8 border-b border-gray-800 pb-6 mt-2">
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
                <p class="text-3xl font-bold text-white">{{ amount }} <span class="text-sm text-gray-400">RON</span></p>
             </div>
          </div>

          <!-- Order Summary -->
          <div class="bg-gray-900/50 p-5 rounded-2xl mb-8 border border-gray-800 flex items-center gap-4">
             <div class="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center text-2xl shadow-inner">
                💎
             </div>
             <div>
                <h3 class="font-bold text-white text-lg">Abonament {{ plan | titlecase }}</h3>
                <p class="text-sm text-gray-400">Acces complet 30 zile • Facturare securizată</p>
             </div>
          </div>

          @if (!showBillingForm()) {
            <!-- Initial Payment Options -->
            <div class="space-y-4">
               <p class="text-xs text-gray-500 font-bold uppercase ml-1 mb-2">Finalizare Plată</p>
               
               <button (click)="startBillingProcess()" class="w-full h-14 bg-white hover:bg-gray-100 text-black rounded-xl font-bold flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] shadow-lg relative overflow-hidden border border-gray-200">
                  <div class="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-pink-500 animate-pulse"></div>
                  <span>Plătește prin <span class="font-black text-[#131118]">Revolut</span> <strong class="text-blue-600 font-black italic">Pay</strong></span>
               </button>
            </div>
          } @else {
            <!-- Billing Form -->
            <div class="space-y-4 animate-fadeIn">
               <p class="text-xs text-jurist-orange font-bold uppercase ml-1 mb-2">Date Facturare</p>
               
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
                   <label for="billing-company" class="block text-xs text-gray-400 mb-1">Nume Cabinet / Firmă *</label>
                   <input id="billing-company" type="text" [(ngModel)]="billingData.companyName" class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-jurist-orange outline-none" placeholder="ex: Cabinet Avocat Popescu">
                 </div>
                 <div>
                   <label for="billing-cui" class="block text-xs text-gray-400 mb-1">CUI / CIF *</label>
                   <input id="billing-cui" type="text" [(ngModel)]="billingData.cui" class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-jurist-orange outline-none" placeholder="ex: RO12345678">
                 </div>
                 <div>
                   <label for="billing-regcom" class="block text-xs text-gray-400 mb-1">Nr. Reg. Com. (Opțional)</label>
                   <input id="billing-regcom" type="text" [(ngModel)]="billingData.regCom" class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-jurist-orange outline-none" placeholder="ex: J40/1234/2020">
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

               @if (billingError()) {
                 <p class="text-red-500 text-xs mt-2">{{ billingError() }}</p>
               }

               <div class="flex gap-3 mt-6">
                 <button (click)="showBillingForm.set(false)" class="px-4 py-2.5 rounded-xl border border-gray-700 text-gray-300 text-sm hover:bg-gray-800 transition-colors">Înapoi</button>
                 <button (click)="processRevolutPayment()" [disabled]="processing()" class="flex-1 bg-jurist-orange hover:bg-jurist-orangeHover text-white rounded-xl font-bold py-2.5 text-sm transition-all shadow-lg flex items-center justify-center gap-2">
                   @if (processing()) {
                     <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                   }
                   Continuă spre Plată
                 </button>
               </div>
            </div>
          }

          <div class="mt-8 text-center">
             <p class="text-[10px] text-gray-600 flex items-center justify-center gap-1.5">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3 text-blue-500">
                 <path fill-rule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clip-rule="evenodd" />
               </svg>
               Plată securizată și procesată direct prin Revolut Pay.
             </p>
             <button (click)="cancel()" class="mt-4 text-xs text-gray-600 hover:text-white transition-colors underline">Renunță și Anulează</button>
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

  startBillingProcess() {
    this.showBillingForm.set(true);
    this.billingError.set('');
    // Pre-fill name if individual
    if (!this.billingData.fullName) {
      this.billingData.fullName = this.authService.currentUser()?.fullName || '';
    }
  }

  async processRevolutPayment() {
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

    this.juristService.upgradePlan(this.plan);
    this.processing.set(false);
  }

  cancel() {
    this.authService.logout();
    this.juristService.setModule('landing');
  }
}