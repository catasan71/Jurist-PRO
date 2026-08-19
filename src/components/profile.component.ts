import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JuristService, CabinetProfile } from '../services/jurist.service';
import { AuthService, UserConsents } from '../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col bg-jurist-card rounded-xl border border-gray-800 shadow-neon overflow-hidden animate-fadeIn">
      <div class="p-6 border-b border-gray-800 bg-jurist-dark">
        <h2 class="text-2xl font-bold text-jurist-orange mb-1">Profil Cabinet & Setări</h2>
        <p class="text-sm text-gray-400">Administrează datele cabinetului, abonamentul și preferințele de confidențialitate.</p>
      </div>

      <div class="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full relative animate-slideUp">
        @if (saving()) {
           <div class="absolute inset-0 bg-black/60 z-10 flex items-center justify-center rounded-xl">
             <div class="flex flex-col items-center gap-4">
                 <div class="w-10 h-10 border-4 border-jurist-orange border-t-transparent rounded-full animate-spin"></div>
                 <span class="text-white font-bold">Se salvează modificările...</span>
             </div>
           </div>
        }

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            <!-- COLUMN 1: Cabinet Data -->
            <div class="bg-gray-900/50 p-6 rounded-xl border border-gray-700 space-y-5 h-fit">
              <h3 class="text-lg font-bold text-white border-b border-gray-700 pb-2 mb-4">Date de Identificare</h3>
              
              <div>
                <span class="block text-xs font-bold text-gray-500 uppercase mb-1">Denumire Formă Exercitare</span>
                <input [(ngModel)]="formData.name" placeholder="Cabinet de Avocat 'Popescu Ion'" class="w-full bg-black border border-gray-600 rounded p-3 text-white focus:border-jurist-orange transition-colors">
              </div>
              
              <div>
                <span class="block text-xs font-bold text-gray-500 uppercase mb-1">Nume Avocat Titular</span>
                <input [(ngModel)]="formData.lawyerName" placeholder="Av. Popescu Ion" class="w-full bg-black border border-gray-600 rounded p-3 text-white focus:border-jurist-orange transition-colors">
              </div>

              <div class="grid grid-cols-2 gap-4">
                  <div>
                    <span class="block text-xs font-bold text-gray-500 uppercase mb-1">Baroul / Decizia</span>
                    <input [(ngModel)]="formData.barId" placeholder="Baroul București..." class="w-full bg-black border border-gray-600 rounded p-3 text-white focus:border-jurist-orange transition-colors">
                  </div>

                  <div>
                    <span class="block text-xs font-bold text-gray-500 uppercase mb-1">CIF / CUI</span>
                    <input [(ngModel)]="formData.cif" placeholder="RO 123456" class="w-full bg-black border border-gray-600 rounded p-3 text-white focus:border-jurist-orange transition-colors">
                  </div>
              </div>

              <div>
                <span class="block text-xs font-bold text-gray-500 uppercase mb-1">Sediu Profesional</span>
                <textarea [(ngModel)]="formData.address" rows="3" placeholder="Str. Justiției nr. 1..." class="w-full bg-black border border-gray-600 rounded p-3 text-white focus:border-jurist-orange transition-colors resize-none"></textarea>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <span class="block text-xs font-bold text-jurist-orange uppercase mb-1 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3 h-3">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                    </svg>
                    Telefon (Alerte WhatsApp)
                  </span>
                  <input [(ngModel)]="formData.phone" placeholder="Ex: 0722 123 456" class="w-full bg-black border border-gray-600 rounded p-3 text-white focus:border-jurist-orange transition-colors">
                  <p class="text-[10px] text-gray-400 mt-1 italic leading-tight">
                    <span class="text-jurist-orange font-bold">Important:</span> Introdu numărul în format local (ex: 07...). <br>
                    Sistemul adaugă automat prefixul <span class="font-bold">+40 (România)</span> pentru alerte WhatsApp corecte.
                  </p>
                  <button 
                    (click)="testWhatsApp()"
                    class="mt-3 w-full text-xs font-bold text-center bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-gray-300 py-2.5 px-3 rounded-lg border border-gray-700 hover:border-gray-600 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-whatsapp text-gray-400" viewBox="0 0 16 16">
                      <path d="M13.601 2.326A7.85 7.85 0 0 0 8 0a7.85 7.85 0 0 0-7.85 7.85c0 1.39.363 2.748 1.053 3.96L0 16l4.288-1.124a7.9 7.9 0 0 0 3.713.92H8a7.85 7.85 0 0 0 7.85-7.85z"/>
                    </svg>
                    <span>Test WhatsApp</span>
                    <span class="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono font-medium">Momentan indisponibil</span>
                  </button>
                </div>
                <div>
                  <span class="block text-xs font-bold text-gray-500 uppercase mb-1">Email Notificări</span>
                  <input [(ngModel)]="formData.email" placeholder="contact@avocat.ro" class="w-full bg-black border border-gray-600 rounded p-3 text-white focus:border-jurist-orange transition-colors">
                </div>
              </div>
              
              <button (click)="save()" [disabled]="saving()" class="w-full mt-4 bg-jurist-orange hover:bg-jurist-orangeHover active:scale-[0.98] text-white px-8 py-3 rounded-lg font-bold shadow-neon transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                 @if (saving()) {
                   <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                   Se salvează...
                 } @else {
                   <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                     <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                   </svg>
                   Salvează Profilul
                 }
              </button>

              @if (saveSuccess()) {
                <div class="mt-3 p-3 bg-green-950/60 border border-green-500/50 rounded-lg text-green-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-green-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                  <span>Profilul și datele cabinetului au fost salvate cu succes!</span>
                </div>
              }
            </div>

            <!-- COLUMN 2: Subscriptions & Privacy -->
            <div class="space-y-8">
                
                <!-- SUBSCRIPTION CARD -->
                <div class="bg-red-900/10 p-6 rounded-xl border border-red-900/50 space-y-4">
                    <h3 class="text-lg font-bold text-white flex items-center gap-2 border-b border-red-900/30 pb-2">
                        <span class="text-red-500">💳</span> Abonament
                    </h3>
                    
                    <div class="flex items-center justify-between bg-black/40 p-4 rounded-lg border border-gray-800">
                        <div>
                            <p class="text-xs text-gray-500 uppercase font-bold">Plan Actual</p>
                            <p class="text-white font-bold text-lg">{{ userPlan() | titlecase }}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-xs text-gray-500 uppercase font-bold">Status</p>
                            <p class="text-green-400 font-bold">Activ</p>
                        </div>
                    </div>

                    @if (userPlan() !== 'trial') {
                        <div class="text-right">
                            <button (click)="cancelSubscription()" class="text-red-400 hover:text-white text-xs underline font-bold transition-all">
                                Anulează Reînnoirea Automată
                            </button>
                        </div>
                    } @else {
                        <button (click)="goToPricing()" class="w-full bg-gray-800 hover:bg-gray-700 text-white py-2 rounded border border-gray-600 text-sm font-bold transition-colors">
                            Upgrade la Premium &rarr;
                        </button>
                    }
                </div>

                <!-- PRIVACY CENTER (NEW) -->
                <div class="bg-blue-900/10 p-6 rounded-xl border border-blue-900/50 space-y-4">
                    <h3 class="text-lg font-bold text-white flex items-center gap-2 border-b border-blue-900/30 pb-2">
                        <span class="text-blue-400">🔒</span> Centru de Confidențialitate
                    </h3>
                    
                    <p class="text-xs text-gray-400">Gestionează acordurile și permisiunile acordate platformei.</p>
                    
                    <div class="space-y-3">
                        
                        <!-- 1. Terms (Read Only) -->
                        <div class="flex items-center justify-between p-3 bg-black/40 rounded border border-gray-800 opacity-70">
                            <div>
                                <p class="text-sm text-gray-300 font-bold">Termeni și Condiții</p>
                                <p class="text-[10px] text-gray-500">Acceptat la înregistrare</p>
                            </div>
                            <div class="flex items-center gap-2 text-green-500 text-xs font-bold">
                                <span>✓ ACCEPTAT</span>
                            </div>
                        </div>

                        <!-- 2. GDPR (Read Only) -->
                        <div class="flex items-center justify-between p-3 bg-black/40 rounded border border-gray-800 opacity-70">
                            <div>
                                <p class="text-sm text-gray-300 font-bold">Politica GDPR</p>
                                <p class="text-[10px] text-gray-500">Prelucrare date contractuală</p>
                            </div>
                            <div class="flex items-center gap-2 text-green-500 text-xs font-bold">
                                <span>✓ ACCEPTAT</span>
                            </div>
                        </div>

                        <!-- 3. Marketing (Toggle) -->
                        <div class="flex items-center justify-between p-3 bg-black/40 rounded border border-gray-800">
                            <div>
                                <p class="text-sm text-white font-bold">Comunicări Marketing</p>
                                <p class="text-[10px] text-gray-400">Newsletter și oferte promoționale</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" [(ngModel)]="consents.marketing" (change)="saveConsents()" class="sr-only peer">
                                <div class="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        <!-- 4. Tracking/Cookies (Toggle) -->
                        <div class="flex items-center justify-between p-3 bg-black/40 rounded border border-gray-800">
                            <div>
                                <p class="text-sm text-white font-bold">Cookie-uri Analitice</p>
                                <p class="text-[10px] text-gray-400">Îmbunătățire experiență utilizare</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" [(ngModel)]="consents.tracking" (change)="saveConsents()" class="sr-only peer">
                                <div class="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                    </div>
                </div>

            </div>

        </div>
      </div>
    </div>
  `
})
export class ProfileComponent {
  juristService = inject(JuristService);
  authService = inject(AuthService);
  saving = signal(false);
  saveSuccess = signal(false);
  testingWhatsApp = signal(false);
  
  // Clone current profile to form data
  formData: CabinetProfile = { ...this.juristService.profile() };
  private userHasEdited = false;
  
  // Consents State
  consents: UserConsents = {
      terms: true,
      gdpr: true,
      marketing: false,
      tracking: false
  };

  constructor() {
      // Sync incoming profile data from Cloud if user hasn't typed over it yet
      effect(() => {
          const profile = this.juristService.profile();
          if (!this.userHasEdited && (profile.name || profile.lawyerName || profile.phone || profile.cif || profile.address || profile.email || profile.barId)) {
              this.formData = { ...profile };
          }
      });

      // Initialize consents from Auth Service or Local Storage
      effect(() => {
          const user = this.authService.currentUser();
          if (user?.consents) {
              this.consents = { ...user.consents };
          }
          
          // Sync tracking with LocalStorage if available
          const localConsent = localStorage.getItem('juristpro_consent');
          if (localConsent === 'true') {
              this.consents.tracking = true;
          }
      });
  }

  // Helper for Plan
  userPlan = computed(() => this.authService.currentUser()?.plan || 'trial');

  async save() {
    this.saving.set(true);
    this.saveSuccess.set(false);
    this.userHasEdited = true;
    
    // Save both Profile and Consents
    const success = await this.juristService.updateProfile(this.formData, this.consents);
    this.saving.set(false);
    
    if (success) {
      this.saveSuccess.set(true);
      setTimeout(() => {
        this.saveSuccess.set(false);
      }, 5000);
    }
  }
  
  async saveConsents() {
      // Auto-save when toggles change
      // Update local storage for tracking
      if (this.consents.tracking) {
          localStorage.setItem('juristpro_consent', 'true');
      } else {
          localStorage.removeItem('juristpro_consent');
      }

      await this.juristService.updateProfile(this.formData, this.consents);
  }

  async cancelSubscription() {
    // Replaced confirm with direct action due to iframe restrictions
    this.saving.set(true);
    const success = await this.juristService.cancelSubscription();
    this.saving.set(false);
       
    if (!success) {
      console.warn("Eroare la accesarea portalului. Vă rugăm contactați suportul.");
    }
  }

  goToPricing() {
    this.juristService.setModule('pricing');
  }

  testWhatsApp() {
    this.juristService.notificationService.info('Serviciul de alerte WhatsApp este momentan indisponibil.');
  }
}