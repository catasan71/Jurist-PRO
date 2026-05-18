import { Component, inject, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './components/sidebar.component';
import { DashboardComponent } from './components/dashboard.component';
import { AssistantComponent } from './components/assistant.component';
import { StrategyComponent } from './components/strategy.component';
import { AuditComponent } from './components/audit.component';
import { DraftingComponent } from './components/drafting.component';
import { FeesComponent } from './components/fees.component';
import { CalendarComponent } from './components/calendar.component';
import { ProfileComponent } from './components/profile.component';
import { PricingComponent } from './components/pricing.component';
import { LandingComponent } from './components/landing.component';
import { AuthComponent } from './components/auth.component';
import { PaymentComponent } from './components/payment.component';
import { AdminDashboardComponent } from './components/admin-dashboard.component';
import { GuideComponent } from './components/guide.component';
import { JuristService } from './services/jurist.service';
import { AuthService } from './services/auth.service';
import { NotificationService } from './services/notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    SidebarComponent,
    DashboardComponent, 
    AssistantComponent,
    StrategyComponent,
    AuditComponent,
    DraftingComponent,
    FeesComponent,
    CalendarComponent,
    ProfileComponent,
    PricingComponent,
    LandingComponent,
    AuthComponent,
    PaymentComponent,
    AdminDashboardComponent,
    GuideComponent
  ],
  host: {
    'class': 'block h-full w-full' 
  },
  template: `
    <!-- API KEY SELECTION MODAL -->
    @if (needsApiKey) {
      <div class="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-jurist-dark border border-gray-800 rounded-xl p-8 max-w-md w-full shadow-2xl text-center">
          <div class="w-16 h-16 bg-jurist-orange/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-jurist-orange">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-white mb-4">Configurare API Key</h2>
          <p class="text-gray-400 mb-8">
            Pentru a utiliza modelele avansate Gemini (inclusiv Gemini 3.1 Pro), trebuie să selectați o cheie API validă din proiectul dvs. Google Cloud.
            <br><br>
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" class="text-jurist-orange hover:underline">Aflați mai multe despre facturare</a>
          </p>
          <button (click)="selectApiKey()" class="w-full bg-jurist-orange text-black font-bold py-3 px-4 rounded-lg hover:bg-opacity-90 transition-colors">
            Selectează API Key
          </button>
        </div>
      </div>
    }

    <!-- TOAST NOTIFICATIONS (NEW) -->
    <div class="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
      @for (n of notificationService.notifications(); track n.id) {
        <div class="pointer-events-auto animate-slideDown shadow-2xl rounded-lg overflow-hidden flex items-center min-w-[300px] max-w-md bg-opacity-90 backdrop-blur-md"
             [class.bg-green-600]="n.type === 'success'"
             [class.bg-red-600]="n.type === 'error'"
             [class.bg-yellow-600]="n.type === 'warning'"
             [class.bg-blue-600]="n.type === 'info'">
          <div class="p-4 text-white flex-1 font-medium">
            {{ n.message }}
          </div>
          <button (click)="notificationService.remove(n.id)" class="p-4 text-white/80 hover:text-white hover:bg-black/10 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      }
    </div>

    <!-- GLOBAL SYSTEM ANNOUNCEMENT BANNER -->
    @if (juristService.announcement().active) {
       <div [class]="'w-full px-4 py-2 flex flex-col md:flex-row items-center justify-center gap-3 text-center relative z-[60] animate-slideDown shadow-lg ' + 
          (juristService.announcement().type === 'blackfriday' ? 'bg-black text-red-500 font-black border-b border-red-600' : 
           juristService.announcement().type === 'warning' ? 'bg-yellow-500 text-black font-bold' : 
           juristService.announcement().type === 'promo' ? 'bg-purple-600 text-white font-bold' : 
           'bg-blue-600 text-white font-medium')">
          
          <div class="flex items-center gap-2">
             @if(juristService.announcement().type === 'blackfriday') { <span class="animate-pulse">🔥</span> }
             @if(juristService.announcement().type === 'warning') { <span>⚠️</span> }
             <span>{{ juristService.announcement().message }}</span>
          </div>

          @if (juristService.announcement().discountCode) {
             <div class="flex items-center gap-2 bg-white/20 px-2 py-0.5 rounded border border-white/30 backdrop-blur-sm">
                <span class="text-xs uppercase opacity-80">COD:</span>
                <span class="font-mono text-sm tracking-wider select-all">{{ juristService.announcement().discountCode }}</span>
             </div>
          }

          @if (juristService.announcement().actionText) {
             <button (click)="goToPricing()" class="text-xs bg-white text-black px-3 py-1 rounded-full font-bold hover:scale-105 transition-transform">
                {{ juristService.announcement().actionText }} &rarr;
             </button>
          }
       </div>
    }

    @switch (juristService.currentModule()) {
      @case ('landing') { <app-landing></app-landing> }
      @case ('auth') { <app-auth></app-auth> }
      @case ('payment') { <app-payment></app-payment> }
      @case ('admin-dashboard') { <app-admin-dashboard></app-admin-dashboard> }
      
      @default {
        <!-- LAWYER APP LAYOUT -->
        <div class="fixed inset-0 flex h-full w-full overflow-hidden bg-black font-sans selection:bg-jurist-orange selection:text-white">
          
          <div [class]="'fixed lg:static inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 lg:transform-none bg-jurist-dark border-r border-gray-800 shadow-2xl ' + (mobileMenuOpen ? 'translate-x-0' : '-translate-x-full')">
            <app-sidebar (linkClick)="mobileMenuOpen = false"></app-sidebar>
          </div>

          <!-- Backdrop -->
          @if (mobileMenuOpen) {
            <button (click)="toggleMobileMenu()" (keydown.escape)="toggleMobileMenu()" class="fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-sm w-full h-full cursor-pointer transition-opacity duration-300" aria-label="Close menu"></button>
          }

          <!-- Main Layout (Right Side) -->
          <div class="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
            
            <!-- Mobile Header -->
            <header class="lg:hidden h-16 bg-jurist-dark border-b border-gray-800 flex items-center justify-between px-4 flex-shrink-0 shadow-md z-30 relative">
              <div class="flex items-center gap-3">
                <button (click)="toggleMobileMenu()" class="p-2 bg-gray-800 rounded-lg text-white border border-gray-700 active:scale-95 transition-transform" [attr.aria-expanded]="mobileMenuOpen" aria-label="Toggle menu">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                </button>
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 bg-jurist-orange rounded flex items-center justify-center text-black font-bold text-xs shadow-neon">J</div>
                  <span class="font-bold text-white text-lg tracking-wide">Jurist<span class="text-jurist-orange">PRO</span></span>
                </div>
              </div>

              <!-- Mobile Logout Button -->
              <button (click)="logout()" class="p-2 text-red-500 hover:text-red-400 active:scale-90 transition-all" title="Ieșire din Dashboard">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </button>
            </header>

            <!-- Main Content Area -->
            <main class="flex-1 overflow-hidden p-4 lg:p-6 relative">
              
              <!-- Content Scroll Area -->
              <div class="h-full w-full max-w-7xl mx-auto overflow-hidden relative z-10">
                @switch (juristService.currentModule()) {
                  @case ('dashboard') { <app-dashboard></app-dashboard> }
                  @case ('assistant') { <app-assistant></app-assistant> }
                  @case ('strategy') { <app-strategy></app-strategy> }
                  @case ('audit') { <app-audit></app-audit> }
                  @case ('drafting') { <app-drafting></app-drafting> }
                  @case ('fees') { <app-fees></app-fees> }
                  @case ('calendar') { <app-calendar></app-calendar> }
                  @case ('profile') { <app-profile></app-profile> }
                  @case ('pricing') { <app-pricing></app-pricing> }
                  @case ('guide') { <app-guide></app-guide> }
                }
              </div>
            </main>
          </div>

        </div>
      }
    }
  `
})
export class AppComponent implements OnInit {
  juristService = inject(JuristService);
  authService = inject(AuthService);
  notificationService = inject(NotificationService);
  mobileMenuOpen = false;

