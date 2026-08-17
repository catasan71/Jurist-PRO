import { Component, inject, signal, computed, ChangeDetectorRef, ChangeDetectionStrategy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JuristService } from '../services/jurist.service';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { MarkdownPipe } from '../pipes/markdown.pipe';

interface DocCategory {
  id: string;
  label: string;
  icon: string;
  suggestions: string[];
}

@Component({
  selector: 'app-drafting',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full flex flex-col bg-jurist-card rounded-xl border border-gray-800 shadow-neon overflow-hidden animate-fadeIn">
      
      <!-- Top Bar Header -->
      <div class="p-4 sm:p-5 border-b border-gray-800 bg-jurist-dark flex flex-wrap justify-between items-center gap-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
            </svg>
          </div>
          <div>
            <h2 class="text-xl sm:text-2xl font-bold text-jurist-orange leading-tight">Redactare Documente & Acte Procedurale</h2>
            <p class="text-xs text-gray-400">Separare strictă între Actul de Instanță (A4) și Memorandumul Teoretic/Strategic</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-3 py-1 rounded-full font-mono flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Standard Procedural Românesc 2026
          </span>
        </div>
      </div>

      <!-- Main Workspace Grid -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <!-- LEFT: Configuration & Details (5 cols) -->
        <div class="lg:col-span-4 flex flex-col gap-4 overflow-y-auto pr-1">
          
          <!-- 1. Category Selector -->
          <div class="bg-gray-900/80 p-4 rounded-xl border border-gray-800 space-y-2.5">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-bold text-gray-300 uppercase tracking-wider">1. Alege Materia</h3>
              <span class="text-[10px] text-gray-500">Jurisdicție</span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              @for (cat of categories; track cat.id) {
                <button 
                  (click)="selectCategory(cat)"
                  [class]="'p-2.5 rounded-lg text-xs font-medium border transition-all text-left flex items-center gap-1.5 ' + 
                    (selectedCategory().id === cat.id 
                      ? 'bg-jurist-orange text-black font-bold border-jurist-orange shadow-md' 
                      : 'bg-black/50 text-gray-400 border-gray-800 hover:border-gray-600 hover:text-white')"
                >
                  <span class="text-sm">{{ cat.icon }}</span>
                  <span class="truncate">{{ cat.label }}</span>
                </button>
              }
            </div>
          </div>

          <!-- 2. Document Details & Inputs -->
          <div class="bg-gray-900/80 p-4 rounded-xl border border-gray-800 space-y-4">
            <div>
              <label for="docType" class="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                2. Ce document doriți să redactați?
              </label>
              
              <input 
                id="docType"
                type="text" 
                [(ngModel)]="customDocType" 
                placeholder="Ex: Cerere de chemare în judecată - pretenții..."
                class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-white text-xs focus:border-jurist-orange focus:ring-1 focus:ring-jurist-orange transition-all placeholder-gray-600 font-medium"
              />

              <!-- Suggestions Pills -->
              <div class="flex flex-wrap gap-1.5 mt-2">
                @for (sug of selectedCategory().suggestions; track sug) {
                  <button 
                    (click)="customDocType = sug"
                    class="px-2.5 py-1 bg-black/60 hover:bg-jurist-orange/20 hover:text-jurist-orange hover:border-jurist-orange border border-gray-800 rounded-md text-[11px] text-gray-400 transition-colors"
                  >
                    {{ sug }}
                  </button>
                }
              </div>
            </div>

            <!-- Antet Cabinet Avocat -->
            <div>
              <label for="cabinet" class="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                Antet Cabinet / SCA (Apare pe foaia A4)
              </label>
              <input 
                id="cabinet"
                type="text" 
                [(ngModel)]="lawyerCabinetName" 
                placeholder="Ex: CABINET DE AVOCAT POPESCU IOAN"
                class="w-full bg-black border border-gray-700 rounded-lg px-2.5 py-2 text-xs text-amber-300 placeholder-gray-600 focus:border-jurist-orange font-mono"
              />
            </div>

            <!-- Date Parti & Fapte -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label for="docDetails" class="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  3. Părți & Situația de Fapt
                </label>
                <span class="text-[10px] text-amber-400">Date complete</span>
              </div>
              <textarea 
                id="docDetails"
                [(ngModel)]="docDetails" 
                rows="7"
                class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:border-jurist-orange resize-none placeholder-gray-600 leading-relaxed font-sans"
                placeholder="Reclamant: Popescu Ion (domiciliu în București, CNP...).&#10;Pârât: SC X SRL (CUI RO..., sediu în Cluj).&#10;Fapte: La data de 10.02.2024 s-a încheiat contractul... Pârâtul nu a achitat factura în valoare de... Solicităm obligarea la plată și cheltuieli de judecată."
              ></textarea>
            </div>

            <!-- Generate Button -->
            <button 
              (click)="generate()" 
              [disabled]="juristService.isLoading()" 
              class="w-full bg-jurist-orange hover:bg-jurist-orangeHover text-black py-3 rounded-lg font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(255,140,0,0.4)] disabled:opacity-50 flex justify-center items-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              @if (juristService.isLoading()) {
                <div class="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                <span>Se redactează (NCPC & Doctrină)...</span>
              } @else {
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                </svg>
                <span>Generează Actul & Notă Teoretică</span>
              }
            </button>

            <!-- Security info box -->
            <div class="bg-emerald-950/20 border border-emerald-800/40 rounded-lg p-2.5 flex items-start gap-2 text-[11px] text-gray-400">
              <span class="text-emerald-400 text-sm">🔒</span>
              <div>
                <strong class="text-emerald-400">Confidențialitate Totală (AES-256):</strong>
                Datele dosarului sunt procesate exclusiv în tranzit și nu sunt salvate sau utilizate pentru antrenare.
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT: Modern Tabbed Preview Area (8 cols) -->
        <div class="lg:col-span-8 flex flex-col h-full overflow-hidden bg-[#0c0d0e] border border-gray-800 rounded-xl shadow-2xl">
          
          <!-- Mode Tabs Header (Differentiating Pleading vs Theoretical Memo) -->
          <div class="bg-gray-900/90 border-b border-gray-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
            
            <!-- Left Tabs -->
            <div class="flex items-center gap-1.5 bg-black/60 p-1 rounded-lg border border-gray-800">
              <button 
                (click)="activeTab.set('procedural')"
                [class]="'px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ' + 
                  (activeTab() === 'procedural' 
                    ? 'bg-amber-500 text-black shadow-md' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/60')"
              >
                <span>📄</span>
                <span>Act Procedural A4</span>
                @if (proceduralDoc()) {
                  <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                }
              </button>

              <button 
                (click)="activeTab.set('memorandum')"
                [class]="'px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ' + 
                  (activeTab() === 'memorandum' 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/60')"
              >
                <span>💡</span>
                <span>Notă Teoretică & Strategie</span>
                @if (memorandumDoc()) {
                  <span class="text-[10px] bg-indigo-900/80 text-indigo-200 px-1.5 py-0.2 rounded">Doctrină</span>
                }
              </button>

              <button 
                (click)="activeTab.set('split')"
                [class]="'hidden sm:flex px-2.5 py-1.5 rounded-md text-xs font-semibold items-center gap-1 transition-all ' + 
                  (activeTab() === 'split' 
                    ? 'bg-gray-700 text-white shadow-md' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/60')"
                title="Afișare comparativă în paralel"
              >
                <span>📑</span>
                <span>Split-View</span>
              </button>
            </div>

            <!-- Right Actions: Font Switcher, Copy, DOCX, Print -->
            <div class="flex items-center gap-1.5">
              
              <!-- Font Switcher for A4 view -->
              @if (activeTab() === 'procedural' || activeTab() === 'split') {
                <div class="hidden md:flex items-center gap-1 bg-black/50 p-1 rounded-md border border-gray-800 text-[11px]">
                  <button (click)="currentFont.set('font-legal')" [class]="'px-2 py-0.5 rounded ' + (currentFont() === 'font-legal' ? 'bg-gray-700 text-amber-300 font-bold' : 'text-gray-400 hover:text-white')">Garamond</button>
                  <button (click)="currentFont.set('font-legal-serif')" [class]="'px-2 py-0.5 rounded ' + (currentFont() === 'font-legal-serif' ? 'bg-gray-700 text-amber-300 font-bold' : 'text-gray-400 hover:text-white')">Lora</button>
                  <button (click)="currentFont.set('font-sans')" [class]="'px-2 py-0.5 rounded ' + (currentFont() === 'font-sans' ? 'bg-gray-700 text-amber-300 font-bold' : 'text-gray-400 hover:text-white')">Sans</button>
                </div>
              }

              <!-- Copy Button -->
              <button 
                (click)="copyActive()"
                [disabled]="!hasContent()"
                class="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-gray-200 text-xs rounded-lg border border-gray-700 flex items-center gap-1.5 transition-all active:scale-95"
                title="Copiază conținutul în clipboard"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
                <span class="hidden sm:inline">Copiază</span>
              </button>

              <!-- Export DOCX -->
              <button 
                (click)="exportDocx()"
                [disabled]="!hasContent()"
                class="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 disabled:opacity-30 text-blue-300 text-xs rounded-lg border border-blue-500/30 flex items-center gap-1.5 transition-all active:scale-95 font-medium"
                title="Descarcă în format Microsoft Word (.doc) complet stilizat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <span>Word (.doc)</span>
              </button>

              <!-- Print / PDF -->
              <button 
                (click)="printOrPdf()"
                [disabled]="!hasContent()"
                class="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-black text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all active:scale-95 shadow-md"
                title="Listare sau Salvare ca PDF gata de instanță"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24-1.048-.37-2.14-.37-3.26 0-3.313 1.94-6.172 4.77-7.568.5-.246 1.05-.417 1.63-.501.58-.084 1.17-.084 1.75 0 .58.084 1.13.255 1.63.501C19.34 4.397 21.28 7.256 21.28 10.57c0 1.119-.13 2.211-.37 3.259M16.5 18H18a3 3 0 003-3v-2.25A2.25 2.25 0 0018.75 10.5h-13.5A2.25 2.25 0 003 12.75V15a3 3 0 003 3h1.5M6 18h12M6 18v3.75A1.5 1.5 0 007.5 23.25h9a1.5 1.5 0 001.5-1.5V18" />
                </svg>
                <span>PDF / Print</span>
              </button>

            </div>
          </div>

          <!-- Main Viewport Content -->
          <div class="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#08090a] flex justify-center items-start">
            
            <!-- 1. Loading Indicator -->
            @if (juristService.isLoading()) {
              <div class="h-full min-h-[450px] flex flex-col items-center justify-center text-center p-8">
                <div class="relative w-16 h-16 mb-4">
                  <div class="absolute inset-0 rounded-full border-2 border-amber-500/20 animate-ping"></div>
                  <div class="w-16 h-16 rounded-full border-2 border-amber-500 border-t-transparent animate-spin flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 text-amber-400">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                </div>
                <h4 class="text-white font-semibold text-sm mb-1 tracking-wide">Redactare & Analiză în curs...</h4>
                <p class="text-xs text-gray-400 max-w-md leading-relaxed">
                  Se structurează separat actul de instanță (A4) și memorandumul cu decizii ICCJ/CCR și excepții procedurale.
                </p>
              </div>
            } @else if (hasContent()) {
              
              <!-- 2. TAB 1: PROCEDURAL A4 DOCUMENT -->
              @if (activeTab() === 'procedural') {
                <div class="w-full max-w-[820px] bg-[#fcfcfd] text-[#111827] shadow-[0_20px_60px_rgba(0,0,0,0.7)] rounded-sm min-h-[920px] p-8 sm:p-14 border border-gray-300 flex flex-col justify-between selection:bg-amber-200">
                  
                  <!-- Antet Cabinet Avocat -->
                  <div>
                    <div class="border-b border-gray-900/30 pb-4 mb-8 flex items-start justify-between gap-4 font-sans">
                      <div>
                        <div class="text-[13px] font-bold tracking-widest text-black uppercase">
                          {{ lawyerCabinetName || 'CABINET DE AVOCAT / SOCIETATE CIVILĂ PROFESIONALĂ' }}
                        </div>
                        <div class="text-[11px] text-gray-600 tracking-wide mt-0.5">
                          Baroul București • Asistență și Reprezentare Judiciară
                        </div>
                      </div>
                      <div class="text-right text-[11px] text-gray-600 font-mono">
                        <div>Data: <span class="text-gray-900 font-bold">{{ currentDate }}</span></div>
                        <div class="text-[10px] text-amber-800 font-semibold uppercase tracking-wider mt-0.5">Exemplar Depunere Instanță</div>
                      </div>
                    </div>

                    <!-- Editable A4 Body -->
                    <div 
                      #editableDoc
                      contenteditable="true"
                      (input)="onProceduralEdit($event)"
                      [class]="'outline-none leading-[1.8] text-justify space-y-4 text-[14.5px] text-[#1a1a1a] focus:ring-1 focus:ring-amber-400/20 rounded p-1 whitespace-pre-wrap ' + currentFont()"
                      style="hyphens: auto; text-align: justify; word-break: break-word;"
                    >{{ proceduralDoc() }}</div>
                  </div>

                  <!-- Footer -->
                  <div class="border-t border-gray-300 pt-4 mt-12 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-500 font-sans gap-2">
                    <div class="flex items-center gap-2">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                      <span>Redactat conform Codului de Procedură Civilă & Codului Civil</span>
                    </div>
                    <div class="font-mono text-gray-600">
                      JuristPRO LegalTech • Pagină 1
                    </div>
                  </div>

                </div>
              }

              <!-- 3. TAB 2: THEORETICAL MEMORANDUM & STRATEGY -->
              @if (activeTab() === 'memorandum') {
                <div class="w-full max-w-4xl bg-gray-900/90 border border-indigo-500/30 rounded-xl p-6 sm:p-8 shadow-2xl space-y-6">
                  
                  <div class="border-b border-gray-800 pb-4 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 text-lg">
                        💡
                      </div>
                      <div>
                        <h3 class="text-base font-bold text-white">Memorandum Teoretic & Strategie Avocațială</h3>
                        <p class="text-xs text-indigo-300">Fundamentare doctrinară, jurisprudență obligatorie (ICCJ/CCR) și excepții procesuale</p>
                      </div>
                    </div>
                    <span class="text-xs bg-indigo-950 text-indigo-300 border border-indigo-800/80 px-2.5 py-1 rounded-md font-mono">
                      Uz Intern Avocat
                    </span>
                  </div>

                  <div class="prose prose-invert max-w-none text-gray-200 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                    {{ memorandumDoc() || 'Nu a fost generat un memorandum separat pentru această solicitare.' }}
                  </div>

                  <div class="bg-indigo-950/30 border border-indigo-900/60 p-4 rounded-xl flex items-center justify-between text-xs text-indigo-300">
                    <span>Vrei să aprofundezi strategia probatorie?</span>
                    <button 
                      (click)="goToStrategy()"
                      class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all"
                    >
                      Deschide Modulul de Strategie →
                    </button>
                  </div>

                </div>
              }

              <!-- 4. TAB 3: SPLIT VIEW (BOTH SIDE BY SIDE) -->
              @if (activeTab() === 'split') {
                <div class="w-full grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                  
                  <!-- Left: A4 Document -->
                  <div class="bg-[#fcfcfd] text-[#111827] shadow-xl rounded-sm p-6 sm:p-8 border border-gray-300 min-h-[750px] flex flex-col justify-between">
                    <div>
                      <div class="text-xs font-bold text-gray-900 border-b border-gray-400 pb-2 mb-4 uppercase tracking-wider flex justify-between">
                        <span>📄 Act Procedural (Instanță)</span>
                        <span class="text-gray-500 font-mono">{{ currentDate }}</span>
                      </div>
                      <div [class]="'text-xs text-justify leading-relaxed whitespace-pre-wrap text-gray-900 ' + currentFont()">
                        {{ proceduralDoc() }}
                      </div>
                    </div>
                    <div class="border-t border-gray-300 pt-2 mt-6 text-[10px] text-gray-500">
                      Format A4 de Instanță
                    </div>
                  </div>

                  <!-- Right: Theoretical Memo -->
                  <div class="bg-gray-900/90 border border-indigo-500/30 rounded-xl p-6 shadow-xl min-h-[750px] flex flex-col justify-between">
                    <div>
                      <div class="text-xs font-bold text-indigo-400 border-b border-gray-800 pb-2 mb-4 uppercase tracking-wider flex justify-between">
                        <span>💡 Notă Teoretică & Temeiuri</span>
                        <span class="text-gray-500 font-mono">Strategie</span>
                      </div>
                      <div class="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {{ memorandumDoc() }}
                      </div>
                    </div>
                    <div class="border-t border-gray-800 pt-2 mt-6 text-[10px] text-gray-500">
                      Memorandum de Litigiu
                    </div>
                  </div>

                </div>
              }

            } @else {
              
              <!-- 3. Empty State -->
              <div class="h-full min-h-[460px] flex flex-col items-center justify-center text-center p-8 max-w-lg">
                <div class="w-20 h-20 rounded-3xl bg-gradient-to-b from-gray-800/80 to-gray-900/90 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-5 shadow-2xl shadow-amber-500/5">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.2" stroke="currentColor" class="w-10 h-10">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>
                <h3 class="text-white font-bold text-base mb-2 tracking-wide">Redactor de Acte & Notă de Strategie</h3>
                <p class="text-xs text-gray-400 leading-relaxed mb-6">
                  Selectați materia și introduceți datele speței. Sistemul va redacta automat două componente distincte: <strong>Actul de instanță (format A4)</strong> și <strong>Memorandumul teoretic cu temeiuri și excepții</strong>.
                </p>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
                  <div class="bg-gray-900/80 p-3 rounded-xl border border-gray-800 text-xs">
                    <div class="text-amber-400 font-bold flex items-center gap-1.5 mb-1">
                      <span>📄</span>
                      Act de Procedură A4
                    </div>
                    <span class="text-gray-400 text-[11px]">Format direct de instanță, fără introduceri teoretice, gata de export Word & PDF</span>
                  </div>
                  <div class="bg-gray-900/80 p-3 rounded-xl border border-gray-800 text-xs">
                    <div class="text-indigo-400 font-bold flex items-center gap-1.5 mb-1">
                      <span>💡</span>
                      Notă Teoretică Separată
                    </div>
                    <span class="text-gray-400 text-[11px]">Decizii CCR, RIL-uri, analiza riscurilor și excepții procesuale</span>
                  </div>
                </div>
              </div>

            }

          </div>

        </div>

      </div>
    </div>
  `
})
export class DraftingComponent {
  juristService = inject(JuristService);
  authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('editableDoc') editableDoc?: ElementRef<HTMLDivElement>;

  // Form Inputs
  customDocType = '';
  docDetails = '';
  lawyerCabinetName = '';

  // Tabs & Views
  activeTab = signal<'procedural' | 'memorandum' | 'split'>('procedural');
  currentFont = signal<string>('font-legal'); // 'font-legal' (EB Garamond) | 'font-legal-serif' (Lora) | 'font-sans' (Plus Jakarta Sans)

  // Separated Contents
  proceduralDoc = signal<string>('');
  memorandumDoc = signal<string>('');
  rawResponse = signal<string>('');

  currentDate = new Date().toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  // Categories
  categories: DocCategory[] = [
    {
      id: 'civil',
      label: 'Proc. Civilă',
      icon: '🏛️',
      suggestions: [
        'Cerere de chemare în judecată',
        'Întâmpinare',
        'Cerere reconvențională',
        'Cerere de ajutor public judiciar',
        'Tranzacție (Model Înțelegere)'
      ]
    },
    {
      id: 'family',
      label: 'Familie',
      icon: '👨‍👩‍👧',
      suggestions: [
        'Cerere de divorț prin acord',
        'Cerere exercitare autoritate părintească',
        'Cerere majorare pensie întreținere',
        'Ordonanță președințială'
      ]
    },
    {
      id: 'exec',
      label: 'Executare',
      icon: '🔨',
      suggestions: [
        'Cerere de încuviințare executare silită',
        'Contestație la executare',
        'Cerere de suspendare executare'
      ]
    },
    {
      id: 'penal',
      label: 'Penal',
      icon: '👮',
      suggestions: [
        'Plângere Penală',
        'Constituire de parte civilă',
        'Memoriu de Apel Penal'
      ]
    },
    {
      id: 'admin',
      label: 'Admin/Muncă',
      icon: '💼',
      suggestions: [
        'Plângere contravențională',
        'Contestație decizie concediere',
        'Acțiune în contencios administrativ'
      ]
    }
  ];

  selectedCategory = signal<DocCategory>(this.categories[0]);

  selectCategory(cat: DocCategory) {
    this.selectedCategory.set(cat);
    this.customDocType = '';
  }

  hasContent = computed(() => {
    return !!(this.proceduralDoc().trim() || this.memorandumDoc().trim());
  });

  async generate() {
    const finalType = this.customDocType.trim();
    
    if (!finalType) {
      this.notificationService.error("Vă rugăm să specificați tipul documentului pe care doriți să îl redactați.");
      return;
    }

    const detailsToPass = this.docDetails.trim() !== '' 
      ? this.docDetails 
      : "Nu au fost furnizate detalii specifice. Te rog să generezi un model formal complet cu spații libere [...] pentru completare ulterioară.";

    this.proceduralDoc.set('');
    this.memorandumDoc.set('');
    this.rawResponse.set('');
    this.activeTab.set('procedural');

    try {
      const result = await this.juristService.draftDocument(finalType, detailsToPass, (chunk) => {
        this.parseStreamingText(chunk);
        this.cdr.detectChanges();
      });
      this.parseStreamingText(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.notificationService.error(`Eroare la redactare: ${message}`);
    }
  }

  private parseStreamingText(text: string) {
    this.rawResponse.set(text);

    const proceduralTag = '===ACT_PROCEDURAL===';
    const memoTag = '===MEMORANDUM_STRATEGIE===';

    if (text.includes(proceduralTag) || text.includes(memoTag)) {
      const parts = text.split(memoTag);
      let proceduralPart = parts[0] || '';
      const memoPart = parts[1] || '';

      if (proceduralPart.includes(proceduralTag)) {
        proceduralPart = proceduralPart.split(proceduralTag)[1] || '';
      }

      this.proceduralDoc.set(proceduralPart.trim());
      this.memorandumDoc.set(memoPart.trim());
    } else {
      // Fallback: If tags weren't outputted, treat as procedural document
      this.proceduralDoc.set(text.trim());
    }
  }

  onProceduralEdit(event: Event) {
    const el = event.target as HTMLElement;
    this.proceduralDoc.set(el.innerText || '');
  }

  copyActive() {
    const textToCopy = this.activeTab() === 'memorandum' 
      ? this.memorandumDoc() 
      : (this.editableDoc?.nativeElement.innerText || this.proceduralDoc());

    if (!textToCopy) return;

    navigator.clipboard.writeText(textToCopy).then(() => {
      this.notificationService.success('Conținutul a fost copiat în clipboard!');
    }).catch(() => {
      this.notificationService.error('Nu s-a putut copia textul.');
    });
  }

  printOrPdf() {
    if (!this.proceduralDoc()) return;
    
    const content = this.editableDoc?.nativeElement.innerHTML || this.proceduralDoc();
    const cabinet = this.lawyerCabinetName || 'CABINET DE AVOCAT';
    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (!printWindow) {
      this.notificationService.error('Nu s-a putut deschide fereastra de print. Permiteți pop-up-urile din browser.');
      return;
    }

    const fontChoice = this.currentFont() === 'font-legal-serif' 
      ? "'Lora', serif" 
      : this.currentFont() === 'font-sans' 
        ? "'Plus Jakarta Sans', sans-serif" 
        : "'EB Garamond', Georgia, serif";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${this.customDocType || 'Act Juridic'} - JuristPRO AI</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=Lora:ital,wght@0,400;0,600&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 portrait;
            margin: 2.5cm 2.2cm 2.5cm 2.2cm;
          }
          body {
            font-family: ${fontChoice};
            font-size: 12pt;
            line-height: 1.6;
            color: #111;
            background: #fff;
            margin: 0;
            padding: 0;
          }
          .header {
            border-bottom: 1.5pt solid #222;
            padding-bottom: 12px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            font-family: 'Plus Jakarta Sans', sans-serif;
          }
          .header .cabinet {
            font-size: 11pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .header .sub {
            font-size: 9pt;
            color: #555;
          }
          .header .date {
            font-size: 9pt;
            text-align: right;
            color: #333;
          }
          .content {
            white-space: pre-wrap;
            text-align: justify;
            text-justify: inter-word;
            word-break: break-word;
          }
          .footer {
            border-top: 1pt solid #ccc;
            margin-top: 35px;
            padding-top: 8px;
            font-size: 8pt;
            color: #777;
            display: flex;
            justify-content: space-between;
            font-family: 'Plus Jakarta Sans', sans-serif;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="cabinet">${cabinet}</div>
            <div class="sub">Baroul București • Asistență & Reprezentare Juridică</div>
          </div>
          <div class="date">
            <div>Data: <strong>${this.currentDate}</strong></div>
            <div>Exemplar Depunere Instanță</div>
          </div>
        </div>
        
        <div class="content">${content}</div>

        <div class="footer">
          <div>Redactat conform Codului de Procedură Civilă & Codului Civil</div>
          <div>JuristPRO AI LegalTech • Pagina 1</div>
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  exportDocx() {
    if (!this.proceduralDoc()) return;
    
    const rawText = this.editableDoc?.nativeElement.innerText || this.proceduralDoc();
    const title = this.customDocType || 'Act_Juridic';
    const cabinet = this.lawyerCabinetName || 'CABINET DE AVOCAT';

    const wordHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${title}</title>
        <style>
          @page {
            size: 21cm 29.7cm;
            margin: 2.5cm 2.5cm 2.5cm 2.5cm;
            mso-page-orientation: portrait;
          }
          body {
            font-family: 'Times New Roman', 'Garamond', serif;
            font-size: 12pt;
            line-height: 1.5;
            color: #000000;
          }
          .header-table {
            width: 100%;
            border-bottom: 1.5pt solid #000;
            margin-bottom: 20pt;
            padding-bottom: 6pt;
            font-family: Arial, sans-serif;
          }
          .cabinet-name {
            font-size: 11pt;
            font-weight: bold;
            text-transform: uppercase;
          }
          .doc-body {
            text-align: justify;
            white-space: pre-wrap;
            line-height: 1.5;
          }
          .footer-table {
            width: 100%;
            border-top: 0.5pt solid #888;
            margin-top: 30pt;
            padding-top: 5pt;
            font-size: 9pt;
            color: #555;
            font-family: Arial, sans-serif;
          }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td align="left">
              <div class="cabinet-name">${cabinet}</div>
              <div style="font-size: 9pt; color: #444;">Asistență și Reprezentare Juridică</div>
            </td>
            <td align="right" style="font-size: 9pt;">
              Data: ${this.currentDate}<br/>
              <b>UZ INSTANȚĂ / OFICIAL</b>
            </td>
          </tr>
        </table>

        <div class="doc-body">${rawText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>

        <table class="footer-table">
          <tr>
            <td align="left">Redactat conform Codului de Procedură Civilă & Codului Civil</td>
            <td align="right">JuristPRO AI LegalTech</td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', wordHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().slice(0,10)}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.notificationService.success('Documentul Word a fost descărcat cu succes!');
  }

  goToStrategy() {
    this.juristService.setModule('strategy');
  }
}
