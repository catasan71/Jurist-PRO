import { Component, inject, computed, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JuristService, ModuleType } from '../services/jurist.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full flex flex-col space-y-6 overflow-y-auto pb-6 relative animate-fadeIn">
      <!-- Welcome Section -->
      <div class="flex justify-between items-end animate-slideDown">
        <div>
          <h2 class="text-3xl font-bold text-white tracking-tight">Panou de Control</h2>
          <p class="text-gray-400 mt-1">Bine ai revenit, <span class="text-jurist-orange font-bold">{{ displayName() }}</span>.</p>
        </div>
        <div class="text-right hidden sm:block">
          <p class="text-xs text-gray-500 uppercase tracking-widest font-bold">Plan Activ</p>
          <div class="flex items-center justify-end gap-2">
            <span [class]="'w-2 h-2 rounded-full ' + (juristService.plan() === 'trial' ? 'bg-blue-500 animate-pulse' : 'bg-green-500')"></span>
            <p [class]="'text-xl font-bold ' + (juristService.plan() === 'gold' ? 'text-yellow-400' : 'text-white')">{{ juristService.plan() | uppercase }}</p>
          </div>
        </div>
      </div>

      <!-- TRIAL BANNER (Only for trial users) -->
      @if (juristService.plan() === 'trial') {
        <div class="bg-blue-900/20 border border-blue-800 rounded-xl p-4 flex items-center justify-between animate-fadeIn">
           <div class="flex items-center gap-3">
             <div class="bg-blue-600/20 p-2 rounded-lg text-blue-400">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                 <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
             </div>
             <div>
               <h3 class="text-white font-bold text-sm">Cont Trial Activ</h3>
               <p class="text-gray-400 text-xs">Aveți acces limitat la {{ juristService.credits() }} credite AI. Faceți upgrade pentru acces nelimitat.</p>
             </div>
           </div>
           <button (click)="nav('pricing')" class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">
             Upgrade Acum
           </button>
         </div>
      }

      <!-- NATIVE NOTIFICATION BANNER REMOVED -->


      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-slideUp" style="animation-delay: 0.1s; animation-fill-mode: both;">
        <!-- Card 1: Credits -->
        <div class="bg-jurist-card p-5 rounded-xl border border-gray-800 shadow-neon relative overflow-hidden group hover:border-jurist-orange hover:-translate-y-1 transition-all duration-300">
          <div class="absolute -right-4 -top-4 w-24 h-24 bg-jurist-orange/10 rounded-full group-hover:bg-jurist-orange/20 transition-all"></div>
          <div class="flex items-center justify-between mb-4">
            <span class="text-gray-400 text-sm font-medium">Credite AI</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 text-jurist-orange">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <div class="text-3xl font-bold text-white">{{ juristService.credits() }}</div>
          <p class="text-xs text-gray-500 mt-2">Disponibile pentru generări</p>
        </div>

        <!-- Card 2: Deadline Next -->
        <div (click)="nav('calendar')" (keyup.enter)="nav('calendar')" tabindex="0" class="bg-jurist-card p-5 rounded-xl border border-gray-800 hover:border-gray-600 hover:-translate-y-1 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-neon">
          <div class="flex items-center justify-between mb-4">
            <span class="text-gray-400 text-sm font-medium">Următorul Termen</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 text-blue-400">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <div class="text-lg font-bold text-white truncate">{{ juristService.events()[0]?.date || 'Niciunul' }}</div>
          <p class="text-xs text-gray-400 truncate mt-1">{{ juristService.events()[0]?.title || 'Calendar liber' }}</p>
        </div>

        <!-- Card 3: Active Strategy -->
        <div (click)="nav('strategy')" (keyup.enter)="nav('strategy')" tabindex="0" class="bg-jurist-card p-5 rounded-xl border border-gray-800 hover:border-gray-600 hover:-translate-y-1 transition-all duration-300 cursor-pointer group shadow-sm hover:shadow-neon">
          <div class="flex items-center justify-between mb-4">
            <span class="text-gray-400 text-sm font-medium">Strategie Nouă</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 text-gray-500 group-hover:text-jurist-orange">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <div class="text-sm text-gray-300">Generează plan de atac</div>
          <p class="text-xs text-jurist-orange mt-2 group-hover:underline">Start modul &rarr;</p>
        </div>

         <!-- Card 4: Quick Fee Calc -->
        <div (click)="nav('fees')" (keyup.enter)="nav('fees')" tabindex="0" class="bg-jurist-card p-5 rounded-xl border border-gray-800 hover:border-gray-600 hover:-translate-y-1 transition-all duration-300 cursor-pointer group shadow-sm hover:shadow-neon">
          <div class="flex items-center justify-between mb-4">
            <span class="text-gray-400 text-sm font-medium">Calculator Taxe</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 text-gray-500 group-hover:text-jurist-orange">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 2.025v1.5c0 .414.336.75.75.75H4.5a.75.75 0 01-.75-.75v-1.5" />
            </svg>
          </div>
          <div class="text-sm text-gray-300">Calculează timbru/onorariu</div>
          <p class="text-xs text-jurist-orange mt-2 group-hover:underline">Deschide &rarr;</p>
        </div>
      </div>

      <!-- Quick Actions Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slideUp" style="animation-delay: 0.2s; animation-fill-mode: both;">
        
        <!-- Recent Activity / Assistant -->
        <div class="bg-jurist-card rounded-xl border border-gray-800 p-6 flex flex-col hover:border-gray-700 transition-all duration-300">
          <h3 class="text-lg font-bold text-white mb-4 border-b border-gray-800 pb-2">Asistență Rapidă</h3>
          <div class="flex-1 bg-gray-900/50 rounded-lg p-4 flex flex-col items-center justify-center text-center space-y-3">
             <div class="p-3 bg-gray-800 rounded-full">
               <span class="text-2xl">⚖️</span>
             </div>
             <p class="text-gray-400 text-sm max-w-xs">Ai nevoie de o jurisprudență rapidă sau o verificare legislativă?</p>
             <button (click)="nav('assistant')" class="px-6 py-2 bg-jurist-orange hover:bg-jurist-orangeHover text-white text-sm font-bold rounded-lg transition-colors">
               Întreabă AI
             </button>
          </div>
        </div>

        <!-- Latest Generation Preview (Drafting) -->
        <div class="bg-jurist-card rounded-xl border border-gray-800 p-6 flex flex-col hover:border-gray-700 transition-all duration-300">
          <h3 class="text-lg font-bold text-white mb-4 border-b border-gray-800 pb-2">Redactare Express</h3>
           <div class="flex-1 space-y-2">
             <div (click)="nav('drafting')" (keyup.enter)="nav('drafting')" tabindex="0" class="p-3 bg-gray-900 hover:bg-gray-800 rounded-lg cursor-pointer flex items-center justify-between border border-transparent hover:border-gray-700 transition-all">
               <div class="flex items-center gap-3">
                 <div class="w-8 h-8 rounded bg-blue-900/30 text-blue-400 flex items-center justify-center text-xs font-bold">DOC</div>
                 <div class="text-sm text-gray-200">Cerere Chemare în Judecată</div>
               </div>
               <span class="text-gray-500 text-xs">Model Standard</span>
             </div>
             <div (click)="nav('drafting')" (keyup.enter)="nav('drafting')" tabindex="0" class="p-3 bg-gray-900 hover:bg-gray-800 rounded-lg cursor-pointer flex items-center justify-between border border-transparent hover:border-gray-700 transition-all">
               <div class="flex items-center gap-3">
                 <div class="w-8 h-8 rounded bg-green-900/30 text-green-400 flex items-center justify-center text-xs font-bold">DOC</div>
                 <div class="text-sm text-gray-200">Contract Asistență Juridică</div>
               </div>
               <span class="text-gray-500 text-xs">Model UNBR</span>
             </div>
             <div (click)="nav('drafting')" (keyup.enter)="nav('drafting')" tabindex="0" class="p-3 bg-gray-900 hover:bg-gray-800 rounded-lg cursor-pointer flex items-center justify-between border border-transparent hover:border-gray-700 transition-all">
               <div class="flex items-center gap-3">
                 <div class="w-8 h-8 rounded bg-red-900/30 text-red-400 flex items-center justify-center text-xs font-bold">DOC</div>
                 <div class="text-sm text-gray-200">Plângere Penală</div>
               </div>
               <span class="text-gray-500 text-xs">Art. 289 CPP</span>
             </div>
           </div>
        </div>

      </div>

      <!-- Support Tickets Section (Admin View) -->
      <div class="bg-jurist-card rounded-xl border border-gray-800 p-6 animate-slideUp" style="animation-delay: 0.3s; animation-fill-mode: both;">
        <div class="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
           <h3 class="text-lg font-bold text-white flex items-center gap-2">
             <span>🎫</span> Tickete Suport & Solicitări Expert
           </h3>
           <button (click)="openTicketModal()" class="bg-jurist-orange hover:bg-jurist-orangeHover text-white px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1 shadow-neon">
             <span class="text-lg">+</span> Ticket Nou
           </button>
        </div>
        
        @if (juristService.tickets().length > 0) {
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
              <thead class="text-xs text-gray-500 uppercase bg-gray-900/50">
                <tr>
                  <th class="px-4 py-3">Data</th>
                  <th class="px-4 py-3">Tip</th>
                  <th class="px-4 py-3">Mesaj</th>
                  <th class="px-4 py-3">Status</th>
                  <th class="px-4 py-3">Răspuns</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-800">
                @for (ticket of juristService.tickets(); track ticket.id) {
                  <tr class="hover:bg-gray-900/30">
                    <td class="px-4 py-3 text-gray-400">{{ ticket.date | date:'short' }}</td>
                    <td class="px-4 py-3">
                      <span class="bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded text-xs border border-blue-900">{{ ticket.type }}</span>
                    </td>
                    <td class="px-4 py-3 text-gray-300 max-w-xs truncate" [title]="ticket.message">{{ ticket.message }}</td>
                    <td class="px-4 py-3">
                      <span [class]="'px-2 py-0.5 rounded text-xs uppercase font-bold border ' + (ticket.status === 'resolved' ? 'bg-green-900/30 text-green-400 border-green-900' : 'bg-yellow-900/30 text-yellow-400 border-yellow-900')">
                        {{ ticket.status === 'resolved' ? 'Rezolvat' : 'În Lucru' }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-gray-400 text-xs italic">
                       {{ ticket.adminResponse || '...' }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="text-center py-8 text-gray-500 bg-gray-900/20 rounded-lg border border-dashed border-gray-800">
            <p>Nu există solicitări. Ai nevoie de ajutor?</p>
          </div>
        }
      </div>

    </div>

    <!-- TICKET MODAL -->
    @if (showTicketModal) {
      <div class="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <div class="bg-[#121212] border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl">
          <div class="p-6 border-b border-gray-800 flex justify-between items-center bg-jurist-dark">
            <h3 class="text-xl text-white font-bold">Deschide Ticket Suport</h3>
            <button (click)="closeTicketModal()" class="text-gray-400 hover:text-white">✕</button>
          </div>
          
          <div class="p-6 space-y-4">
             <div>
               <label for="ticketType" class="block text-xs font-bold text-gray-400 mb-1 uppercase">Tip Solicitare</label>
               <select id="ticketType" [(ngModel)]="newTicket.type" class="w-full bg-black border border-gray-700 rounded p-3 text-white focus:border-jurist-orange">
                 <option value="tehnic">Problemă Tehnică</option>
                 <option value="juridic">Expertiză Juridică</option>
                 <option value="billing">Facturare / Plăți</option>
                 <option value="feedback">Sugestie / Feedback</option>
               </select>
             </div>
             
             <div>
               <label for="ticketMessage" class="block text-xs font-bold text-gray-400 mb-1 uppercase">Descriere Detaliată</label>
               <textarea id="ticketMessage" [(ngModel)]="newTicket.message" rows="5" class="w-full bg-black border border-gray-700 rounded p-3 text-white focus:border-jurist-orange resize-none" placeholder="Descrieți problema întâmpinată..."></textarea>
             </div>

             <div class="pt-4 flex justify-end gap-3">
                <button (click)="closeTicketModal()" class="px-4 py-2 rounded text-gray-400 hover:text-white transition-colors">Anulează</button>
                <button (click)="submitTicket()" [disabled]="!newTicket.message" class="bg-jurist-orange hover:bg-jurist-orangeHover text-white px-6 py-2 rounded font-bold transition-all disabled:opacity-50">
                  Trimite Ticket
                </button>
             </div>
          </div>
        </div>
      </div>
    }
    <!-- TOAST -->
    @if (showToast) {
      <div class="fixed bottom-4 right-4 bg-green-900/90 border border-green-500 text-green-100 px-6 py-3 rounded-lg shadow-lg z-50 animate-slideUp">
        <div class="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="font-bold text-sm">Ticketul a fost transmis cu succes! Vă mulțumim.</span>
        </div>
      </div>
    }
  `
})
export class DashboardComponent implements OnInit, OnDestroy {
  juristService = inject(JuristService);
  authService = inject(AuthService);

  showTicketModal = false;
  showToast = false;
  newTicket = {
    type: 'tehnic',
    message: ''
  };

  private _alertInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    // Keep alerts fresh if the user stays on dashboard
    this._alertInterval = setInterval(() => {
       // Just accessing the signal computed will refresh if events updated, 
       // but we forces a check of the window logic
    }, 60000); // 1 min check
  }

  ngOnDestroy() {
    if (this._alertInterval) clearInterval(this._alertInterval);
  }

  displayName = computed(() => {
    return this.juristService.profile().lawyerName || this.authService.currentUser()?.fullName || 'Avocat';
  });

  nav(module: ModuleType) {
    this.juristService.setModule(module);
  }

  openTicketModal() {
    this.showTicketModal = true;
  }

  closeTicketModal() {
    this.showTicketModal = false;
    this.newTicket.message = '';
  }

  async submitTicket() {
    if(!this.newTicket.message) return;
    
    const user = this.authService.currentUser();
    await this.juristService.submitTicket({
      name: this.displayName(),
      email: user?.email || 'unknown@user.com',
      type: this.newTicket.type,
      message: this.newTicket.message
    });

    this.closeTicketModal();
    this.showToast = true;
    setTimeout(() => this.showToast = false, 4000);
  }

  // AUTOMATION: Sequences all pending alerts within the 24h window


}