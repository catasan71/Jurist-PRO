import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JuristService, SystemAnnouncement } from '../services/jurist.service';
import { AuthService } from '../services/auth.service';

type AdminTab = 'overview' | 'users' | 'tickets' | 'finance' | 'packages' | 'marketing';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-[#0f1012] text-white flex flex-col lg:flex-row font-sans overflow-hidden animate-fadeIn">
      
      <!-- MOBILE HEADER (Visible only on lg and below) -->
      <header class="lg:hidden h-16 bg-[#1a1b1e] border-b border-gray-800 flex items-center justify-between px-4 z-40 relative">
        <div class="flex items-center gap-3">
           <button (click)="toggleMobileMenu()" class="p-2 bg-gray-800 rounded border border-gray-700 text-gray-300">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
               <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
             </svg>
           </button>
           <span class="font-bold text-lg">ADMIN<span class="text-red-500">PANEL</span></span>
        </div>
        <div class="flex items-center gap-2">
           <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        </div>
      </header>

      <!-- BACKDROP (Mobile only) -->
      @if (mobileMenuOpen()) {
        <div (click)="toggleMobileMenu()" (keyup.enter)="toggleMobileMenu()" tabindex="0" class="fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-sm"></div>
      }

      <!-- SIDEBAR (Drawer on Mobile, Static on Desktop) -->
      <div [class]="'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#1a1b1e] border-r border-gray-800 flex flex-col transform transition-transform duration-300 lg:transform-none ' + (mobileMenuOpen() ? 'translate-x-0' : '-translate-x-full')">
        <div class="p-6 border-b border-gray-800">
           <div class="flex items-center gap-2">
             <div class="w-8 h-8 bg-red-600 rounded flex items-center justify-center font-bold text-white shadow-lg">A</div>
             <h1 class="font-bold text-lg tracking-wide">ADMIN<span class="text-gray-500">PANEL</span></h1>
           </div>
           <p class="text-xs text-gray-500 mt-2">JuristPRO v2.0 - Master Control</p>
        </div>

        <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
           <button (click)="nav('overview')" [class]="getTabClass('overview')">
              <span>📊</span> Overview
           </button>
           <button (click)="nav('users')" [class]="getTabClass('users')">
              <span>👥</span> Utilizatori
           </button>
           <button (click)="nav('tickets')" [class]="getTabClass('tickets')">
              <span>🎫</span> Tichete Suport
           </button>
           <button (click)="nav('finance')" [class]="getTabClass('finance')">
              <span>💰</span> Financiar
           </button>
           <button (click)="nav('packages')" [class]="getTabClass('packages')">
              <span>📦</span> Pachete & Prețuri
           </button>
           <button (click)="nav('marketing')" [class]="getTabClass('marketing')">
              <span>📢</span> Anunțuri & Promo
           </button>
        </nav>

        <div class="p-4 border-t border-gray-800">
          <button (click)="logout()" class="w-full text-left px-4 py-3 bg-red-900/10 hover:bg-red-900/20 text-red-400 rounded transition-colors text-sm font-bold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            Deconectare
          </button>
        </div>
      </div>

      <!-- MAIN CONTENT -->
      <div class="flex-1 flex flex-col h-[calc(100vh-64px)] lg:h-screen overflow-hidden">
        
        <!-- Desktop Header -->
        <header class="hidden lg:flex h-16 bg-[#1a1b1e] border-b border-gray-800 items-center justify-between px-8 sticky top-0 z-20 flex-shrink-0">
           <h2 class="font-bold text-xl uppercase tracking-wider text-gray-300">{{ activeTab() }}</h2>
           <div class="flex items-center gap-4">
              <span class="w-3 h-3 bg-green-500 rounded-full shadow-[0_0_10px_#22c55e]"></span>
              <span class="text-xs font-mono text-green-500">SYSTEM ONLINE</span>
           </div>
        </header>

        <!-- Scrollable Area -->
        <div class="flex-1 overflow-y-auto p-4 lg:p-8 animate-slideUp">
           @switch (activeTab()) {
             
             <!-- OVERVIEW -->
             @case ('overview') {
               <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
                  <!-- Stats Cards -->
                  <div class="bg-[#25262b] p-6 rounded-xl border border-gray-700">
                     <p class="text-gray-400 text-xs font-bold uppercase">Utilizatori Totali</p>
                     <p class="text-3xl font-bold text-white mt-2">{{ authService.allUsers().length }}</p>
                  </div>
                  <div class="bg-[#25262b] p-6 rounded-xl border border-gray-700">
                     <p class="text-gray-400 text-xs font-bold uppercase">Venituri Totale</p>
                     <p class="text-3xl font-bold text-green-400 mt-2">{{ juristService.totalRevenue() }} RON</p>
                  </div>
                  <div class="bg-[#25262b] p-6 rounded-xl border border-gray-700">
                     <p class="text-gray-400 text-xs font-bold uppercase">Tichete Deschise</p>
                     <p class="text-3xl font-bold text-yellow-400 mt-2">{{ getOpenTicketsCount() }}</p>
                  </div>
                  <div class="bg-[#25262b] p-6 rounded-xl border border-gray-700">
                     <p class="text-gray-400 text-xs font-bold uppercase">Server Load</p>
                     <p class="text-3xl font-bold text-blue-400 mt-2">12%</p>
                  </div>
               </div>

               <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                 <div class="bg-[#25262b] p-6 rounded-xl border border-gray-700">
                    <h3 class="font-bold text-white mb-4">Activitate Recentă Utilizatori</h3>
                    <ul class="space-y-3">
                       @for (user of authService.allUsers().slice(0, 5); track user.id) {
                         <li class="flex justify-between text-sm border-b border-gray-700 pb-2">
                            <span class="text-white truncate max-w-[150px]">{{ user.fullName }}</span>
                            <span class="text-gray-500 text-xs">{{ user.plan | uppercase }}</span>
                         </li>
                       }
                    </ul>
                 </div>
                 <div class="bg-[#25262b] p-6 rounded-xl border border-gray-700">
                    <h3 class="font-bold text-white mb-4">Ultimele Tranzacții</h3>
                    <ul class="space-y-3">
                       @for (tx of juristService.transactions().slice(0, 5); track tx.id) {
                         <li class="flex justify-between text-sm border-b border-gray-700 pb-2">
                            <span class="text-gray-300 truncate max-w-[150px]">{{ tx.userName }}</span>
                            <span class="text-green-400 font-mono text-xs">+{{ tx.amount }} RON</span>
                         </li>
                       }
                    </ul>
                 </div>
               </div>
             }

             <!-- USERS -->
             @case ('users') {
               <div class="bg-[#25262b] rounded-xl border border-gray-700 overflow-hidden">
                 <div class="overflow-x-auto">
                   <table class="w-full text-sm text-left whitespace-nowrap">
                      <thead class="bg-gray-800 text-xs uppercase text-gray-400">
                         <tr>
                           <th class="px-6 py-4">Nume</th>
                           <th class="px-6 py-4">Email</th>
                           <th class="px-6 py-4">Plan</th>
                           <th class="px-6 py-4">Status</th>
                           <th class="px-6 py-4 text-right">Acțiuni</th>
                         </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-700">
                         @for (user of authService.allUsers(); track user.id) {
                           <tr class="hover:bg-gray-800/50">
                              <td class="px-6 py-4 font-bold text-white">{{ user.fullName }}</td>
                              <td class="px-6 py-4 text-gray-400">{{ user.email }}</td>
                              <td class="px-6 py-4">
                                 <span [class]="'px-2 py-1 rounded text-xs font-bold uppercase ' + (user.plan === 'gold' ? 'bg-yellow-900 text-yellow-500' : 'bg-blue-900 text-blue-400')">{{ user.plan }}</span>
                              </td>
                              <td class="px-6 py-4">
                                 <span [class]="'px-2 py-1 rounded text-xs ' + (user.status === 'active' ? 'text-green-400' : 'text-red-400')">{{ user.status }}</span>
                              </td>
                              <td class="px-6 py-4 text-right">
                                 <div class="flex items-center justify-end gap-2">
                                   <input type="number" #creditInput placeholder="Credite" class="w-20 bg-black border border-gray-600 rounded p-1 text-white text-xs text-center" value="15">
                                   <button (click)="addCredits(user.id, creditInput.value)" class="text-green-500 hover:text-green-400 hover:underline mr-4 text-xs font-bold">+ Adaugă</button>
                                   <button (click)="deleteUser(user.id)" class="text-red-500 hover:text-red-400 hover:underline text-xs">Șterge</button>
                                 </div>
                              </td>
                           </tr>
                         }
                      </tbody>
                   </table>
                 </div>
               </div>
             }

             <!-- TICKETS -->
             @case ('tickets') {
               <div class="space-y-4">
                  @for (ticket of juristService.tickets(); track ticket.id) {
                    <div class="bg-[#25262b] p-4 lg:p-6 rounded-xl border border-gray-700 flex flex-col lg:flex-row gap-6">
                       <div class="flex-1">
                          <div class="flex flex-wrap items-center justify-between mb-2 gap-2">
                             <span class="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">{{ ticket.type }}</span>
                             <span class="text-xs text-gray-500">{{ ticket.date | date:'short' }}</span>
                          </div>
                          <h3 class="font-bold text-white text-lg">{{ ticket.name }}</h3>
                          <p class="text-xs text-gray-500 mb-2">{{ ticket.email }}</p>
                          
                          <p class="text-gray-300 mt-2 bg-black/20 p-4 rounded border border-gray-800 italic text-sm">"{{ ticket.message }}"</p>
                          
                          @if (ticket.status === 'resolved') {
                             <div class="mt-4 bg-green-900/20 p-3 rounded border border-green-900/50">
                                <p class="text-green-400 text-xs font-bold uppercase mb-1">Rezolvat:</p>
                                <p class="text-gray-300 text-sm">{{ ticket.adminResponse }}</p>
                             </div>
                          } @else {
                             <div class="mt-4">
                                <textarea #replyBox rows="3" class="w-full bg-black border border-gray-600 rounded p-3 text-white text-sm" placeholder="Scrie răspunsul expertului..."></textarea>
                                <button (click)="resolveTicket(ticket.id, replyBox.value)" class="mt-2 w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded text-sm font-bold">Trimite Răspuns</button>
                             </div>
                          }
                       </div>
                       <div class="lg:w-32 flex flex-col items-start lg:items-end justify-start">
                          <span [class]="'px-3 py-1 rounded-full text-xs font-bold uppercase ' + (ticket.status === 'resolved' ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400')">{{ ticket.status }}</span>
                       </div>
                    </div>
                  }
                  @if (juristService.tickets().length === 0) {
                     <p class="text-center text-gray-500 py-10">Niciun ticket de suport.</p>
                  }
               </div>
             }

             <!-- FINANCE -->
             @case ('finance') {
                <div class="bg-[#25262b] rounded-xl border border-gray-700 overflow-hidden">
                   <div class="p-6 border-b border-gray-700 flex justify-between items-center">
                      <h3 class="font-bold text-white">Istoric Tranzacții</h3>
                      <button class="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded text-white">Export CSV</button>
                   </div>
                   <div class="overflow-x-auto">
                     <table class="w-full text-sm text-left whitespace-nowrap">
                        <thead class="bg-gray-800 text-xs uppercase text-gray-400">
                           <tr>
                              <th class="px-6 py-4">Data</th>
                              <th class="px-6 py-4">Client</th>
                              <th class="px-6 py-4">Date Facturare</th>
                              <th class="px-6 py-4">Tip</th>
                              <th class="px-6 py-4 text-right">Sumă</th>
                              <th class="px-6 py-4 text-right">Status</th>
                               <th class="px-6 py-4 text-right">Acțiuni</th>
                           </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-700">
                           @for (tx of juristService.transactions(); track tx.id) {
                              <tr class="hover:bg-gray-800/50">
                                 <td class="px-6 py-4 text-gray-400">{{ tx.date | date:'shortDate' }}</td>
                                 <td class="px-6 py-4 font-bold text-white">{{ tx.userName }}</td>
                                 <td class="px-6 py-4 text-xs text-gray-400">
                                   @if (tx.billingData) {
                                     @if (tx.billingData.type === 'juridica') {
                                       <div class="font-bold text-gray-200">{{ tx.billingData.name }}</div>
                                       <div>CUI: {{ tx.billingData.cui }}</div>
                                       @if (tx.billingData.regCom) { <div>Reg. Com: {{ tx.billingData.regCom }}</div> }
                                       <div class="truncate max-w-[200px]" title="{{ tx.billingData.address }}">{{ tx.billingData.address }}</div>
                                     } @else {
                                       <div class="font-bold text-gray-200">{{ tx.billingData.name }} (PF)</div>
                                       <div class="truncate max-w-[200px]" title="{{ tx.billingData.address }}">{{ tx.billingData.address }}</div>
                                     }
                                   } @else {
                                     <span class="italic text-gray-600">Fără date</span>
                                   }
                                 </td>
                                 <td class="px-6 py-4 capitalize">{{ tx.type }}</td>
                                 <td class="px-6 py-4 text-right font-mono text-green-400">{{ tx.amount }} RON</td>
                                 <td class="px-6 py-4 text-right">
                                    <span class="bg-green-900/30 text-green-400 px-2 py-1 rounded text-xs uppercase">Paid</span>
                                  </td>
                                  <td class="px-6 py-4 text-right">
                                     <button (click)="deleteTransaction(tx.id)" class="text-red-500 hover:text-red-400 text-xs hover:underline">Șterge</button>
                                  </td>
                              </tr>
                           }
                        </tbody>
                     </table>
                   </div>
                </div>
             }

             <!-- PACKAGES -->
             @case ('packages') {
                <div class="space-y-8 lg:space-y-12">
                  
                  <!-- Subscriptions Section -->
                  <div>
                    <h3 class="text-xl font-bold text-white mb-6 border-b border-gray-700 pb-2">Abonamente Lunare</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       <!-- Expert Config -->
                       <div class="bg-[#25262b] p-6 rounded-xl border border-gray-700">
                          <div class="flex justify-between items-center mb-4">
                             <h3 class="font-bold text-white text-lg">Pachet Expert</h3>
                             <span class="text-xs bg-blue-900 text-blue-300 px-2 py-1 rounded">Activ</span>
                          </div>
                          <div class="space-y-4">
                             <div>
                                <label for="expertPrice" class="block text-xs text-gray-400 mb-1">Preț (RON)</label>
                                <input id="expertPrice" type="number" value="200" class="w-full bg-black border border-gray-600 rounded p-2 text-white">
                             </div>
                             <div>
                                <label for="expertCredits" class="block text-xs text-gray-400 mb-1">Credite Lunare</label>
                                <input id="expertCredits" type="number" value="150" class="w-full bg-black border border-gray-600 rounded p-2 text-white">
                             </div>
                             <button (click)="saveSettings()" class="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded text-sm font-bold">Actualizează</button>
                          </div>
                       </div>

                       <!-- Gold Config -->
                       <div class="bg-[#25262b] p-6 rounded-xl border border-gray-700">
                          <div class="flex justify-between items-center mb-4">
                             <h3 class="font-bold text-white text-lg">Pachet Gold</h3>
                             <span class="text-xs bg-yellow-900 text-yellow-300 px-2 py-1 rounded">Activ</span>
                          </div>
                          <div class="space-y-4">
                             <div>
                                <label for="goldPrice" class="block text-xs text-gray-400 mb-1">Preț (RON)</label>
                                <input id="goldPrice" type="number" value="500" class="w-full bg-black border border-gray-600 rounded p-2 text-white">
                             </div>
                             <div>
                                <label for="goldCredits" class="block text-xs text-gray-400 mb-1">Credite Lunare</label>
                                <input id="goldCredits" type="number" value="500" class="w-full bg-black border border-gray-600 rounded p-2 text-white focus:border-yellow-500 transition-colors">
                             </div>
                             <button (click)="saveSettings()" class="w-full bg-yellow-600 hover:bg-yellow-500 text-black py-2 rounded text-sm font-bold">Actualizează</button>
                          </div>
                       </div>
                    </div>
                  </div>

                  <!-- Top-Up Section -->
                  <div>
                    <h3 class="text-lg lg:text-xl font-bold text-white mb-6 border-b border-gray-700 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                       <span>Pachete Top-Up (Credite)</span>
                       <span class="text-xs font-normal text-purple-400 bg-purple-900/30 px-2 py-1 rounded border border-purple-500/30 w-fit">Venit Suplimentar</span>
                    </h3>
                    
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                       @for (pack of topUpPackages(); track pack.id) {
                          <div class="bg-[#25262b] p-6 rounded-xl border border-gray-700 relative overflow-hidden group hover:border-purple-500 transition-colors">
                             <!-- Decorative bg -->
                             <div class="absolute -right-6 -top-6 w-20 h-20 bg-purple-500/10 rounded-full group-hover:bg-purple-500/20 transition-all"></div>
                             
                             <div class="flex justify-between items-center mb-4 relative z-10">
                                <h3 class="font-bold text-white text-lg">{{ pack.name }}</h3>
                                <span class="text-xs bg-purple-900 text-purple-300 px-2 py-1 rounded">One-time</span>
                             </div>
                             
                             <div class="space-y-4 relative z-10">
                                <div>
                                   <label [for]="'packPrice' + pack.id" class="block text-xs text-gray-400 mb-1">Preț (RON)</label>
                                   <input [id]="'packPrice' + pack.id" type="number" [(ngModel)]="pack.price" class="w-full bg-black border border-gray-600 rounded p-2 text-white focus:border-purple-500 transition-colors">
                                </div>
                                <div>
                                   <label [for]="'packCredits' + pack.id" class="block text-xs text-gray-400 mb-1">Număr Credite</label>
                                   <input [id]="'packCredits' + pack.id" type="number" [(ngModel)]="pack.credits" class="w-full bg-black border border-gray-600 rounded p-2 text-white focus:border-purple-500 transition-colors">
                                </div>
                                <button (click)="saveTopUp(pack)" class="w-full bg-purple-600 hover:bg-purple-500 text-white py-2 rounded text-sm font-bold shadow-lg transition-all">
                                   Salvează Pachet
                                </button>
                             </div>
                          </div>
                       }
                    </div>
                  </div>

                </div>
             }

             <!-- MARKETING & ANNOUNCEMENTS -->
             @case ('marketing') {
                <div class="max-w-4xl mx-auto space-y-8">
                   <div class="bg-[#25262b] p-8 rounded-xl border border-gray-700 relative overflow-hidden">
                      <div class="absolute top-0 right-0 p-4 opacity-10">
                         <span class="text-9xl">📢</span>
                      </div>
                      
                      <h3 class="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                         Anunțuri Sistem & Promoții
                         <span class="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded font-normal">Global Broadcast</span>
                      </h3>
                      
                      <div class="space-y-6 relative z-10">
                         <!-- Announcement Type -->
                         <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <button (click)="announcementForm.type = 'info'" [class]="'p-3 rounded-lg border text-sm font-bold transition-all ' + (announcementForm.type === 'info' ? 'bg-blue-900 border-blue-500 text-white' : 'bg-black border-gray-700 text-gray-400')">ℹ️ Info</button>
                            <button (click)="announcementForm.type = 'warning'" [class]="'p-3 rounded-lg border text-sm font-bold transition-all ' + (announcementForm.type === 'warning' ? 'bg-yellow-900 border-yellow-500 text-white' : 'bg-black border-gray-700 text-gray-400')">⚠️ Mentenanță</button>
                            <button (click)="announcementForm.type = 'promo'" [class]="'p-3 rounded-lg border text-sm font-bold transition-all ' + (announcementForm.type === 'promo' ? 'bg-purple-900 border-purple-500 text-white' : 'bg-black border-gray-700 text-gray-400')">🎁 Promo</button>
                            <button (click)="announcementForm.type = 'blackfriday'" [class]="'p-3 rounded-lg border text-sm font-bold transition-all ' + (announcementForm.type === 'blackfriday' ? 'bg-red-900 border-red-500 text-white' : 'bg-black border-gray-700 text-gray-400')">🔥 Black Friday</button>
                         </div>

                         <!-- Message Input -->
                         <div>
                            <label for="announcementMessage" class="block text-xs text-gray-400 mb-1 font-bold uppercase">Mesaj Anunț</label>
                            <textarea id="announcementMessage" [(ngModel)]="announcementForm.message" rows="3" class="w-full bg-black border border-gray-600 rounded-lg p-3 text-white focus:border-jurist-orange" placeholder="Scrie mesajul care va apărea tuturor utilizatorilor..."></textarea>
                         </div>

                         <!-- Discount Code (Optional) -->
                         <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                               <label for="announcementDiscount" class="block text-xs text-gray-400 mb-1 font-bold uppercase">Cod Reducere (Opțional)</label>
                               <input id="announcementDiscount" [(ngModel)]="announcementForm.discountCode" class="w-full bg-black border border-gray-600 rounded-lg p-3 text-white uppercase font-mono" placeholder="BLACK50">
                            </div>
                            <div>
                               <label for="announcementAction" class="block text-xs text-gray-400 mb-1 font-bold uppercase">Text Buton (Opțional)</label>
                               <input id="announcementAction" [(ngModel)]="announcementForm.actionText" class="w-full bg-black border border-gray-600 rounded-lg p-3 text-white" placeholder="Vezi Oferta">
                            </div>
                         </div>
                         
                         <!-- Active Toggle -->
                         <div class="flex items-center justify-between bg-black/40 p-4 rounded-lg border border-gray-700">
                            <div>
                               <p class="font-bold text-white">Stare Anunț</p>
                               <p class="text-xs text-gray-400">Dacă este activ, va apărea imediat pe toate paginile.</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                               <input type="checkbox" [(ngModel)]="announcementForm.active" class="sr-only peer">
                               <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                            </label>
                         </div>

                         <div class="flex justify-end pt-4 border-t border-gray-700">
                            <button (click)="saveAnnouncement()" class="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-all shadow-lg flex items-center gap-2">
                               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                                 <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                               </svg>
                               Publică Anunț
                            </button>
                         </div>
                      </div>
                   </div>

                   <!-- Preview Area -->
                   @if (announcementForm.active) {
                      <div class="opacity-70 scale-90 origin-top">
                         <p class="text-center text-gray-500 text-xs uppercase mb-2">Previzualizare Banner:</p>
                         <div [class]="'w-full p-3 text-center flex items-center justify-center gap-4 text-sm font-bold shadow-lg rounded ' + 
                            (announcementForm.type === 'blackfriday' ? 'bg-black text-red-500 border-2 border-red-600' : 
                             announcementForm.type === 'warning' ? 'bg-yellow-600 text-black' : 
                             announcementForm.type === 'promo' ? 'bg-purple-600 text-white' : 
                             'bg-blue-600 text-white')">
                            <span>{{ announcementForm.message }}</span>
                            @if (announcementForm.discountCode) {
                               <span class="bg-white text-black px-2 py-0.5 rounded text-xs font-mono border border-gray-300">{{ announcementForm.discountCode }}</span>
                            }
                         </div>
                      </div>
                   }

                   <!-- Promo Codes Section -->
                   <div class="bg-[#25262b] p-8 rounded-xl border border-gray-700 relative overflow-hidden mt-8">
                      <h3 class="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                         Coduri Promoționale
                         <span class="text-xs bg-green-900 text-green-400 px-2 py-1 rounded font-normal">Credite Gratuite</span>
                      </h3>
                      
                      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                         <div>
                            <label for="newPromoCode" class="block text-xs text-gray-400 mb-1 font-bold uppercase">Cod</label>
                            <input id="newPromoCode" [(ngModel)]="newPromo.code" class="w-full bg-black border border-gray-600 rounded-lg p-3 text-white uppercase font-mono" placeholder="TEST15">
                         </div>
                         <div>
                            <label for="newPromoCredits" class="block text-xs text-gray-400 mb-1 font-bold uppercase">Credite</label>
                            <input id="newPromoCredits" type="number" [(ngModel)]="newPromo.credits" class="w-full bg-black border border-gray-600 rounded-lg p-3 text-white">
                         </div>
                         <div>
                            <label for="newPromoMaxUses" class="block text-xs text-gray-400 mb-1 font-bold uppercase">Utilizări Maxime (0 = nelimitat)</label>
                            <input id="newPromoMaxUses" type="number" [(ngModel)]="newPromo.maxUses" class="w-full bg-black border border-gray-600 rounded-lg p-3 text-white">
                         </div>
                         <div class="flex items-end">
                            <button (click)="createPromoCode()" class="w-full px-4 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-all shadow-lg">
                               Generează Cod
                            </button>
                         </div>
                      </div>

                      <div class="overflow-x-auto">
                         <table class="w-full text-sm text-left whitespace-nowrap">
                            <thead class="bg-gray-800 text-xs uppercase text-gray-400">
                               <tr>
                                  <th class="px-6 py-4">Cod</th>
                                  <th class="px-6 py-4">Credite</th>
                                  <th class="px-6 py-4">Utilizări</th>
                                  <th class="px-6 py-4">Expiră la</th>
                                  <th class="px-6 py-4 text-right">Acțiuni</th>
                               </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-700">
                               @for (promo of promoCodes(); track promo.id) {
                                  <tr class="hover:bg-gray-800/50">
                                     <td class="px-6 py-4 font-bold text-white font-mono">{{ promo.code }}</td>
                                     <td class="px-6 py-4 text-green-400 font-bold">+{{ promo.credits }}</td>
                                     <td class="px-6 py-4 text-gray-400">{{ promo.usedBy?.length || 0 }} / {{ promo.maxUses === 0 ? '∞' : promo.maxUses }}</td>
                                     <td class="px-6 py-4 text-gray-400">{{ getPromoDate(promo.expiresAt) | date:'shortDate' }}</td>
                                     <td class="px-6 py-4 text-right">
                                        <button (click)="deletePromoCode(promo.id)" class="text-red-500 hover:text-red-400 hover:underline text-xs">Șterge</button>
                                     </td>
                                  </tr>
                               }
                               @if (promoCodes().length === 0) {
                                  <tr>
                                     <td colspan="5" class="px-6 py-8 text-center text-gray-500">Nu există coduri promoționale active.</td>
                                  </tr>
                               }
                            </tbody>
                         </table>
                      </div>
                   </div>
                </div>
             }
           }
        </div>
      </div>
    </div>

    <!-- TOAST -->
    @if (toastMessage()) {
      <div class="fixed bottom-4 right-4 bg-green-900/90 border border-green-500 text-green-100 px-6 py-3 rounded-lg shadow-lg z-50 animate-slideUp">
        <div class="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="font-bold text-sm">{{ toastMessage() }}</span>
        </div>
      </div>
    }
  `
})
export class AdminDashboardComponent {
  juristService = inject(JuristService);
  authService = inject(AuthService);
  
  activeTab = signal<AdminTab>('overview');
  mobileMenuOpen = signal(false);
  toastMessage = signal<string | null>(null);

  // Announcement Form State
  announcementForm: SystemAnnouncement = {
    active: false,
    message: '',
    type: 'info',
    actionText: '',
    discountCode: ''
  };

  constructor() {
     // Load current state securely
     effect(() => {
        const current = this.juristService.announcement();
        if (current) {
           this.announcementForm = { ...current };
        }
     });
  }

  // Top Up Packages State
  topUpPackages = computed(() => this.juristService.topUpPackages());

  // Promo Codes State
  promoCodes = computed(() => this.juristService.promoCodes());
  newPromo = {
    code: '',
    credits: 15,
    maxUses: 100
  };

  getPromoDate(dateRaw: unknown): Date {
    if (!dateRaw) return new Date();
    const d = dateRaw as { toDate?: () => Date };
    if (typeof d.toDate === 'function') {
      return d.toDate();
    }
    return new Date(dateRaw as string);
  }

  async createPromoCode() {
    if (!this.newPromo.code) {
      this.showToast("Vă rugăm să introduceți un cod promoțional.");
      return;
    }
    const res = await this.juristService.createPromoCode(this.newPromo.code, this.newPromo.credits, this.newPromo.maxUses);
    if (res.success) {
      this.showToast(`Codul ${this.newPromo.code.toUpperCase()} a fost creat cu succes.`);
      this.newPromo.code = '';
    } else {
      this.showToast(res.error || "Eroare la crearea codului.");
    }
  }

  async deletePromoCode(id: string) {
    if (confirm('Sunteți sigur că doriți să ștergeți acest cod promoțional?')) {
      const res = await this.juristService.deletePromoCode(id);
      if (res.success) {
        this.showToast("Codul promoțional a fost șters.");
      } else {
        this.showToast(res.error || "Eroare la ștergerea codului.");
      }
    }
  }

  toggleMobileMenu() {
    this.mobileMenuOpen.update(v => !v);
  }

  nav(tab: AdminTab) {
    this.activeTab.set(tab);
    this.mobileMenuOpen.set(false); // Close menu on nav
  }

  getTabClass(tab: AdminTab) {
    const active = this.activeTab() === tab;
    return `w-full text-left px-4 py-3 rounded transition-all flex items-center gap-3 ${
      active ? 'bg-red-600 text-white font-bold shadow-lg' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
    }`;
  }

  getOpenTicketsCount() {
    return this.juristService.tickets().filter(t => t.status !== 'resolved').length;
  }

  resolveTicket(id: string, response: string) {
    if(!response) return;
    this.juristService.resolveTicket(id, response);
  }

  async logout() {
    await this.authService.logout();
    this.juristService.setModule('landing');
  }

  showToast(message: string) {
    this.toastMessage.set(message);
    setTimeout(() => this.toastMessage.set(null), 4000);
  }

  saveSettings() {
    this.showToast("Setările abonamentelor au fost actualizate în sistem!");
  }

  saveTopUp(pack: { id: string, name: string, price: number, credits: number }) {
    this.juristService.updateTopUpPackage(pack);
    this.showToast(`Pachetul '${pack.name}' a fost actualizat: ${pack.price} RON / ${pack.credits} Credite.`);
  }

  async saveAnnouncement() {
     await this.juristService.updateAnnouncement(this.announcementForm);
     this.showToast(this.announcementForm.active 
        ? "Anunțul este acum LIVE pe platformă!" 
        : "Anunțul a fost dezactivat.");
  }

  async deleteTransaction(txId: string) {
    if (confirm('Sunteți sigur că doriți să ștergeți această tranzacție?')) {
      await this.juristService.deleteTransaction(txId);
      this.showToast("Tranzacția a fost ștearsă.");
    }
  }

  async deleteUser(userId: string) {
    if (confirm('Sunteți sigur că doriți să ștergeți acest utilizator?')) {
      await this.authService.deleteUser(userId);
      this.showToast("Utilizatorul a fost șters.");
    }
  }

  async addCredits(userId: string, amountStr: string | number) {
    const amount = typeof amountStr === 'string' ? parseInt(amountStr, 10) : amountStr;
    if (isNaN(amount) || amount <= 0) {
      this.showToast("Vă rugăm să introduceți un număr valid de credite.");
      return;
    }
    await this.authService.addCreditsToUser(userId, amount);
    this.showToast(`S-au adăugat ${amount} credite utilizatorului.`);
  }
}