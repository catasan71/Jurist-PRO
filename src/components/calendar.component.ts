import { Component, inject, signal, computed, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JuristService, CalendarEvent } from '../services/jurist.service';

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
  onerror: (event: { error?: string }) => void;
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
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full flex flex-col bg-jurist-card rounded-xl border border-gray-800 shadow-neon overflow-hidden relative animate-fadeIn">
      <!-- Loading Overlay -->
      @if (saving()) {
        <div class="absolute inset-0 bg-black/60 z-50 flex items-center justify-center">
           <div class="bg-gray-900 p-6 rounded-xl border border-jurist-orange flex flex-col items-center gap-4">
             <div class="w-8 h-8 border-4 border-jurist-orange border-t-transparent rounded-full animate-spin"></div>
             <span class="text-white font-bold">Salvăm Dosarul...</span>
           </div>
        </div>
      }

      <!-- Header -->
      <div class="p-6 border-b border-gray-800 bg-jurist-dark flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 class="text-2xl font-bold text-jurist-orange mb-1">Calendar & Termene</h2>
           <p class="text-sm text-gray-400">Management dosare • Termene procedurale • Memento</p>
        </div>
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div class="relative flex-grow">
            <input 
              type="text" 
              [(ngModel)]="searchQuery" 
              placeholder="Caută dosar..." 
              class="bg-black border border-gray-700 rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:border-jurist-orange outline-none w-full md:w-64"
            >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          @if (juristService.readyAlertsCount() > 0) {
            <button (click)="syncWhatsAppAlerts()" class="bg-green-600 hover:bg-green-500 text-white px-4 py-2 justify-center rounded-lg text-sm transition-colors flex items-center gap-2 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.38-.433 2.16-1.522 3.166-1.554 3.195a.25.25 0 00.31.365c1.94-.783 3.32-1.42 4.103-1.87 1.543.593 3.18.88 4.868.88z" />
              </svg>
              <span class="hidden sm:inline">Trimite Alerte ({{juristService.readyAlertsCount()}})</span>
            </button>
          }
          <button (click)="openModal(null)" class="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 justify-center rounded-lg text-sm border border-gray-600 transition-colors flex items-center gap-2 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span class="hidden sm:inline">Dosar Nou</span>
          </button>
        </div>
      </div>

      <!-- Mobile Tabs Switcher -->
      <div class="lg:hidden flex border-b border-gray-800 bg-gray-900/50">
        <button 
          (click)="mobileTab.set('agenda')" 
          [class]="'flex-1 py-3 text-sm font-bold transition-colors ' + (mobileTab() === 'agenda' ? 'text-jurist-orange border-b-2 border-jurist-orange' : 'text-gray-400')"
        >
          📅 Agenda
        </button>
        <button 
          (click)="mobileTab.set('calculator')" 
          [class]="'flex-1 py-3 text-sm font-bold transition-colors ' + (mobileTab() === 'calculator' ? 'text-jurist-orange border-b-2 border-jurist-orange' : 'text-gray-400')"
        >
          🤖 Calculator AI
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-4 lg:p-6 flex flex-col lg:flex-row gap-6 animate-slideUp">
        
        <!-- Timeline View (Agenda) -->
        <div [class]="'flex-1 space-y-6 ' + (mobileTab() === 'agenda' ? 'block' : 'hidden lg:block')">
          <h3 class="text-white font-bold mb-4 pl-2 border-l-4 border-jurist-orange hidden lg:block">Agenda Următoare</h3>
          
          <div class="space-y-4">
              @for (event of filteredEvents(); track event.id) {
                <div (click)="openModal(event)" (keyup.enter)="openModal(event)" tabindex="0" class="bg-gray-900 border border-gray-800 p-4 sm:p-5 rounded-xl flex items-start gap-3 sm:gap-4 hover:border-jurist-orange transition-all cursor-pointer relative overflow-hidden group">
                  <button (click)="$event.stopPropagation(); confirmDelete(event.id)" class="absolute top-2 right-2 text-gray-500 hover:text-red-500 transition-colors p-2 z-10 opacity-0 group-hover:opacity-100" title="Șterge Dosar">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                  <!-- Date Badge -->
                 <div class="bg-gray-800 rounded-lg p-2 text-center min-w-[70px] sm:min-w-[80px] self-stretch flex flex-col justify-center">
                   <span class="block text-xs text-gray-400 uppercase">{{ event.date | date:'MMM' }}</span>
                   <span class="block text-2xl sm:text-3xl font-bold text-white">{{ event.date | date:'dd' }}</span>
                   <span class="block text-[10px] sm:text-xs text-gray-400 font-mono">{{ event.time }}</span>
                 </div>
                 
                 <!-- Content -->
                 <div class="flex-1 min-w-0">
                   <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                     <div class="min-w-0">
                       <h4 class="text-base sm:text-lg font-bold text-white truncate pr-2">{{ event.title }}</h4>
                       <p class="text-jurist-orange text-xs sm:text-sm font-semibold truncate">{{ event.clientName }}</p>
                     </div>
                     <span [class]="getBadgeClass(event.type) + ' self-start sm:self-auto'">{{ getTypeLabel(event.type) }}</span>
                   </div>
                   
                   <p class="text-gray-400 text-xs sm:text-sm mt-1 italic truncate">{{ event.caseObject }}</p>
                   
                   <!-- FIX: Financial Mini-Status & Alerts (Wrapped for mobile) -->
                   <div class="mt-3 flex flex-wrap items-center justify-between gap-y-2 text-xs border-t border-gray-800 pt-2">
                     <div class="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono w-full sm:w-auto">
                       <span class="text-gray-400 whitespace-nowrap">Total: <span class="text-white">{{ event.financial.total }}</span></span>
                       <span [class]="(event.financial.rest > 0 ? 'text-red-400' : 'text-green-500') + ' whitespace-nowrap'">
                         Rest: {{ event.financial.rest }}
                       </span>
                     </div>
                     @if (event.whatsappAlert && !event.whatsappAlertSent) {
                        <div [class]="'flex items-center gap-1 ml-auto sm:ml-0 px-2 py-0.5 rounded border ' + (juristService.isWithinAlertWindow(event) ? 'text-jurist-orange animate-pulse bg-orange-400/10 border-orange-400/20' : 'text-gray-400 bg-gray-800/40 border-gray-850')">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-clock-history" viewBox="0 0 16 16">
                            <path d="M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022l-.074.997zm2.004.45a7.003 7.003 0 0 0-1.026-.645l.389-.92a8.006 8.006 0 0 1 1.137.712l-.4.853zm2.148 1.144c.376.327.71.697 1.002 1.104l-.84.538a6.002 6.002 0 0 0-.853-.941l.69-.701-.001-.001zm1.205 1.74a7.006 7.006 0 0 0-.645-1.026l.92-.389c.28.618.508 1.272.673 1.954l-.948.311zm.45 2.004c.158.468.257.962.292 1.472l-.997.074a6.012 6.012 0 0 0-.25-1.258l.955-.288zM15 8h-1a6.002 6.002 0 0 0-3.32-5.367l.454-.891A7.002 7.002 0 0 1 15 8zm-7-7v1c-3.313 0-6 2.687-6 6s2.687 6 6 6 6-2.687 6-6h1c0 3.866-3.134 7-7 7s-7-3.134-7-7 3.134-7 7-7h.001A8.995 8.995 0 0 1 15 8h-1a7.994 7.994 0 0 0-.485-2.716l.89-.453A8.993 8.993 0 0 1 15 8h1A9 9 0 0 0 8 0h-.001z"/>
                            <path d="M8.5 4.5a.5.5 0 0 0-1 0v3.793l2.146 2.147a.5.5 0 0 0 .708-.708L8.5 7.793V4.5z"/>
                          </svg>
                          <span class="text-[10px] font-bold">{{ juristService.isWithinAlertWindow(event) ? 'Alertă Pregătită' : 'WhatsApp Activ' }}</span>
                        </div>
                     }
                      @if (event.whatsappAlert && event.whatsappAlertSent) {
                        <div class="flex items-center gap-1 text-green-400 ml-auto sm:ml-0 bg-green-400/10 px-2 py-0.5 rounded border border-green-400/20">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                             <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l2.052 2.093 5.378-5.385a.258.258 0 0 1 .042-.062z"/>
                          </svg>
                          <span class="text-[10px] font-bold">Alertă Transmisă</span>
                        </div>
                     }
                   </div>
                 </div>
                 
                 <!-- Edit Icon on Hover (Desktop) / Always Visible (Mobile - Optional, but keeping clean) -->
                 <div class="hidden sm:block absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div class="bg-jurist-orange p-2 rounded-full text-black shadow-neon">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                      </svg>
                    </div>
                 </div>
               </div>
             }
             
             @if (juristService.events().length === 0) {
               <div class="text-center text-gray-600 py-10">Nu există dosare programate.</div>
             }
          </div>
        </div>

        <!-- Modern Procedural Deadline Calculator Panel -->
        <div [class]="'w-full lg:w-[420px] xl:w-[460px] bg-gray-900/70 lg:border-l border-gray-800 lg:p-6 p-4 rounded-xl lg:rounded-none flex flex-col shrink-0 ' + (mobileTab() === 'calculator' ? 'block' : 'hidden lg:flex')">
          
          <!-- Header & Mode Tabs -->
          <div class="mb-4">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-jurist-orange font-bold flex items-center gap-2 text-base">
                <span>⚖️</span> Calculator Termene Procedurale
              </h3>
              <span class="text-[10px] bg-jurist-orange/10 text-jurist-orange px-2 py-0.5 rounded font-mono font-bold border border-jurist-orange/20">Art. 181 CPC</span>
            </div>
            <p class="text-xs text-gray-400">Calcul automat pe zile libere, prorogare weekend și sărbători legale RO.</p>
          </div>

          <!-- Calculator Sub-mode Switcher -->
          <div class="flex bg-black/60 p-1 rounded-xl border border-gray-800 mb-4">
            <button 
              (click)="calcMode.set('cpc')" 
              [class]="'flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ' + (calcMode() === 'cpc' ? 'bg-jurist-orange text-black shadow-md' : 'text-gray-400 hover:text-white')"
            >
              <span>⚡</span> Standard CPC
            </button>
            <button 
              (click)="calcMode.set('ai')" 
              [class]="'flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ' + (calcMode() === 'ai' ? 'bg-jurist-orange text-black shadow-md' : 'text-gray-400 hover:text-white')"
            >
              <span>🤖</span> Asistent AI Spețe
            </button>
          </div>

          @if (calcMode() === 'cpc') {
            <!-- STANDARD CPC CALCULATOR -->
            <div class="space-y-4">
              
              <!-- Quick Presets -->
              <div>
                <div class="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Preseturi Termene Legale</div>
                <div class="grid grid-cols-2 gap-1.5">
                  <button 
                    type="button"
                    (click)="applyPreset('apel')" 
                    [class]="'text-left p-2 rounded-lg text-xs font-semibold border transition-all ' + (activePreset() === 'apel' ? 'bg-jurist-orange/15 border-jurist-orange text-jurist-orange' : 'bg-black/40 border-gray-800 text-gray-300 hover:border-gray-700')"
                  >
                    <div class="font-bold flex items-center justify-between">
                      <span>Apel / Recurs</span>
                      <span class="text-[10px] font-mono">30 zile</span>
                    </div>
                    <span class="text-[10px] text-gray-500 block">Art. 468 / 485 CPC</span>
                  </button>

                  <button 
                    type="button"
                    (click)="applyPreset('intampinare')" 
                    [class]="'text-left p-2 rounded-lg text-xs font-semibold border transition-all ' + (activePreset() === 'intampinare' ? 'bg-jurist-orange/15 border-jurist-orange text-jurist-orange' : 'bg-black/40 border-gray-800 text-gray-300 hover:border-gray-700')"
                  >
                    <div class="font-bold flex items-center justify-between">
                      <span>Întâmpinare</span>
                      <span class="text-[10px] font-mono">25 zile</span>
                    </div>
                    <span class="text-[10px] text-gray-500 block">Art. 201 CPC</span>
                  </button>

                  <button 
                    type="button"
                    (click)="applyPreset('contestatie')" 
                    [class]="'text-left p-2 rounded-lg text-xs font-semibold border transition-all ' + (activePreset() === 'contestatie' ? 'bg-jurist-orange/15 border-jurist-orange text-jurist-orange' : 'bg-black/40 border-gray-800 text-gray-300 hover:border-gray-700')"
                  >
                    <div class="font-bold flex items-center justify-between">
                      <span>Contestație Executare</span>
                      <span class="text-[10px] font-mono">15 zile</span>
                    </div>
                    <span class="text-[10px] text-gray-500 block">Art. 715 CPC</span>
                  </button>

                  <button 
                    type="button"
                    (click)="applyPreset('plangere_contraventionala')" 
                    [class]="'text-left p-2 rounded-lg text-xs font-semibold border transition-all ' + (activePreset() === 'plangere_contraventionala' ? 'bg-jurist-orange/15 border-jurist-orange text-jurist-orange' : 'bg-black/40 border-gray-800 text-gray-300 hover:border-gray-700')"
                  >
                    <div class="font-bold flex items-center justify-between">
                      <span>Plângere PV</span>
                      <span class="text-[10px] font-mono">15 zile</span>
                    </div>
                    <span class="text-[10px] text-gray-500 block">O.G. nr. 2/2001</span>
                  </button>

                  <button 
                    type="button"
                    (click)="applyPreset('ordonanta_presedintiala')" 
                    [class]="'text-left p-2 rounded-lg text-xs font-semibold border transition-all ' + (activePreset() === 'ordonanta_presedintiala' ? 'bg-jurist-orange/15 border-jurist-orange text-jurist-orange' : 'bg-black/40 border-gray-800 text-gray-300 hover:border-gray-700')"
                  >
                    <div class="font-bold flex items-center justify-between">
                      <span>Ordonanță Președințială</span>
                      <span class="text-[10px] font-mono">5 zile</span>
                    </div>
                    <span class="text-[10px] text-gray-500 block">Art. 999 CPC</span>
                  </button>

                  <button 
                    type="button"
                    (click)="applyPreset('custom')" 
                    [class]="'text-left p-2 rounded-lg text-xs font-semibold border transition-all ' + (activePreset() === 'custom' ? 'bg-jurist-orange/15 border-jurist-orange text-jurist-orange' : 'bg-black/40 border-gray-800 text-gray-300 hover:border-gray-700')"
                  >
                    <div class="font-bold flex items-center justify-between">
                      <span>Personalizat</span>
                      <span class="text-[10px] font-mono">Manual</span>
                    </div>
                    <span class="text-[10px] text-gray-500 block">Zile / Luni la alegere</span>
                  </button>
                </div>
              </div>

              <!-- Input Parameters -->
              <div class="bg-black/40 p-3.5 rounded-xl border border-gray-800 space-y-3">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div class="flex items-center justify-between mb-1">
                      <label for="commDate" class="text-[10px] font-bold text-gray-400 uppercase">Data Comunicării</label>
                      <div class="flex gap-1">
                        <button type="button" (click)="setStartDateToToday()" class="text-[9px] bg-gray-800 hover:bg-gray-700 text-jurist-orange px-1.5 py-0.5 rounded font-bold border border-gray-700 transition-colors">Azi</button>
                        <button type="button" (click)="setStartDateDaysAgo(1)" class="text-[9px] bg-gray-800 hover:bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded font-medium border border-gray-700 transition-colors">-1 zi</button>
                        <button type="button" (click)="setStartDateDaysAgo(15)" class="text-[9px] bg-gray-800 hover:bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded font-medium border border-gray-700 transition-colors">-15z</button>
                      </div>
                    </div>
                    <input 
                      id="commDate" 
                      type="date" 
                      [ngModel]="calcStartDate()" 
                      (ngModelChange)="onStartDateChange($event)"
                      (input)="onStartDateInput($event)"
                      (change)="onStartDateInput($event)"
                      class="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white focus:border-jurist-orange outline-none [color-scheme:dark]"
                    >
                  </div>
                  <div>
                    <div class="flex items-center justify-between mb-1">
                      <label for="termDuration" class="text-[10px] font-bold text-gray-400 uppercase">
                        {{ calcUnitsType() === 'months' ? 'Durată (Luni)' : 'Durată (Zile)' }}
                      </label>
                      <div class="flex gap-1">
                        <button type="button" (click)="setQuickDuration(5)" class="text-[9px] bg-gray-800 hover:bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded font-mono border border-gray-700">5z</button>
                        <button type="button" (click)="setQuickDuration(15)" class="text-[9px] bg-gray-800 hover:bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded font-mono border border-gray-700">15z</button>
                        <button type="button" (click)="setQuickDuration(25)" class="text-[9px] bg-gray-800 hover:bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded font-mono border border-gray-700">25z</button>
                        <button type="button" (click)="setQuickDuration(30)" class="text-[9px] bg-gray-800 hover:bg-gray-700 text-jurist-orange px-1.5 py-0.5 rounded font-mono font-bold border border-gray-700">30z</button>
                      </div>
                    </div>
                    <input 
                      id="termDuration" 
                      type="number" 
                      min="1" 
                      [ngModel]="calcDuration()" 
                      (ngModelChange)="onDurationInput($event)"
                      (input)="onDurationEvent($event)"
                      class="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white focus:border-jurist-orange outline-none font-mono"
                    >
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label for="calcUnits" class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Sistem de calcul</label>
                    <select 
                      id="calcUnits" 
                      [ngModel]="calcUnitsType()" 
                      (ngModelChange)="onUnitsTypeChange($event)"
                      class="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white focus:border-jurist-orange outline-none cursor-pointer"
                    >
                      <option value="free_days">Zile libere (Art. 181 alin. 1 pct. 2)</option>
                      <option value="calendar_days">Zile pline (Calendaristice)</option>
                      <option value="months">Pe luni (Art. 181 alin. 1 pct. 3)</option>
                    </select>
                  </div>
                  <div>
                    <label for="limitHour" class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Ora limită depunere</label>
                    <select 
                      id="limitHour" 
                      [ngModel]="calcSubmissionChannel()" 
                      (ngModelChange)="calcSubmissionChannel.set($event)"
                      class="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white focus:border-jurist-orange outline-none cursor-pointer"
                    >
                      <option value="postal">24:00 (Poștă / E-mail Art. 183)</option>
                      <option value="registry">16:00 (Registratura Instanței)</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- LIVE RESULTS CARD -->
              <div class="bg-gradient-to-br from-gray-900 via-black to-gray-900 border-2 border-jurist-orange/40 rounded-xl p-4 shadow-xl relative overflow-hidden">
                <div class="absolute top-0 right-0 w-24 h-24 bg-jurist-orange/10 rounded-full blur-2xl pointer-events-none"></div>
                
                <div class="flex items-center justify-between text-xs text-gray-400 mb-2">
                  <span class="font-bold text-jurist-orange uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <span class="inline-block w-2 h-2 rounded-full bg-jurist-orange animate-pulse"></span>
                    Data Limită a Termenului
                  </span>
                  <span class="text-[10px] font-mono text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
                    {{ computedDeadline().daysRemainingText }}
                  </span>
                </div>

                <!-- Main Date Display -->
                <div class="mb-3">
                  <div class="text-xl sm:text-2xl font-black text-white capitalize leading-tight">
                    {{ computedDeadline().formattedDate }}
                  </div>
                  <div class="text-xs text-gray-400 font-mono mt-0.5 flex items-center gap-2">
                    <span>🕒 Până la ora <b>{{ calcSubmissionChannel() === 'postal' ? '24:00' : '16:00' }}</b></span>
                    <span>•</span>
                    <span class="text-gray-500">{{ calcSubmissionChannel() === 'postal' ? 'Art. 183 CPC' : 'Grefa instanței' }}</span>
                  </div>
                </div>

                <!-- Prorogation Notice Badge -->
                @if (computedDeadline().isProrogued) {
                  <div class="mb-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-start gap-2">
                    <span class="text-base shrink-0">ℹ️</span>
                    <div>
                      <b class="font-bold">Termen prorogat conform Art. 181 alin. (2) CPC!</b>
                      <p class="text-amber-200/80 text-[10px] mt-0.5">{{ computedDeadline().prorogationReason }}</p>
                    </div>
                  </div>
                }

                <!-- Timeline Accordion / Details -->
                <div class="border-t border-gray-800 pt-3 space-y-2 text-xs">
                  <div class="flex justify-between items-center text-gray-400">
                    <span>Comunicare (dies a quo):</span>
                    <span class="font-mono text-white font-semibold">{{ computedDeadline().startDateFormatted }}</span>
                  </div>
                  <div class="flex justify-between items-center text-gray-400">
                    <span>Durată aplicată:</span>
                    <span class="font-mono text-white font-semibold">{{ computedDeadline().durationLabel }}</span>
                  </div>
                  <div class="flex justify-between items-center text-gray-400">
                    <span>Data teoretică împlinire:</span>
                    <span class="font-mono text-gray-300">{{ computedDeadline().theoreticalDateFormatted }}</span>
                  </div>
                </div>

                <!-- Action Buttons -->
                <div class="mt-4 pt-3 border-t border-gray-800/80 grid grid-cols-2 gap-2">
                  <button 
                    type="button" 
                    (click)="addCalculatedDeadlineToAgenda()" 
                    class="bg-jurist-orange hover:bg-orange-600 text-black text-xs font-black py-2.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                  >
                    <span>➕</span> Adaugă în Agendă
                  </button>
                  <button 
                    type="button" 
                    (click)="copyDeadlineSummary()" 
                    class="bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold py-2.5 px-3 rounded-lg border border-gray-700 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <span>📋</span> Copiază Notă
                  </button>
                </div>
              </div>
            </div>
          } @else {
            <!-- AI ASSISTANT SPEȚE & SITUAȚII COMPLEXE -->
            <div class="space-y-3 flex-1 flex flex-col">
              <p class="text-xs text-gray-400 leading-relaxed">
                Adresați AI-ului spețe atipice (afișare pe ușă, repunere în termen art. 186, vacanță judecătorească, calcul pe ore).
              </p>

              <!-- Prompt Quick Chips -->
              <div class="flex flex-wrap gap-1.5">
                <button 
                  type="button"
                  (click)="aiPrompt = 'Hotărârea a fost comunicată prin afișare la ușă pe 10 martie 2026. Când curge termenul de apel?'"
                  class="text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-1 rounded border border-gray-700"
                >
                  📌 Comunicare prin afișare
                </button>
                <button 
                  type="button"
                  (click)="aiPrompt = 'Cum se calculează termenul de 15 zile dacă cererea de repunere în termen este formulată conform art. 186 CPC?'"
                  class="text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-1 rounded border border-gray-700"
                >
                  📌 Repunere în termen (art. 186)
                </button>
                <button 
                  type="button"
                  (click)="aiPrompt = 'Termenul de apel s-a împlinit în timpul vacanței judecătorești. Se suspendă sau curge normal?'"
                  class="text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-1 rounded border border-gray-700"
                >
                  📌 Vacanță Judecătorească
                </button>
              </div>

              <div class="relative flex-1">
                <textarea 
                  [(ngModel)]="aiPrompt"
                  rows="4" 
                  class="w-full bg-black border border-gray-700 rounded-xl p-3 text-xs text-white focus:border-jurist-orange outline-none leading-relaxed"
                  placeholder="Ex: Am primit sentința prin poștă cu confirmare de primire vineri 15 mai. Când expiră termenul de apel?"
                ></textarea>
              </div>

              <button 
                (click)="askAI()"
                [disabled]="!aiPrompt || juristService.isLoading()"
                class="w-full bg-jurist-orange hover:bg-orange-600 text-black font-black py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 text-xs shadow-md disabled:opacity-40"
              >
                @if(juristService.isLoading()) {
                  <div class="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                }
                Calculează cu JuristPRO AI
              </button>

              @if (dateResult()) {
                <div class="mt-3 p-3.5 bg-gray-800/90 rounded-xl border border-jurist-orange/30 shadow-lg relative animate-fadeIn">
                  <div class="text-[10px] font-bold text-jurist-orange mb-1">REZULTAT ANALIZĂ AI</div>
                  <div class="text-sm font-bold text-white mb-2">{{ dateResult() }}</div>
                  
                  <button (click)="showMethodology.set(!showMethodology())" class="text-[11px] text-jurist-orange hover:underline font-semibold">
                    {{ showMethodology() ? 'Ascunde argumentația' : 'Vezi temeiurile legale și detaliile' }}
                  </button>
                  
                  @if (showMethodology() && methodologyResult()) {
                    <div class="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                      {{ methodologyResult() }}
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>
      </div>

      <!-- Edit/Create Modal - CLEAN STABLE DESIGN -->
      @if (showModal()) {
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div class="bg-gray-900 border-x-0 border-y sm:border border-gray-800 sm:rounded-2xl w-full h-[100dvh] sm:h-auto sm:max-h-[95vh] max-w-2xl shadow-2xl flex flex-col overflow-hidden">
            
            <div class="p-4 sm:p-6 border-b border-gray-800 flex justify-between items-center bg-jurist-dark shrink-0">
              <div class="flex items-center gap-3">
                <div class="w-3 h-3 rounded-full bg-jurist-orange animate-pulse"></div>
                <h3 class="text-xl text-white font-bold">{{ editingEvent.id ? 'Editare Dosar' : 'Constituire Dosar Nou' }}</h3>
              </div>
              <button (click)="closeModal()" class="text-gray-400 hover:text-white p-2 hover:bg-gray-800 rounded-lg transition-colors">✕</button>
            </div>

            <div class="flex-1 overflow-y-auto p-6 space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="caseTitle" class="block text-xs font-bold text-gray-400 uppercase mb-1">Număr / Titlu Dosar</label>
                  <input id="caseTitle" [(ngModel)]="editingEvent.title" placeholder="Ex: 1234/3/2024" class="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-jurist-orange outline-none transition-all">
                </div>
                <div>
                  <label for="caseType" class="block text-xs font-bold text-gray-400 uppercase mb-1">Tipologie</label>
                  <select id="caseType" [(ngModel)]="editingEvent.type" class="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-jurist-orange outline-none cursor-pointer">
                    <option value="court">Instanță Judecătorească</option>
                    <option value="deadline">Termen Procedural</option>
                    <option value="meeting">Întâlnire Client</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="caseDate" class="block text-xs font-bold text-gray-400 uppercase mb-1">Data</label>
                  <input id="caseDate" type="date" [(ngModel)]="editingEvent.date" class="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-jurist-orange outline-none [color-scheme:dark]">
                </div>
                <div>
                  <label for="caseTime" class="block text-xs font-bold text-gray-400 uppercase mb-1">Ora</label>
                  <input id="caseTime" type="time" [(ngModel)]="editingEvent.time" class="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-jurist-orange outline-none [color-scheme:dark]">
                </div>
              </div>

              <div>
                <label for="caseClient" class="block text-xs font-bold text-gray-400 uppercase mb-1">Client Beneficiar</label>
                <input id="caseClient" [(ngModel)]="editingEvent.clientName" placeholder="Nume client" class="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-jurist-orange outline-none transition-all">
              </div>

              <div>
                <label for="caseDetails" class="block text-xs font-bold text-gray-400 uppercase mb-1">Instanța / Detalii Locație</label>
                <input id="caseDetails" [(ngModel)]="editingEvent.details" placeholder="Ex: Judecătoria Sector 1" class="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-jurist-orange outline-none transition-all">
              </div>

              <div class="bg-gray-800/20 p-5 rounded-xl border border-gray-800 shadow-inner">
                <span class="block text-xs font-bold text-gray-500 uppercase mb-4 border-l-2 border-green-500 pl-2">Gestiune Financiară (RON)</span>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label for="caseTotal" class="text-[10px] text-gray-400 block mb-1">Onorariu Total</label>
                    <input id="caseTotal" type="number" [(ngModel)]="editingEvent.financial.total" class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-white outline-none focus:border-green-500">
                  </div>
                  <div>
                    <label for="casePaid" class="text-[10px] text-gray-400 block mb-1">Suma Încasată</label>
                    <input id="casePaid" type="number" [(ngModel)]="editingEvent.financial.paid" class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-white outline-none focus:border-green-500">
                  </div>
                </div>
                <div class="mt-4 pt-3 border-t border-gray-800 flex justify-between items-center text-sm">
                  <span class="text-gray-400 font-medium">Rest de plată estimat:</span>
                  <span class="font-bold text-jurist-orange text-lg">{{ (editingEvent.financial.total || 0) - (editingEvent.financial.paid || 0) }} RON</span>
                </div>
              </div>

              <div>
                <div class="flex justify-between items-center mb-2">
                  <label for="caseNotes" class="block text-xs font-bold text-gray-400 uppercase">Strategie & Note Tactice</label>
                  <button type="button" (click)="toggleDictation()" [class]="'flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black transition-all border shadow-lg ' + (isListening() ? 'bg-red-600 text-white border-red-500 animate-pulse' : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-jurist-orange hover:text-white')">
                    @if (isListening()) {
                      <span class="relative flex h-2 w-2">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                      </span>
                    }
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                    </svg>
                    {{ isListening() ? 'ASCULT...' : 'DICTARE VOCALĂ' }}
                  </button>
                </div>
                @if (isInIframe()) {
                  <div class="bg-jurist-orange/10 border border-jurist-orange/30 rounded-xl p-4 mb-4 animate-pulse">
                    <p class="text-xs text-jurist-orange font-bold flex items-center gap-2 mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.38c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                      RESTRICȚIE BROWSER (MICROFON)
                    </p>
                    <p class="text-[10px] text-gray-300 leading-relaxed mb-3">
                      Browserele blochează accesul la microfon în ferestrele tip iframe (AI Studio). Pentru a folosi dictarea, trebuie să deschideți aplicația într-o filă nouă!
                    </p>
                    <button type="button" (click)="openInNewTab()" class="w-full bg-jurist-orange hover:bg-orange-600 text-black text-[10px] font-black py-2 rounded-lg transition-all flex items-center justify-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4 text-black">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                      DESCHIDE ÎN TAB NOU
                    </button>
                  </div>
                }
                <textarea id="caseNotes" [(ngModel)]="editingEvent.notes" rows="5" class="w-full bg-black border border-gray-700 rounded-xl p-4 text-sm text-gray-200 focus:border-jurist-orange outline-none resize-none transition-all placeholder-gray-800" placeholder="Strategia, probe, martori propuși..."></textarea>
              </div>

              <div class="flex items-center gap-4 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10 hover:border-emerald-500/30 transition-all group">
                <div class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" id="alert" [(ngModel)]="editingEvent.whatsappAlert" class="w-5 h-5 accent-jurist-orange cursor-pointer">
                </div>
                <label for="alert" class="text-sm text-gray-300 cursor-pointer select-none">
                  <span class="font-bold text-white block">Alerte WhatsApp Automate</span>
                  <span class="text-xs text-gray-500 group-hover:text-gray-400">Primiți o notificare pe WhatsApp cu 24h înainte.</span>
                </label>
              </div>
            </div>

            <div class="p-4 sm:p-6 border-t border-gray-800 flex flex-col sm:flex-row justify-between gap-3 bg-jurist-dark">
              @if (editingEvent.id) {
                <button type="button" (click)="confirmDelete(editingEvent.id)" class="order-3 sm:order-1 px-4 py-3 sm:py-2.5 rounded-xl text-red-500 hover:bg-red-500/10 font-bold transition-all flex items-center justify-center sm:justify-start gap-2 border border-red-500/20 sm:border-transparent w-full sm:w-auto mt-2 sm:mt-0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  Șterge Dosar
                </button>
              }
              <div class="flex flex-col-reverse sm:flex-row gap-3 w-full sm:w-auto sm:ml-auto order-1 sm:order-2">
                <button type="button" (click)="closeModal()" class="w-full sm:w-auto px-6 py-3 sm:py-2.5 rounded-xl text-gray-400 hover:text-white font-bold transition-colors bg-gray-800 sm:bg-transparent">Renunță</button>
                <button type="button" (click)="saveEvent()" [disabled]="saving() || !editingEvent.title" class="w-full sm:w-auto bg-jurist-orange hover:bg-orange-600 text-black px-10 py-3 sm:py-2.5 rounded-xl font-black transition-all active:scale-95 disabled:opacity-30 shadow-lg flex items-center justify-center gap-2">
                  @if (saving()) {
                    <div class="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                  }
                  {{ editingEvent.id ? 'Actualizează Dosar' : 'Salvează Dosar' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- WhatsApp Alert Queue Assistant Modal -->
      @if (showQueueModal() && queueAlertsList().length > 0) {
        <div class="fixed inset-0 z-[120] flex items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-md animate-fadeIn">
          <div class="bg-gray-900 border-x-0 border-y sm:border border-gray-800 sm:rounded-2xl w-full h-[100dvh] sm:h-auto max-w-lg shadow-2xl flex flex-col overflow-hidden">
            
            <div class="p-4 sm:p-6 border-b border-gray-800 flex justify-between items-center bg-jurist-dark shrink-0">
              <div class="flex items-center gap-3">
                <div class="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                <h3 class="text-xl text-white font-bold">Asistent Alerte WhatsApp</h3>
              </div>
              <button (click)="closeQueueModal()" class="text-gray-400 hover:text-white p-2 hover:bg-gray-800 rounded-lg transition-colors">✕</button>
            </div>

            <div class="flex-1 overflow-y-auto p-6 space-y-6">
              <!-- Progress Bar -->
              <div>
                <div class="flex justify-between text-xs text-gray-400 font-mono mb-2">
                  <span>PROGRES TRIMITERE</span>
                  <span>{{ currentQueueIndex() + 1 }} din {{ queueAlertsList().length }}</span>
                </div>
                <div class="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div class="h-full bg-green-500 transition-all duration-300" 
                       [style.width.%]="((currentQueueIndex() + 1) / queueAlertsList().length) * 100">
                  </div>
                </div>
              </div>

              <!-- Active Alert Client Snapshot -->
              <div class="bg-black/50 p-5 rounded-2xl border border-gray-800 space-y-2">
                <div class="flex justify-between items-start">
                  <div>
                    <span class="text-[10px] font-bold text-jurist-orange uppercase tracking-wider block mb-1">Destinatar</span>
                    <h4 class="text-md font-bold text-white">{{ queueAlertsList()[currentQueueIndex()].clientName }}</h4>
                    <p class="text-xs font-mono text-gray-400">
                      {{ juristService.profile().phone || 'Telefon nespecificat' }}
                    </p>
                  </div>
                  <span class="bg-gray-800 text-white text-[10px] uppercase font-mono px-2 py-1 rounded border border-gray-700">
                    {{ queueAlertsList()[currentQueueIndex()].time }}
                  </span>
                </div>

                <div class="border-t border-gray-800/60 pt-2 flex flex-col gap-1 text-xs">
                  <div class="text-gray-500">Dosar / Cauză:</div>
                  <div class="text-red-400 font-semibold text-sm">{{ queueAlertsList()[currentQueueIndex()].title }}</div>
                  <div class="text-gray-400 italic text-xs mt-0.5">{{ queueAlertsList()[currentQueueIndex()].caseObject }}</div>
                </div>
              </div>

              <!-- Message Draft Box -->
              <div class="bg-green-500/5 border border-green-500/10 rounded-2xl p-4 space-y-2">
                <span class="text-[10px] font-extrabold text-green-400 uppercase tracking-widest block">Conținut Mesaj Programat</span>
                <p class="text-xs text-gray-300 leading-relaxed font-mono whitespace-pre-wrap select-all bg-black/40 p-3 rounded-lg border border-gray-850">Bună ziua, Av. {{ juristService.profile().full_name || 'Colegu' }} vă informează:
------------------------------
Dosar: {{ queueAlertsList()[currentQueueIndex()].title }}
Client: {{ queueAlertsList()[currentQueueIndex()].clientName }}
Obiect: {{ queueAlertsList()[currentQueueIndex()].caseObject }}
Termen: {{ queueAlertsList()[currentQueueIndex()].date }} la {{ queueAlertsList()[currentQueueIndex()].time }}
Locul: {{ queueAlertsList()[currentQueueIndex()].details || 'Nespecificat' }}

Note: {{ queueAlertsList()[currentQueueIndex()].notes || 'Făra note adiacente' }}
------------------------------
Mesaj generat de către JuristPRO AI</p>
                <p class="text-[10px] text-gray-500 leading-normal">
                  💡 *Notă:* Butonul va deschide interfața WhatsApp cu textul gata pregătit. După deschidere, următorul mesaj se va încărca automat în această listă.
                </p>
              </div>
            </div>

            <div class="p-4 sm:p-6 border-t border-gray-800 flex flex-col sm:flex-row justify-between gap-3 bg-jurist-dark shrink-0">
              <button type="button" (click)="skipActiveQueueItem()" class="w-full sm:w-auto px-6 py-3 sm:py-2.5 rounded-xl text-gray-400 hover:text-white font-bold transition-colors bg-gray-800 sm:bg-transparent order-2 sm:order-1">Omite Alerta</button>
              <button type="button" (click)="fireActiveQueueItem()" class="w-full sm:w-auto bg-green-600 hover:bg-green-500 text-white px-10 py-3 sm:py-2.5 rounded-xl font-bold transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 order-1 sm:order-2">
                Trimite pe WhatsApp
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class CalendarComponent implements OnInit, OnDestroy {
  juristService = inject(JuristService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  
  // --- PROCEDURAL DEADLINE CALCULATOR STATE ---
  calcMode = signal<'cpc' | 'ai'>('cpc');
  calcStartDate = signal<string>(new Date().toISOString().split('T')[0]);
  calcDuration = signal<number>(30);
  calcUnitsType = signal<'free_days' | 'calendar_days' | 'months'>('free_days');
  calcSubmissionChannel = signal<'postal' | 'registry'>('postal');
  activePreset = signal<'apel' | 'intampinare' | 'contestatie' | 'plangere_contraventionala' | 'ordonanta_presedintiala' | 'custom'>('apel');

  aiPrompt = '';
  searchQuery = signal('');
  dateResult = signal<string>('');
  methodologyResult = signal<string>('');
  showMethodology = signal(false);
  
  // New state for mobile tabs
  mobileTab = signal<'agenda' | 'calculator'>('agenda');
  
  showModal = signal(false);
  saving = signal(false);
  
  // WhatsApp alert queue assistant
  showQueueModal = signal(false);
  queueAlertsList = signal<CalendarEvent[]>([]);
  currentQueueIndex = signal(0);

  // Romanian Legal Holidays Dictionary (2024 - 2027)
  private readonly RO_HOLIDAYS: Record<string, string> = {
    // 2024
    '2024-01-01': 'Anul Nou',
    '2024-01-02': 'A doua zi de Anul Nou',
    '2024-01-06': 'Boboteaza',
    '2024-01-07': 'Sfântul Ioan Botezătorul',
    '2024-01-24': 'Ziua Unirii Principatelor Române',
    '2024-05-01': 'Ziua Muncii',
    '2024-05-03': 'Vinerea Mare',
    '2024-05-05': 'Paștele Ortodox',
    '2024-05-06': 'A doua zi de Paște',
    '2024-06-01': 'Ziua Copilului',
    '2024-06-23': 'Rusaliile',
    '2024-06-24': 'A doua zi de Rusalii',
    '2024-08-15': 'Adormirea Maicii Domnului',
    '2024-11-30': 'Sfântul Andrei',
    '2024-12-01': 'Ziua Națională a României',
    '2024-12-25': 'Crăciunul',
    '2024-12-26': 'A doua zi de Crăciun',
    // 2025
    '2025-01-01': 'Anul Nou',
    '2025-01-02': 'A doua zi de Anul Nou',
    '2025-01-06': 'Boboteaza',
    '2025-01-07': 'Sfântul Ioan Botezătorul',
    '2025-01-24': 'Ziua Unirii Principatelor Române',
    '2025-04-18': 'Vinerea Mare',
    '2025-04-20': 'Paștele Ortodox',
    '2025-04-21': 'A doua zi de Paște',
    '2025-05-01': 'Ziua Muncii',
    '2025-06-01': 'Ziua Copilului',
    '2025-06-08': 'Rusaliile',
    '2025-06-09': 'A doua zi de Rusalii',
    '2025-08-15': 'Adormirea Maicii Domnului',
    '2025-11-30': 'Sfântul Andrei',
    '2025-12-01': 'Ziua Națională a României',
    '2025-12-25': 'Crăciunul',
    '2025-12-26': 'A doua zi de Crăciun',
    // 2026
    '2026-01-01': 'Anul Nou',
    '2026-01-02': 'A doua zi de Anul Nou',
    '2026-01-06': 'Boboteaza',
    '2026-01-07': 'Sfântul Ioan Botezătorul',
    '2026-01-24': 'Ziua Unirii Principatelor Române',
    '2026-04-10': 'Vinerea Mare',
    '2026-04-12': 'Paștele Ortodox',
    '2026-04-13': 'A doua zi de Paște',
    '2026-05-01': 'Ziua Muncii',
    '2026-05-31': 'Rusaliile',
    '2026-06-01': 'Ziua Copilului & A doua zi de Rusalii',
    '2026-08-15': 'Adormirea Maicii Domnului',
    '2026-11-30': 'Sfântul Andrei',
    '2026-12-01': 'Ziua Națională a României',
    '2026-12-25': 'Crăciunul',
    '2026-12-26': 'A doua zi de Crăciun',
    // 2027
    '2027-01-01': 'Anul Nou',
    '2027-01-02': 'A doua zi de Anul Nou',
    '2027-01-06': 'Boboteaza',
    '2027-01-07': 'Sfântul Ioan Botezătorul',
    '2027-01-24': 'Ziua Unirii Principatelor Române',
    '2027-04-30': 'Vinerea Mare',
    '2027-05-01': 'Ziua Muncii',
    '2027-05-02': 'Paștele Ortodox',
    '2027-05-03': 'A doua zi de Paște',
    '2027-06-01': 'Ziua Copilului',
    '2027-06-20': 'Rusaliile',
    '2027-06-21': 'A doua zi de Rusalii',
    '2027-08-15': 'Adormirea Maicii Domnului',
    '2027-11-30': 'Sfântul Andrei',
    '2027-12-01': 'Ziua Națională a României',
    '2027-12-25': 'Crăciunul',
    '2027-12-26': 'A doua zi de Crăciun'
  };

  private formatLocalDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseLocalDate(str: string): Date {
    if (!str) return new Date();
    if (str.includes('-')) {
      const parts = str.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
      }
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? new Date() : d;
  }

  private isNonWorkingDay(date: Date): { isNonWorking: boolean; reason?: string } {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    if (dayOfWeek === 0) return { isNonWorking: true, reason: 'Duminică (zi de repaus săptămânal)' };
    if (dayOfWeek === 6) return { isNonWorking: true, reason: 'Sâmbătă (zi de repaus săptămânal)' };

    const isoDate = this.formatLocalDate(date);
    if (this.RO_HOLIDAYS[isoDate]) {
      return { isNonWorking: true, reason: `Sărbătoare Legală: ${this.RO_HOLIDAYS[isoDate]}` };
    }
    return { isNonWorking: false };
  }

  // Live computed deadline calculation adhering strictly to Romanian CPC Art. 181
  computedDeadline = computed(() => {
    const startStr = this.calcStartDate();
    const duration = Math.max(1, this.calcDuration() || 1);
    const units = this.calcUnitsType();

    if (!startStr) {
      return {
        formattedDate: 'Selectați data comunicării',
        rawDate: '',
        startDateFormatted: '',
        durationLabel: '',
        theoreticalDateFormatted: '',
        isProrogued: false,
        prorogationReason: '',
        daysRemainingText: ''
      };
    }

    const startDate = this.parseLocalDate(startStr);
    const theoreticalDate = new Date(startDate.getTime());

    if (units === 'free_days') {
      // Art. 181 alin. (1) pct. 2 CPC: Sistemul pe zile libere.
      // Nu se iau în calcul ziua de pornire (dies a quo) și ziua de împlinire (dies ad quem).
      // Adică adăugăm durata + 1 zi calendaristică.
      theoreticalDate.setDate(theoreticalDate.getDate() + duration + 1);
    } else if (units === 'calendar_days') {
      // Zile calendaristice standard
      theoreticalDate.setDate(theoreticalDate.getDate() + duration);
    } else if (units === 'months') {
      // Art. 181 alin. (1) pct. 3 CPC: Termenele pe luni se sfârșesc în ziua corespunzătoare din ultima lună
      const targetMonth = theoreticalDate.getMonth() + duration;
      const targetDay = theoreticalDate.getDate();
      theoreticalDate.setMonth(targetMonth);
      if (theoreticalDate.getDate() !== targetDay) {
        // Dacă luna următoare are mai puține zile, se împlinește în ultima zi a lunii
        theoreticalDate.setDate(0);
      }
    }

    const theoreticalDateFormatted = theoreticalDate.toLocaleDateString('ro-RO', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    // Prorogation check according to Art. 181 alin. (2) CPC:
    // Când ultima zi cade într-o zi nelucrătoare, termenul se prelungește până la sfârșitul primei zile lucrătoare următoare.
    const finalDate = new Date(theoreticalDate.getTime());
    let isProrogued = false;
    const prorogationReasons: string[] = [];

    let check = this.isNonWorkingDay(finalDate);
    while (check.isNonWorking) {
      isProrogued = true;
      if (check.reason && !prorogationReasons.includes(check.reason)) {
        prorogationReasons.push(check.reason);
      }
      finalDate.setDate(finalDate.getDate() + 1);
      check = this.isNonWorkingDay(finalDate);
    }

    const finalIso = this.formatLocalDate(finalDate);
    const formattedDate = finalDate.toLocaleDateString('ro-RO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const startDateFormatted = startDate.toLocaleDateString('ro-RO', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    // Days remaining relative to today
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const finalMidnight = new Date(finalDate.getFullYear(), finalDate.getMonth(), finalDate.getDate());
    const diffTime = finalMidnight.getTime() - now.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    let daysRemainingText: string;
    if (diffDays > 0) {
      daysRemainingText = `⏳ ${diffDays} zile rămase`;
    } else if (diffDays === 0) {
      daysRemainingText = `🚨 Expiră ASTĂZI`;
    } else {
      daysRemainingText = `⚠️ Expirat de ${Math.abs(diffDays)} zile`;
    }

    let durationLabel = `${duration} zile libere (Art. 181 alin. 1 pct. 2 CPC)`;
    if (units === 'calendar_days') durationLabel = `${duration} zile calendaristice`;
    if (units === 'months') durationLabel = `${duration} ${duration === 1 ? 'lună' : 'luni'} (Art. 181 alin. 1 pct. 3 CPC)`;

    return {
      formattedDate,
      rawDate: finalIso,
      startDateFormatted,
      durationLabel,
      theoreticalDateFormatted,
      isProrogued,
      prorogationReason: prorogationReasons.join(' • '),
      daysRemainingText
    };
  });

  onStartDateChange(val: string) {
    if (val) {
      this.calcStartDate.set(val);
      this.activePreset.set('custom');
    }
  }

  onStartDateInput(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input && input.value) {
      this.calcStartDate.set(input.value);
      this.activePreset.set('custom');
    }
  }

  setStartDateToToday() {
    this.calcStartDate.set(this.formatLocalDate(new Date()));
    this.activePreset.set('custom');
  }

  setStartDateDaysAgo(days: number) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    this.calcStartDate.set(this.formatLocalDate(d));
    this.activePreset.set('custom');
  }

  setQuickDuration(days: number) {
    this.calcDuration.set(days);
    this.calcUnitsType.set('free_days');
    this.activePreset.set('custom');
  }

  onDurationEvent(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input) {
      const val = Number(input.value);
      if (val && !isNaN(val)) {
        this.calcDuration.set(val);
        this.activePreset.set('custom');
      }
    }
  }

  applyPreset(preset: 'apel' | 'intampinare' | 'contestatie' | 'plangere_contraventionala' | 'ordonanta_presedintiala' | 'custom') {
    this.activePreset.set(preset);
    if (preset === 'apel') {
      this.calcDuration.set(30);
      this.calcUnitsType.set('free_days');
    } else if (preset === 'intampinare') {
      this.calcDuration.set(25);
      this.calcUnitsType.set('free_days');
    } else if (preset === 'contestatie') {
      this.calcDuration.set(15);
      this.calcUnitsType.set('free_days');
    } else if (preset === 'plangere_contraventionala') {
      this.calcDuration.set(15);
      this.calcUnitsType.set('free_days');
    } else if (preset === 'ordonanta_presedintiala') {
      this.calcDuration.set(5);
      this.calcUnitsType.set('free_days');
    }
  }

  onDurationInput(val: number) {
    this.calcDuration.set(Number(val) || 1);
    this.activePreset.set('custom');
  }

  onUnitsTypeChange(val: 'free_days' | 'calendar_days' | 'months') {
    this.calcUnitsType.set(val);
    this.activePreset.set('custom');
  }

  addCalculatedDeadlineToAgenda() {
    const calc = this.computedDeadline();
    if (!calc.rawDate) return;

    this.editingEvent = JSON.parse(JSON.stringify(this.defaultEvent));
    this.editingEvent.id = '';
    this.editingEvent.date = calc.rawDate;
    this.editingEvent.time = this.calcSubmissionChannel() === 'postal' ? '23:59' : '16:00';
    this.editingEvent.type = 'deadline';
    
    let titlePreset = 'Termen Procedural';
    const preset = this.activePreset();
    if (preset === 'apel') titlePreset = 'Termen Apel / Recurs (30 zile)';
    else if (preset === 'intampinare') titlePreset = 'Termen Depunere Întâmpinare (25 zile)';
    else if (preset === 'contestatie') titlePreset = 'Termen Contestație Executare (15 zile)';
    else if (preset === 'plangere_contraventionala') titlePreset = 'Termen Plângere Contravențională (15 zile)';
    else if (preset === 'ordonanta_presedintiala') titlePreset = 'Termen Ordonanță Președințială (5 zile)';

    this.editingEvent.title = titlePreset;
    this.editingEvent.notes = `Data comunicării: ${calc.startDateFormatted}\nDurată calcul: ${calc.durationLabel}\nScadență: ${calc.formattedDate}\n${calc.isProrogued ? 'Prorogare aplicată: ' + calc.prorogationReason : ''}`;

    if (this.juristService.profile().phone) {
      this.editingEvent.whatsappAlert = true;
    }

    this.showModal.set(true);
    this.juristService.notificationService.info('Parametrii termenului au fost transferați în formularul de dosar!');
  }

  copyDeadlineSummary() {
    const calc = this.computedDeadline();
    const text = `NOTĂ CALCUL TERMEN PROCEDURAL (Art. 181 CPC)\n` +
      `----------------------------------------\n` +
      `Data Comunicării: ${calc.startDateFormatted}\n` +
      `Durată & Sistem: ${calc.durationLabel}\n` +
      `Data Teoretică: ${calc.theoreticalDateFormatted}\n` +
      `DATA LIMITĂ SCADENȚĂ: ${calc.formattedDate} (ora ${this.calcSubmissionChannel() === 'postal' ? '24:00' : '16:00'})\n` +
      (calc.isProrogued ? `Mențiune Prorogare: ${calc.prorogationReason}\n` : '') +
      `----------------------------------------\n` +
      `Generat prin JuristPRO AI`;

    navigator.clipboard.writeText(text).then(() => {
      this.juristService.notificationService.success('Nota de calcul a fost copiată în clipboard!');
    }).catch(() => {
      this.juristService.notificationService.error('Eroare la copiere.');
    });
  }
  
  filteredEvents = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const events = this.juristService.events();
    if (!q) return events;
    return events.filter(e => 
      e.title.toLowerCase().includes(q) || 
      e.clientName.toLowerCase().includes(q) || 
      e.caseObject.toLowerCase().includes(q) ||
      e.details.toLowerCase().includes(q) ||
      e.notes.toLowerCase().includes(q)
    );
  });

  defaultEvent: CalendarEvent = {
    id: '',
    title: '',
    clientName: '',
    caseObject: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    type: 'court',
    details: '',
    notes: '',
    whatsappAlert: false,
    financial: { total: 0, paid: 0, rest: 0 }
  };

  // Local object for modal to decouple from signals during editing
  editingEvent: CalendarEvent = { ...this.defaultEvent };

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

  currentEventSignal = signal<Partial<CalendarEvent>>({ ...this.defaultEvent });
  
  get currentEvent() { return this.currentEventSignal(); }
  
  // Helper to update signal properties
  updateCurrentEvent(field: string, value: string | boolean | undefined) {
    this.currentEventSignal.update(s => ({ ...s, [field]: value }));
    console.log('Event updated:', field, value);
  }

  // Helper for nested financial field
  updateFinancial(field: 'total' | 'paid', value: number) {
    this.currentEventSignal.update(s => {
      const total = field === 'total' ? value : (s.financial?.total || 0);
      const paid = field === 'paid' ? value : (s.financial?.paid || 0);
      const rest = total - paid;
      return { 
        ...s, 
        financial: { total, paid, rest } 
      };
    });
  }

  constructor() {
    // Lazy-loaded speech recognition initialized on-demand
  }

  getBadgeClass(type: string) {
    switch(type) {
      case 'court': return 'px-2 py-0.5 rounded text-[10px] font-bold bg-red-900/50 text-red-200 border border-red-800 uppercase tracking-wide';
      case 'deadline': return 'px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-900/50 text-yellow-200 border border-yellow-800 uppercase tracking-wide';
      case 'meeting': return 'px-2 py-0.5 rounded text-[10px] font-bold bg-blue-900/50 text-blue-200 border border-blue-800 uppercase tracking-wide';
      default: return '';
    }
  }
  
  getTypeLabel(type: string) {
    switch(type) {
      case 'court': return 'Instanță';
      case 'deadline': return 'Termen';
      case 'meeting': return 'Întâlnire';
      default: return type;
    }
  }

  isInIframe() {
    return typeof window !== 'undefined' && window.self !== window.top;
  }

  openInNewTab() {
    if (typeof window !== 'undefined') {
      window.open(window.location.href, '_blank');
    }
  }

  async askAI() {
    if (!this.aiPrompt.trim()) return;

    this.dateResult.set("");
    this.methodologyResult.set("");
    this.showMethodology.set(true);
    
    try {
      this.juristService.toggleLoading(true);
      const res = await this.juristService.calculateDeadline(this.aiPrompt);
      
      let datePart = '';
      let methodologyPart = '';

      if (res.includes('METODOLOGIE:')) {
        const parts = res.split('METODOLOGIE:');
        datePart = parts[0].replace(/DATA:\s*/i, '').trim();
        methodologyPart = parts[1]?.trim() || '';
      } else if (res.toUpperCase().includes('DATA:')) {
        const lines = res.split('\n');
        const dataLine = lines.find(l => l.toUpperCase().includes('DATA:'));
        datePart = dataLine ? dataLine.replace(/DATA:\s*/i, '').trim() : '';
        methodologyPart = res.replace(dataLine || '', '').trim();
      } else {
        const lines = res.trim().split('\n').filter(l => l.trim().length > 0);
        datePart = lines[0] || 'Termen calculat';
        methodologyPart = lines.slice(1).join('\n');
      }

      this.dateResult.set(datePart || 'Rezultat Calcul');
      this.methodologyResult.set(methodologyPart || res);
      
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      this.dateResult.set("Notă de calcul");
      this.methodologyResult.set(`Nu s-a putut procesa automat: ${msg}. Vă rugăm să includeți data comunicării și numărul de zile (ex: 'Hotărâre comunicată pe 01.08.2026, termen apel 30 zile').`);
    } finally {
      this.juristService.toggleLoading(false);
    }
  }

  openModal(event: CalendarEvent | null) {
    if (event) {
      // Deep copy to local editing object
      this.editingEvent = JSON.parse(JSON.stringify(event));
    } else {
      this.editingEvent = JSON.parse(JSON.stringify(this.defaultEvent));
      this.editingEvent.id = ''; // Ensure it's empty for creation
      
      if (this.juristService.profile().phone) {
        this.editingEvent.whatsappAlert = true;
      }
    }
    this.showModal.set(true);
    this.cdr.detectChanges();
  }

  ngOnInit() {
    this.checkPendingAlerts();
  }

  // AUTOMATION: Proactively check for upcoming alerts that haven't been sent
  private checkPendingAlerts() {
    setTimeout(() => {
      const todayStr = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const pending = this.juristService.events().filter(e => 
        (e.date === todayStr || e.date === tomorrowStr) && 
        e.whatsappAlert
      );

      if (pending.length > 0 && this.juristService.profile().phone) {
        // We could automatically pop one here, but it's better to show a "Sync" button if multiple
        console.log(`Found ${pending.length} pending WhatsApp alerts.`);
      }
    }, 2000);
  }

  closeModal() {
    this.showModal.set(false);
    if (this.isListening() && this.recognition) {
      this.recognition.stop();
    }
  }

  syncWhatsAppAlerts() {
    const alerts = this.juristService.readyAlerts();
    if (alerts.length === 0) {
      this.juristService.notificationService.warning('Nu există alerte pregătite în mod activ pentru următoarele 24 de ore.');
      return;
    }

    this.queueAlertsList.set(alerts);
    this.currentQueueIndex.set(0);
    this.showQueueModal.set(true);
    this.juristService.notificationService.info(`S-a deschis asistentul pentru ${alerts.length} alerte pregătite.`);
  }

  closeQueueModal() {
    this.showQueueModal.set(false);
    this.queueAlertsList.set([]);
    this.currentQueueIndex.set(0);
  }

  skipActiveQueueItem() {
    const nextIndex = this.currentQueueIndex() + 1;
    if (nextIndex >= this.queueAlertsList().length) {
      this.juristService.notificationService.success('Toate alertele au fost rulate!');
      this.closeQueueModal();
    } else {
      this.currentQueueIndex.set(nextIndex);
      this.juristService.notificationService.info('S-a trecut peste alerta activă.');
    }
  }

  async fireActiveQueueItem() {
    const list = this.queueAlertsList();
    const index = this.currentQueueIndex();
    if (index >= list.length) return;

    const event = list[index];

    try {
      // Trigger native redirection link
      this.juristService.sendWhatsAppAlert(event, false);

      // Save state to Firebase
      const updated = { ...event, whatsappAlertSent: true };
      await this.juristService.updateEvent(updated);

      this.juristService.notificationService.success(`S-a deschis chatul pentru ${event.clientName}!`);

      // Advance queue with a cozy delay
      const nextIndex = index + 1;
      if (nextIndex >= list.length) {
        setTimeout(() => {
          this.juristService.notificationService.success('Toate alertele au fost trimise cu succes!');
          this.closeQueueModal();
        }, 1200);
      } else {
        setTimeout(() => {
          this.currentQueueIndex.set(nextIndex);
        }, 1200);
      }
    } catch (err) {
      console.error('[WHATSAPP QUEUE] Error advancement:', err);
      this.juristService.notificationService.error('A apărut o problemă la actualizarea dosarului.');
    }
  }

  async saveEvent() {
    if(!this.editingEvent.title) {
       this.juristService.notificationService.warning("Vă rugăm să introduceți un titlu pentru dosar.");
       return;
    }

    this.saving.set(true);
    try {
      const eventToSave: CalendarEvent = JSON.parse(JSON.stringify(this.editingEvent));
      
      // Ensure financial rest is calculated correctly
      const total = eventToSave.financial?.total || 0;
      const paid = eventToSave.financial?.paid || 0;
      eventToSave.financial = { total, paid, rest: total - paid };

      if (eventToSave.id) {
        await this.juristService.updateEvent(eventToSave);
      } else {
        await this.juristService.addEvent(eventToSave);
      }

      this.saving.set(false);
      this.closeModal();
    } catch (err) {
      console.error('Error saving event:', err);
      this.saving.set(false);
      this.cdr.detectChanges();
    }
  }

  async confirmDelete(eventId: string) {
    // În AI studio 'confirm' nativ este blocat, s-a scos pentru funcționare. (Dacă doriți putem adăuga un dialog custom, momentan ștergem direct)
    try {
      await this.juristService.deleteEvent(eventId);
      if (this.showModal()) {
        this.closeModal();
      }
    } catch (err) {
      console.error('Error deleting event:', err);
      this.juristService.notificationService.error('Nu s-a putut șterge dosarul.');
    }
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
      this.juristService.notificationService.error('Recunoașterea vocală nu este suportată în acest browser/mediu. Vă recomandăm Chrome sau Edge pe Desktop.');
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
        console.log('Calendar notes dictation started...');
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
            this.editingEvent.notes = (this.editingEvent.notes || '') + (this.editingEvent.notes ? ' ' : '') + finalTranscript;
            this.cdr.detectChanges();
          });
        }
      };

      this.recognition.onerror = (event: { error?: string }) => {
        console.error('Calendar speech error:', event.error || event);
        const errType = event.error;
        this.ngZone.run(() => {
          this.isListening.set(false);
          this.cdr.detectChanges();
          
          if (errType === 'not-allowed') {
            this.juristService.notificationService.error('Accesul la microfon a fost refuzat sau blocat. Deschideți aplicația într-un Tab Nou.');
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
        console.log('Calendar notes dictation ended.');
      };

      this.recognition.start();

    } catch (e) {
      console.error('Failed to initialize speech recognition:', e);
      alert('Nu s-a putut inițializa microfonul. Vă rugăm să deschideți aplicația într-o filă nouă (New Tab) pentru a acorda permisiuni direct.');
      this.isListening.set(false);
      this.cdr.detectChanges();
    }
  }
}