  needsApiKey = false;

  constructor() {
    effect(() => {
      const currentModule = this.juristService.currentModule();
      const currentUser = this.authService.currentUser();
      
      // Auto-redirect from Landing to Dashboard/Admin if already logged in
      if (currentModule === 'landing' && currentUser) {
        if (this.authService.isAdmin()) {
          this.juristService.setModule('admin-dashboard');
        } else if (currentUser.status === 'pending_payment') {
          this.juristService.setModule('payment');
        } else {
          this.juristService.setModule('dashboard');
        }
      }

      // Auto-redirect to landing if not authenticated and trying to access protected routes
      if (!currentUser && currentModule !== 'landing' && currentModule !== 'auth' && currentModule !== 'pricing') {
         this.juristService.setModule('landing');
      }

      if (currentModule === 'payment' && currentUser?.status === 'active') {
        this.juristService.setModule('dashboard');
      }

      if ((currentModule === 'dashboard' || currentModule === 'payment') && this.authService.isAdmin()) {
        this.juristService.setModule('admin-dashboard');
      }
    });

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get('payment');
      if (paymentStatus === 'success') {
        this.notificationService.success('Plata a fost procesată cu succes!');
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (paymentStatus === 'cancelled') {
        this.notificationService.error('Plata a fost anulată.');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }

  async ngOnInit() {
    if (typeof window !== 'undefined' && window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      this.needsApiKey = !hasKey;
    }
  }

  async selectApiKey() {
    if (typeof window !== 'undefined' && window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        // Assuming success after the dialog closes
        this.needsApiKey = false;
        // Reload the page to ensure the new API key is picked up by the server/client
        window.location.reload();
      } catch (e) {
        console.error('Failed to select API key:', e);
        this.notificationService.error('Eroare la selectarea cheii API.');
      }
    }
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  async logout() {
    await this.authService.logout();
    this.juristService.setModule('landing');
  }

  goToPricing() {
    this.juristService.setModule('pricing');
  }
}
