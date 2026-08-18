import { Component, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, ElementRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JuristService } from '../services/jurist.service';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-fees',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full flex flex-col bg-jurist-card rounded-xl border border-gray-800 shadow-neon overflow-hidden animate-fadeIn">
      
      <!-- Top Bar Header -->
      <div class="p-4 sm:p-5 border-b border-gray-800 bg-jurist-dark flex flex-wrap justify-between items-center gap-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.001-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 class="text-xl sm:text-2xl font-bold text-jurist-orange leading-tight">Taxe Judiciare, Dobânzi & Onorarii</h2>
            <p class="text-xs text-gray-400">Calculator OUG 80/2013, OG 13/2011, Ghid UNBR & Notă de Calcul A4 pentru Instanță</p>
          </div>
        </div>

        <!-- Mode selector tabs -->
        <div class="flex items-center gap-1.5 bg-black/60 p-1 rounded-xl border border-gray-800">
          <button 
            (click)="setMode('timbre')"
            [class]="'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ' + 
              (activeMode() === 'timbre' ? 'bg-jurist-orange text-black shadow-md' : 'text-gray-400 hover:text-white')"
          >
            <span>🏛️ Taxă Timbru OUG 80</span>
          </button>
          <button 
            (click)="setMode('interest')"
            [class]="'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ' + 
              (activeMode() === 'interest' ? 'bg-jurist-orange text-black shadow-md' : 'text-gray-400 hover:text-white')"
          >
            <span>📈 Dobândă Legală OG 13</span>
          </button>
          <button 
            (click)="setMode('fee')"
            [class]="'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ' + 
              (activeMode() === 'fee' ? 'bg-jurist-orange text-black shadow-md' : 'text-gray-400 hover:text-white')"
          >
            <span>💼 Decont Onorariu & Art. 453</span>
          </button>
          <button 
            (click)="setMode('ai_deviz')"
            [class]="'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ' + 
              (activeMode() === 'ai_deviz' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white')"
          >
            <span>✨ Deviz AI Avansat</span>
          </button>
        </div>
      </div>

      <!-- Main Workspace Grid -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <!-- LEFT PANEL: Controls & Form (5 cols) -->
        <div class="lg:col-span-5 flex flex-col gap-4 overflow-y-auto pr-1">
          
          <!-- TAB 1: TAXA DE TIMBRU OUG 80/2013 -->
          @if (activeMode() === 'timbre') {
            <div class="bg-gray-900/90 p-5 rounded-xl border border-gray-800 space-y-4 shadow-xl">
              <div class="flex items-center justify-between border-b border-gray-800 pb-2">
                <span class="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-jurist-orange"></span>
                  Parametri Taxă Judiciară de Timbru
                </span>
                <span class="text-[10px] text-amber-400 font-mono">OUG 80/2013</span>
              </div>

              <!-- Categorie cerere -->
              <div>
                <label for="timbreCatSelect" class="block text-xs font-semibold text-gray-300 mb-1">Tipul Acțiunii / Cererii</label>
                <select 
                  id="timbreCatSelect"
                  [(ngModel)]="timbreCategory"
                  (ngModelChange)="onParamChange()"
                  class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:border-jurist-orange font-medium"
                >
                  <optgroup label="🏛️ Drept Civil, Pretenții & Proprietate">
                    <option value="evaluable">Cerere evaluabilă în bani / Pretenții (Art. 3 alin. 1 - Grilă progresivă)</option>
                    <option value="revendicare">Acțiune în revendicare imobiliară (Art. 3 raportat la valoare)</option>
                    <option value="uzucapiune">Uzucapiune / Dobândire drept proprietate (Art. 3)</option>
                    <option value="anulare_contract">Anulare / Rezoluțiune act juridic evaluabil (Art. 3)</option>
                    <option value="granituire">Grănițuire fără revendicare (Art. 4 alin. 2 - 100 lei)</option>
                    <option value="posesorie">Acțiune posesorie (Art. 4 alin. 1 - 100 lei)</option>
                    <option value="neevaluabil">Cerere neevaluabilă în bani (Art. 8 alin. 1 - 20 lei)</option>
                  </optgroup>

                  <optgroup label="⚡ Proceduri Rapide & Urgență">
                    <option value="ordonanta">Ordonanță de plată (Art. 6 alin. 2 - 200 lei)</option>
                    <option value="valoare_redusa">Cerere de valoare redusă (Art. 6 alin. 1 - 50 lei &le; 2.000 lei / 200 lei &gt; 2.000 lei)</option>
                    <option value="ordonanta_presedintiala">Ordonanță președințială (Art. 6 alin. 4 - 20 lei)</option>
                    <option value="evacuare">Evacuare din imobil - procedură specială (Art. 6 alin. 3 - 100 lei)</option>
                    <option value="sechestru_asigurator">Sechestru asigurător / Poprire asiguratorie (Art. 11 alin. 1 - 100 lei)</option>
                    <option value="sechestru_judiciar">Sechestru judiciar (Art. 11 alin. 2 - 100 lei)</option>
                    <option value="asigurare_dovezi">Asigurare de dovezi (Art. 7 - 20 lei)</option>
                  </optgroup>

                  <optgroup label="⚖️ Executare Silită & Carte Funciară">
                    <option value="contestatie_executare">Contestație la executare silită (Art. 10 alin. 2 - la valoare, max 1.000 lei)</option>
                    <option value="contestatie_executare_act">Contestație împotriva unui act de executare fără valoare (Art. 10 - 100 lei)</option>
                    <option value="executare">Încuviințare executare silită (Art. 10 alin. 1 lit. a - 20 lei)</option>
                    <option value="suspendare_executare">Suspendarea executării silite (Art. 10 alin. 1 lit. c - 50 lei)</option>
                    <option value="validare_poprire">Validare de poprire (Art. 10 alin. 1 lit. a - 20 lei)</option>
                    <option value="plangere_cf">Plângere împotriva încheierii de Carte Funciară (Art. 20 - 50 lei)</option>
                    <option value="investire_titlu">Învestire cu formulă executorie / Titluri executorii (Art. 10 - 20 lei)</option>
                  </optgroup>

                  <optgroup label="👨‍👩‍👧 Dreptul Familiei & Persoane">
                    <option value="divort">Divorț prin acordul soților (Art. 15 lit. a - 200 lei)</option>
                    <option value="divort_culpa">Divorț din culpă / separare / motive temeinice (Art. 15 lit. b - 100 lei)</option>
                    <option value="partaj">Partaj judiciar (Art. 5 alin. 1 - 3% din masă / 50 lei)</option>
                    <option value="exercitare_autoritate">Autoritate părintească / Locuință minor / Program legături (Art. 15 lit. e - 20 lei)</option>
                    <option value="pensie_intretinere">Pensie de întreținere (Art. 29 alin. 1 lit. c - Scutit 0 lei)</option>
                    <option value="asociatii_fundatii">Înregistrare / Modificare Asociații & Fundații (Art. 12 - 100 lei)</option>
                    <option value="curatela_tutela">Măsuri ocrotire / Curatelă / Tutelă (Art. 29 alin. 1 lit. e - Scutit 0 lei)</option>
                  </optgroup>

                  <optgroup label="📜 Contencios Administrativ, Fiscal & Contravențional">
                    <option value="plangere_contraventionala">Plângere contravențională (O.G. 2/2001 & Art. 19 - 20 lei)</option>
                    <option value="contencios_anulare">Anulare act administrativ neevaluabil (Art. 16 alin. 1 lit. a - 50 lei)</option>
                    <option value="contencios_suspendare">Suspendare act administrativ (Art. 14 Legea 554/2004 - 50 lei)</option>
                    <option value="contencios_patrimonial">Contencios administrativ patrimonial / Despăgubiri (Art. 16 alin. 1 lit. b - Art. 3)</option>
                  </optgroup>

                  <optgroup label="🏢 Comercial, Societăți & Insolvență">
                    <option value="insolventa_deschidere">Deschidere procedură insolvență (Legea 85/2014 & Art. 14 alin. 1 - 200 lei)</option>
                    <option value="insolventa_creanta">Declarație de creanță / Contestație tabel (Art. 14 alin. 2 - 200 lei)</option>
                    <option value="anulare_aga">Anulare hotărâre AGA societate (Legea 31/1990 & Art. 18 - 100 lei)</option>
                    <option value="registru_comert">Cereri / Plângeri Registrul Comerțului (Art. 18 - 100 lei)</option>
                  </optgroup>

                  <optgroup label="🔄 Căi de Atac">
                    <option value="apel">Apel (Art. 23 alin. 1 - 50% din taxa datorată la fond)</option>
                    <option value="recurs">Recurs (Art. 24 alin. 1 - 100 lei sau 50% conform legii)</option>
                    <option value="contestatie_anulare">Contestație în anulare (Art. 25 alin. 1 - 100 lei)</option>
                    <option value="revizuire">Revizuire (Art. 25 alin. 1 - 100 lei)</option>
                  </optgroup>

                  <optgroup label="🛡️ Cereri Scutite de Drept (Art. 29 OUG 80/2013)">
                    <option value="scutit_munca">Conflicte de muncă & drepturi salariale (Art. 29 alin. 1 lit. a - Scutit 0 lei)</option>
                    <option value="scutit_penal">Despăgubiri / Latura civilă din infracțiuni (Art. 29 alin. 1 lit. i - Scutit 0 lei)</option>
                    <option value="scutit_protectie">Ordin de protecție (Legea 217/2003 & Art. 29 - Scutit 0 lei)</option>
                    <option value="scutit_asigurari">Drepturi de asigurări sociale / Pensii (Art. 29 alin. 1 lit. a - Scutit 0 lei)</option>
                    <option value="scutit_consumator">Acțiuni protecția consumatorilor (Art. 29 alin. 1 lit. f - Scutit 0 lei)</option>
                  </optgroup>
                </select>
              </div>

              <!-- Valoare Obiect Litigiu -->
              @if (isClaimValueRequired()) {
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label for="timbreValueInput" class="text-xs font-semibold text-gray-300">Valoarea Obiectului Cererii (RON)</label>
                    <span class="text-[10px] text-amber-400 font-mono font-bold">{{ formatCurrency(timbreClaimValue) }} RON</span>
                  </div>
                  <div class="relative">
                    <input 
                      id="timbreValueInput"
                      type="number" 
                      [(ngModel)]="timbreClaimValue" 
                      (ngModelChange)="onParamChange()"
                      placeholder="0"
                      min="0"
                      step="100"
                      class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-sm text-amber-300 font-bold focus:border-jurist-orange font-mono"
                    />
                    <span class="absolute right-3 top-2.5 text-xs text-gray-500 font-bold">RON</span>
                  </div>

                  <!-- Quick Presets for Amounts -->
                  <div class="mt-2 flex flex-wrap items-center gap-1.5">
                    <span class="text-[10px] text-gray-400 mr-1">Preseturi:</span>
                    <button type="button" (click)="setTimbreAmount(10000)" class="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] rounded border border-gray-700 cursor-pointer">10.000 lei</button>
                    <button type="button" (click)="setTimbreAmount(25000)" class="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] rounded border border-gray-700 cursor-pointer">25.000 lei</button>
                    <button type="button" (click)="setTimbreAmount(50000)" class="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-amber-300 text-[10px] rounded border border-amber-500/40 cursor-pointer font-bold">50.000 lei</button>
                    <button type="button" (click)="setTimbreAmount(100000)" class="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] rounded border border-gray-700 cursor-pointer">100.000 lei</button>
                    <button type="button" (click)="setTimbreAmount(250000)" class="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] rounded border border-gray-700 cursor-pointer">250.000 lei</button>
                    <button type="button" (click)="setTimbreAmount(500000)" class="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] rounded border border-gray-700 cursor-pointer">500.000 lei</button>
                  </div>
                </div>
              }

              <!-- Scutiri & Tranzactie -->
              <div class="bg-black/50 p-3 rounded-lg border border-gray-800 space-y-2">
                <span class="text-[11px] font-bold text-gray-300 uppercase tracking-wider block">Opțiuni & Scutiri</span>
                <label class="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="timbreAjutorPublic" (ngModelChange)="onParamChange()" class="rounded border-gray-700 text-amber-500 focus:ring-jurist-orange bg-gray-900" />
                  <span>Se solicită ajutor public judiciar (OUG 51/2008)</span>
                </label>
                <label class="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="timbreTranzactie" (ngModelChange)="onParamChange()" class="rounded border-gray-700 text-amber-500 focus:ring-jurist-orange bg-gray-900" />
                  <span>Stingere prin tranzacție (restituire 50% conform art. 45 OUG 80)</span>
                </label>
              </div>

              <!-- Live Calculation Result Card -->
              <div class="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent p-3.5 rounded-lg border border-amber-500/30 flex items-center justify-between">
                <div>
                  <span class="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">Taxă Judiciară Datorată</span>
                  <span class="text-[11px] text-gray-400 leading-tight block">{{ getTimbreLegalBasis() }}</span>
                </div>
                <div class="text-right">
                  <div class="text-lg font-black text-amber-300 font-mono">{{ formatCurrency(calculateTimbreTax()) }} RON</div>
                  <span class="text-[10px] text-emerald-400 font-medium">Calculat OUG 80/2013</span>
                </div>
              </div>

              <!-- Detalii Dosar & Părți -->
              <div class="space-y-2 pt-2 border-t border-gray-800">
                <span class="text-[11px] font-bold text-gray-300 uppercase tracking-wider block">Date Dosar (Apar pe Nota A4)</span>
                <input 
                  type="text" 
                  [(ngModel)]="dossierNumber" 
                  (ngModelChange)="onParamChange()"
                  placeholder="Nr. Dosar (Ex: 12345/299/2026)" 
                  class="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-jurist-orange font-mono"
                />
                <input 
                  type="text" 
                  [(ngModel)]="courtName" 
                  (ngModelChange)="onParamChange()"
                  placeholder="Instanța (Ex: Tribunalul București - Secția a IV-a Civilă)" 
                  class="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-jurist-orange"
                />
                <input 
                  type="text" 
                  [(ngModel)]="partiesDesc" 
                  (ngModelChange)="onParamChange()"
                  placeholder="Părți (Ex: Reclamant SC Alfa SRL vs. Pârât SC Beta SRL)" 
                  class="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-jurist-orange"
                />
              </div>

              <!-- Primary Action Button: Generează Notă de Calcul -->
              <button 
                type="button"
                (click)="generateReport('timbre')"
                class="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black py-3 rounded-lg font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <span>⚡ Generează / Actualizează Notă A4</span>
              </button>

            </div>
          }

          <!-- TAB 2: DOBANDA LEGALA OG 13/2011 -->
          @if (activeMode() === 'interest') {
            <div class="bg-gray-900/90 p-5 rounded-xl border border-gray-800 space-y-4 shadow-xl">
              <div class="flex items-center justify-between border-b border-gray-800 pb-2">
                <span class="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-jurist-orange"></span>
                  Parametri Dobândă Legală OG 13/2011
                </span>
                <span class="text-[10px] text-amber-400 font-mono">Penalizatoare / Remuneratorie</span>
              </div>

              <!-- Debit Principal -->
              <div>
                <label for="interestPrincipalInput" class="block text-xs font-semibold text-gray-300 mb-1">Debit Principal / Creanță (RON)</label>
                <div class="relative">
                  <input 
                    id="interestPrincipalInput"
                    type="number" 
                    [(ngModel)]="interestPrincipal" 
                    (ngModelChange)="onParamChange()"
                    placeholder="0"
                    min="0"
                    class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-sm text-amber-300 font-bold focus:border-jurist-orange font-mono"
                  />
                  <span class="absolute right-3 top-2.5 text-xs text-gray-500 font-bold">RON</span>
                </div>
                <!-- Quick Presets -->
                <div class="mt-2 flex flex-wrap items-center gap-1.5">
                  <span class="text-[10px] text-gray-400 mr-1">Preseturi:</span>
                  <button type="button" (click)="setInterestPrincipal(10000)" class="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] rounded border border-gray-700 cursor-pointer">10.000 lei</button>
                  <button type="button" (click)="setInterestPrincipal(25000)" class="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-amber-300 text-[10px] rounded border border-amber-500/40 cursor-pointer font-bold">25.000 lei</button>
                  <button type="button" (click)="setInterestPrincipal(50000)" class="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] rounded border border-gray-700 cursor-pointer">50.000 lei</button>
                  <button type="button" (click)="setInterestPrincipal(100000)" class="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] rounded border border-gray-700 cursor-pointer">100.000 lei</button>
                </div>
              </div>

              <!-- Tip Raport -->
              <div>
                <label for="interestRelationSelect" class="block text-xs font-semibold text-gray-300 mb-1">Tipul Raportului Juridic</label>
                <select 
                  id="interestRelationSelect"
                  [(ngModel)]="interestRelationType" 
                  (ngModelChange)="onParamChange()"
                  class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:border-jurist-orange font-medium"
                >
                  <option value="b2b">Între profesioniști / Comercianți (Rata BNR + 8% conform art. 3 alin. 2 ind. 1)</option>
                  <option value="b2c_penal">Raport civil cu consumator - Penalizatoare (Rata BNR + 4% conform art. 3 alin. 1)</option>
                  <option value="b2c_remun">Raport civil - Remuneratorie (Rata BNR conform art. 2)</option>
                  <option value="custom">Rată contractuală convenită (% / an)</option>
                </select>
              </div>

              @if (interestRelationType === 'custom') {
                <div>
                  <label for="customRateInput" class="block text-xs font-semibold text-gray-300 mb-1">Rată contractuală (% / an)</label>
                  <input 
                    id="customRateInput"
                    type="number" 
                    [(ngModel)]="interestCustomRate" 
                    (ngModelChange)="onParamChange()"
                    placeholder="12" 
                    class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:border-jurist-orange font-mono"
                  />
                </div>
              } @else {
                <div class="bg-black/50 p-3 rounded-lg border border-gray-800 flex justify-between items-center text-xs">
                  <div>
                    <span class="text-gray-400 block">Rată de Referință BNR aplicată:</span>
                    <span class="text-amber-400 font-bold font-mono">{{ bnrReferenceRate }}% / an</span>
                  </div>
                  <div class="text-right">
                    <span class="text-gray-400 block">Rată Legală Totală:</span>
                    <span class="text-emerald-400 font-bold font-mono">{{ getEffectiveInterestRate() }}% / an</span>
                  </div>
                </div>
              }

              <!-- Calendar Start - End -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="interestStartInput" class="block text-xs font-semibold text-gray-300 mb-1">Data Scadenței</label>
                  <input 
                    id="interestStartInput"
                    type="date" 
                    [(ngModel)]="interestStartDate" 
                    (ngModelChange)="onParamChange()"
                    class="w-full bg-black border border-gray-700 rounded-lg p-2 text-xs text-white focus:border-jurist-orange font-mono"
                  />
                </div>
                <div>
                  <label for="interestEndInput" class="block text-xs font-semibold text-gray-300 mb-1">Data Calculului</label>
                  <input 
                    id="interestEndInput"
                    type="date" 
                    [(ngModel)]="interestEndDate" 
                    (ngModelChange)="onParamChange()"
                    class="w-full bg-black border border-gray-700 rounded-lg p-2 text-xs text-white focus:border-jurist-orange font-mono"
                  />
                </div>
              </div>

              <!-- Quick Period Presets -->
              <div class="flex flex-wrap items-center justify-between text-xs text-gray-400 gap-1 bg-black/40 p-2 rounded border border-gray-800">
                <span class="text-[10px]">Intervale rapide:</span>
                <div class="flex gap-1">
                  <button type="button" (click)="setInterestPeriodDays(30)" class="px-1.5 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] rounded cursor-pointer">30z</button>
                  <button type="button" (click)="setInterestPeriodDays(90)" class="px-1.5 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] rounded cursor-pointer">90z</button>
                  <button type="button" (click)="setInterestPeriodMonths(6)" class="px-1.5 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] rounded cursor-pointer">6 luni</button>
                  <button type="button" (click)="setInterestPeriodMonths(12)" class="px-1.5 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] rounded cursor-pointer">1 an</button>
                  <button type="button" (click)="setInterestPeriodMonths(36)" class="px-1.5 py-0.5 bg-gray-800 hover:bg-gray-700 text-amber-300 text-[10px] rounded cursor-pointer font-bold">3 ani</button>
                </div>
              </div>

              <!-- Live Interest Result Card -->
              <div class="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent p-3.5 rounded-lg border border-amber-500/30 space-y-1">
                <div class="flex justify-between items-center">
                  <span class="text-[10px] uppercase font-bold text-gray-400">Total Dobândă Penalizatoare:</span>
                  <span class="text-sm font-bold text-amber-400 font-mono">{{ formatCurrency(calculateInterestTotal()) }} RON</span>
                </div>
                <div class="flex justify-between items-center pt-1 border-t border-gray-800">
                  <span class="text-xs font-bold text-white uppercase">Total Creanță Recuperabilă:</span>
                  <span class="text-base font-black text-emerald-400 font-mono">{{ formatCurrency(calculateTotalClaimDue()) }} RON</span>
                </div>
              </div>

              <!-- Primary Action Button: Generează Raport Dobândă -->
              <button 
                type="button"
                (click)="generateReport('interest')"
                class="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black py-3 rounded-lg font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <span>⚡ Generează / Actualizează Raport Dobândă</span>
              </button>

            </div>
          }

          <!-- TAB 3: DECONT ONORARIU & CHELTUIELI (ART. 453) -->
          @if (activeMode() === 'fee') {
            <div class="bg-gray-900/90 p-5 rounded-xl border border-gray-800 space-y-4 shadow-xl">
              <div class="flex items-center justify-between border-b border-gray-800 pb-2">
                <span class="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-jurist-orange"></span>
                  Decont Onorariu Avocat & Cheltuieli
                </span>
                <span class="text-[10px] text-amber-400 font-mono">Art. 451-453 CPC</span>
              </div>

              <!-- Tip Onorariu -->
              <div>
                <label for="feeTypeSelect" class="block text-xs font-semibold text-gray-300 mb-1">Tip Onorariu</label>
                <select 
                  id="feeTypeSelect"
                  [(ngModel)]="feeType" 
                  (ngModelChange)="onParamChange()"
                  class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:border-jurist-orange font-medium"
                >
                  <option value="fixed">Onorariu Forfetar Fix</option>
                  <option value="hourly">Onorariu Orar (Tarif pe oră × Număr ore)</option>
                  <option value="success">Onorariu Fix + Onorariu de Succes</option>
                </select>
              </div>

              @if (feeType === 'hourly') {
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label for="hourlyRateInput" class="block text-xs font-semibold text-gray-300 mb-1">Tarif Orar (RON/oră)</label>
                    <input 
                      id="hourlyRateInput"
                      type="number" 
                      [(ngModel)]="hourlyRate" 
                      (ngModelChange)="onParamChange()"
                      placeholder="350"
                      class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-xs text-amber-300 font-mono font-bold focus:border-jurist-orange"
                    />
                  </div>
                  <div>
                    <label for="hoursSpentInput" class="block text-xs font-semibold text-gray-300 mb-1">Număr Ore Lucrate</label>
                    <input 
                      id="hoursSpentInput"
                      type="number" 
                      [(ngModel)]="hoursSpent" 
                      (ngModelChange)="onParamChange()"
                      placeholder="10"
                      class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-xs text-white font-mono focus:border-jurist-orange"
                    />
                  </div>
                </div>
              } @else {
                <div>
                  <label for="baseFeeInput" class="block text-xs font-semibold text-gray-300 mb-1">Onorariu Asistență Juridică (RON)</label>
                  <input 
                    id="baseFeeInput"
                    type="number" 
                    [(ngModel)]="baseFee" 
                    (ngModelChange)="onParamChange()"
                    placeholder="3500"
                    class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-sm text-amber-300 font-bold font-mono focus:border-jurist-orange"
                  />
                  <!-- Quick UNBR Guide Presets -->
                  <div class="mt-2 flex flex-wrap items-center gap-1.5">
                    <span class="text-[10px] text-gray-400 mr-1">Recomandări UNBR:</span>
                    <button type="button" (click)="setBaseFeeAmount(1500)" class="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] rounded border border-gray-700 cursor-pointer">1.500 lei (Ordonanță)</button>
                    <button type="button" (click)="setBaseFeeAmount(2500)" class="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] rounded border border-gray-700 cursor-pointer">2.500 lei (Muncă)</button>
                    <button type="button" (click)="setBaseFeeAmount(3500)" class="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-amber-300 text-[10px] rounded border border-amber-500/40 cursor-pointer font-bold">3.500 lei (Drept comun)</button>
                    <button type="button" (click)="setBaseFeeAmount(4500)" class="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] rounded border border-gray-700 cursor-pointer">4.500 lei (Comercial)</button>
                  </div>
                </div>
              }

              @if (feeType === 'success') {
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label for="successPercentInput" class="block text-xs font-semibold text-gray-300 mb-1">% Succes</label>
                    <input 
                      id="successPercentInput"
                      type="number" 
                      [(ngModel)]="successPercent" 
                      (ngModelChange)="onParamChange()"
                      placeholder="10"
                      class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-xs text-white font-mono focus:border-jurist-orange"
                    />
                  </div>
                  <div>
                    <label for="successStakeInput" class="block text-xs font-semibold text-gray-300 mb-1">Valoare Miză (RON)</label>
                    <input 
                      id="successStakeInput"
                      type="number" 
                      [(ngModel)]="successStakeValue" 
                      (ngModelChange)="onParamChange()"
                      placeholder="50000"
                      class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-xs text-white font-mono focus:border-jurist-orange"
                    />
                  </div>
                </div>
              }

              <!-- Alte Cheltuieli -->
              <div>
                <label for="otherExpensesInput" class="block text-xs font-semibold text-gray-300 mb-1">Alte Cheltuieli Procesuale Justificate (RON)</label>
                <input 
                  id="otherExpensesInput"
                  type="number" 
                  [(ngModel)]="otherExpenses" 
                  (ngModelChange)="onParamChange()"
                  placeholder="0 (Ex: expertiză, deplasare, traduceri)" 
                  class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-xs text-white font-mono focus:border-jurist-orange"
                />
              </div>

              <!-- Live Decont Result Card -->
              <div class="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent p-3.5 rounded-lg border border-amber-500/30 flex items-center justify-between">
                <div>
                  <span class="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">Total Decont Cheltuieli</span>
                  <span class="text-[11px] text-gray-400 leading-tight block">Art. 451-453 CPC</span>
                </div>
                <div class="text-right">
                  <div class="text-lg font-black text-amber-300 font-mono">{{ formatCurrency(calculateFeeTotal()) }} RON</div>
                  <span class="text-[10px] text-emerald-400 font-medium">Pregătit pentru Instanță</span>
                </div>
              </div>

              <div class="space-y-2 pt-2 border-t border-gray-800">
                <input 
                  type="text" 
                  [(ngModel)]="contractNumber" 
                  (ngModelChange)="onParamChange()"
                  placeholder="Nr. Contract Asistență Juridică (Ex: CAJ 89/2026)" 
                  class="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-jurist-orange font-mono"
                />
                <input 
                  type="text" 
                  [(ngModel)]="clientName" 
                  (ngModelChange)="onParamChange()"
                  placeholder="Nume Client / Beneficiar" 
                  class="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-jurist-orange"
                />
              </div>

              <!-- Primary Action Button: Generează Decont -->
              <button 
                type="button"
                (click)="generateReport('fee')"
                class="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black py-3 rounded-lg font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <span>⚡ Generează / Actualizează Decont A4</span>
              </button>

            </div>
          }

          <!-- TAB 4: DEVIZ AI AVANSAT -->
          @if (activeMode() === 'ai_deviz') {
            <div class="bg-gray-900/90 p-5 rounded-xl border border-indigo-500/30 space-y-4 shadow-xl">
              <div class="flex items-center justify-between border-b border-gray-800 pb-2">
                <span class="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                  Generare Deviz AI & Strategie Fiscală
                </span>
                <span class="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded font-mono">Expert UNBR</span>
              </div>

              <div>
                <label for="aiActionType" class="block text-xs font-semibold text-gray-300 mb-1">Tip Acțiune / Cerere</label>
                <input 
                  id="aiActionType"
                  type="text" 
                  [(ngModel)]="aiActionType" 
                  placeholder="Ex: Acțiune în pretenții, Evacuare, Partaj succesoral..."
                  class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label for="aiFinancialDetails" class="block text-xs font-semibold text-gray-300 mb-1">Valoare Pretenții / Detalii Financiare</label>
                <input 
                  id="aiFinancialDetails"
                  type="text" 
                  [(ngModel)]="aiFinancialDetails" 
                  placeholder="Ex: 100.000 RON sau 50.000 EUR..."
                  class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label for="aiExtraDetails" class="block text-xs font-semibold text-gray-300 mb-1">Mențiuni Speciale / Cheltuieli Estimate</label>
                <textarea 
                  id="aiExtraDetails"
                  [(ngModel)]="aiExtraDetails" 
                  rows="3"
                  placeholder="Ex: Deplasări la instanță, necesitate expertiză topografică / contabilă..."
                  class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:border-indigo-500 resize-none"
                ></textarea>
              </div>

              <button 
                (click)="generateAiDeviz()" 
                [disabled]="juristService.isLoading()"
                class="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(99,102,241,0.4)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                @if (juristService.isLoading()) {
                  <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Se generează devizul fiscal oficial...</span>
                } @else {
                  <span>⚡ Generează Deviz & Notă Oficială</span>
                }
              </button>
            </div>
          }

          <!-- Antet Cabinet Editabil -->
          <div class="bg-gray-900/60 p-3.5 rounded-xl border border-gray-800 space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-gray-300 uppercase tracking-wider block">Antet Cabinet (Sincronizat cu Profilul)</span>
              <button 
                (click)="juristService.setModule('profile')"
                class="text-[10px] text-jurist-orange hover:underline cursor-pointer flex items-center gap-1"
              >
                Editează în Profil
              </button>
            </div>
            <input 
              type="text" 
              [(ngModel)]="cabinetTitle" 
              (ngModelChange)="onParamChange()"
              placeholder="CABINET DE AVOCAT POPESCU IOAN / SCA POPESCU & ASOCIAȚII" 
              class="w-full bg-black border border-gray-700 rounded-lg px-2.5 py-2 text-xs text-amber-300 placeholder-gray-600 focus:border-jurist-orange font-mono"
            />
          </div>

        </div>

        <!-- RIGHT PANEL: Realistic A4 Sheet & Output (7 cols) -->
        <div class="lg:col-span-7 flex flex-col h-full overflow-hidden bg-[#0c0d0e] border border-gray-800 rounded-xl shadow-2xl">
          
          <!-- Top Bar Toolbar -->
          <div class="bg-gray-900/90 border-b border-gray-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 backdrop-blur-md">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Document Oficial A4 • Format Instanță / Decont
              </span>
            </div>

            <!-- Actions: Copy, Print/PDF, Word -->
            <div class="flex items-center gap-2">
              <button 
                (click)="copyDocument()"
                class="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs rounded-lg border border-gray-700 flex items-center gap-1.5 transition-all shadow-sm active:scale-95 font-medium cursor-pointer"
                title="Copiază conținutul în clipboard"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
                <span>Copiază</span>
              </button>

              <button 
                (click)="exportWordDoc()"
                class="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs rounded-lg border border-blue-500/30 flex items-center gap-1.5 transition-all active:scale-95 font-medium cursor-pointer"
                title="Descarcă în format Word (.doc) complet stilizat cu datele cabinetului"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <span>Word (.doc)</span>
              </button>

              <button 
                (click)="printOrPdf()"
                class="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                title="Listare sau Salvare ca PDF pentru Instanță / Client"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24-1.048-.37-2.14-.37-3.26 0-3.313 1.94-6.172 4.77-7.568.5-.246 1.05-.417 1.63-.501.58-.084 1.17-.084 1.75 0 .58.084 1.13.255 1.63.501C19.34 4.397 21.28 7.256 21.28 10.57c0 1.119-.13 2.211-.37 3.259M16.5 18H18a3 3 0 003-3v-2.25A2.25 2.25 0 0018.75 10.5h-13.5A2.25 2.25 0 003 12.75V15a3 3 0 003 3h1.5M6 18h12M6 18v3.75A1.5 1.5 0 007.5 23.25h9a1.5 1.5 0 001.5-1.5V18" />
                </svg>
                <span>PDF / Print</span>
              </button>
            </div>
          </div>

          <!-- Document Area (A4 Paper View) -->
          <div class="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#08090a] flex justify-center items-start">
            
            <!-- COALA A4 REALISTĂ -->
            <div 
              #a4Document
              class="w-full max-w-[820px] bg-[#fcfcfd] text-[#111827] shadow-[0_20px_60px_rgba(0,0,0,0.7)] rounded-sm min-h-[850px] p-8 sm:p-12 border border-gray-300 flex flex-col justify-between selection:bg-amber-200 font-sans"
            >
              
              <!-- Top Antet Cabinet -->
              <div>
                <!-- Antet Cabinet (Header A4) -->
                <div class="border-b-2 border-gray-900 pb-4 mb-6 flex items-start justify-between gap-4">
                  <div>
                    <div class="text-[13px] font-bold tracking-widest text-black uppercase">
                      {{ cabinetTitle || juristService.profile().name || 'CABINET DE AVOCAT / SOCIETATE CIVILĂ PROFESIONALĂ' }}
                    </div>
                    <div class="text-[11px] text-gray-700 tracking-wide mt-0.5 font-medium">
                      {{ (juristService.profile().lawyerName ? juristService.profile().lawyerName + ' • ' : '') + (juristService.profile().barId || 'Baroul României') }}
                    </div>
                    @if (juristService.profile().address || juristService.profile().cif) {
                      <div class="text-[10px] text-gray-500 mt-0.5">
                        @if (juristService.profile().address) { <span>{{ juristService.profile().address }}</span> }
                        @if (juristService.profile().address && juristService.profile().cif) { <span> | </span> }
                        @if (juristService.profile().cif) { <span>CIF: {{ juristService.profile().cif }}</span> }
                      </div>
                    }
                    @if (juristService.profile().phone || juristService.profile().email) {
                      <div class="text-[10px] text-gray-500">
                        @if (juristService.profile().phone) { <span>Tel: {{ juristService.profile().phone }}</span> }
                        @if (juristService.profile().phone && juristService.profile().email) { <span> | </span> }
                        @if (juristService.profile().email) { <span>Email: {{ juristService.profile().email }}</span> }
                      </div>
                    }
                  </div>
                  <div class="text-right text-[11px] text-gray-600 font-mono">
                    <div>Data: <span class="text-gray-900 font-bold">{{ currentDate }}</span></div>
                    <div class="text-[10px] text-amber-800 font-bold uppercase tracking-wider mt-0.5">EXEMPLAR OFICIAL</div>
                  </div>
                </div>

                <!-- Document Header Title -->
                <div class="text-center my-6">
                  <h3 class="text-lg font-extrabold uppercase tracking-wide text-black border-b border-gray-400 inline-block pb-1">
                    @if (activeMode() === 'timbre') {
                      NOTĂ DE CALCUL TAXĂ JUDICIARĂ DE TIMBRU
                    } @else if (activeMode() === 'interest') {
                      NOTĂ DE CALCUL DOBÂNDĂ LEGALĂ PENALIZATOARE
                    } @else if (activeMode() === 'fee') {
                      DECONT JUSTIFICATIV ONORARIU & CHELTUIELI DE JUDECATĂ
                    } @else {
                      DEVIZ FINANCIAR ESTIMATIV & NOTĂ DE CALCUL
                    }
                  </h3>
                  <div class="text-xs text-gray-600 mt-1">
                    @if (dossierNumber || courtName) {
                      <span>Dosar nr. <strong>{{ dossierNumber || '...' }}</strong> • {{ courtName || 'Instanța competentă' }}</span>
                    } @else {
                      <span>Conform normelor OUG 80/2013 & Codului de Procedură Civilă</span>
                    }
                  </div>
                </div>

                <!-- Section: Părți & Dosar Info -->
                @if (partiesDesc || clientName) {
                  <div class="bg-gray-100/90 p-3.5 rounded border border-gray-200 text-xs mb-6 space-y-1">
                    @if (partiesDesc) {
                      <div><strong>Părțile dosarului:</strong> {{ partiesDesc }}</div>
                    }
                    @if (clientName) {
                      <div><strong>Beneficiar / Client:</strong> {{ clientName }}</div>
                    }
                    @if (contractNumber) {
                      <div><strong>Contract Asistență Juridică:</strong> {{ contractNumber }}</div>
                    }
                  </div>
                }

                <!-- MODE 1: NOTA TAXA TIMBRU -->
                @if (activeMode() === 'timbre') {
                  <div class="space-y-4 text-xs">
                    <div class="border border-gray-300 rounded overflow-hidden">
                      <table class="w-full text-left border-collapse">
                        <thead>
                          <tr class="bg-gray-100 border-b border-gray-300 text-gray-700 uppercase text-[10px] tracking-wider">
                            <th class="p-2.5 font-bold">Element Calcul</th>
                            <th class="p-2.5 font-bold">Temei Legal</th>
                            <th class="p-2.5 font-bold text-right">Valoare / Cuantum</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                          <tr>
                            <td class="p-2.5 font-medium">Obiect cerere / Categorie</td>
                            <td class="p-2.5 text-gray-600">{{ getTimbreLegalBasis() }}</td>
                            <td class="p-2.5 text-right font-mono">{{ timbreCategoryLabel() }}</td>
                          </tr>
                          @if (timbreClaimValue > 0) {
                            <tr>
                              <td class="p-2.5 font-medium">Valoarea obiectului cererii (petitum)</td>
                              <td class="p-2.5 text-gray-600">Art. 3 alin. (1) OUG 80/2013</td>
                              <td class="p-2.5 text-right font-mono font-bold">{{ formatCurrency(timbreClaimValue) }} RON</td>
                            </tr>
                          }
                          <tr>
                            <td class="p-2.5 font-medium">Formulă aplicată de calcul</td>
                            <td class="p-2.5 text-gray-600" colspan="2">{{ getTimbreFormula() }}</td>
                          </tr>
                          @if (timbreAjutorPublic) {
                            <tr class="text-amber-800 bg-amber-50">
                              <td class="p-2.5 font-medium">Cerere de ajutor public judiciar</td>
                              <td class="p-2.5">OUG 51/2008</td>
                              <td class="p-2.5 text-right font-bold">Scutire / Eșalonare solicitată</td>
                            </tr>
                          }
                          @if (timbreTranzactie) {
                            <tr class="text-emerald-800 bg-emerald-50">
                              <td class="p-2.5 font-medium">Restituire în caz de tranzacție (50%)</td>
                              <td class="p-2.5">Art. 45 alin. (1) OUG 80/2013</td>
                              <td class="p-2.5 text-right font-mono font-bold">- {{ formatCurrency(calculateTimbreTax() / 2) }} RON</td>
                            </tr>
                          }
                        </tbody>
                        <tfoot>
                          <tr class="bg-gray-900 text-white font-bold text-sm">
                            <td class="p-3 uppercase" colspan="2">TOTAL TAXĂ JUDICIARĂ DE TIMBRU DATORATĂ:</td>
                            <td class="p-3 text-right font-mono text-amber-400 text-base">
                              {{ formatCurrency(calculateTimbreTax()) }} RON
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    <div class="bg-gray-50 p-3 rounded border border-gray-200 text-[11px] text-gray-600 leading-relaxed">
                      <strong>Mențiune procedurală:</strong> Taxa judiciară de timbru se achită în contul bugetului local al unității administrativ-teritoriale în a cărei rază își are domiciliul/sediul reclamantul, recipisa originală atașându-se la cererea introductivă de instanță (art. 40 alin. 1 din OUG nr. 80/2013).
                    </div>
                  </div>
                }

                <!-- MODE 2: NOTA DOBANDA LEGALA -->
                @if (activeMode() === 'interest') {
                  <div class="space-y-4 text-xs">
                    <div class="border border-gray-300 rounded overflow-hidden">
                      <table class="w-full text-left border-collapse">
                        <thead>
                          <tr class="bg-gray-100 border-b border-gray-300 text-gray-700 uppercase text-[10px] tracking-wider">
                            <th class="p-2.5 font-bold">Parametru</th>
                            <th class="p-2.5 font-bold">Referință Legală</th>
                            <th class="p-2.5 font-bold text-right">Valoare</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                          <tr>
                            <td class="p-2.5 font-medium">Debit Principal (Creanță certă, lichidă și exigibilă)</td>
                            <td class="p-2.5 text-gray-600">Codul Civil / Contract</td>
                            <td class="p-2.5 text-right font-mono font-bold">{{ formatCurrency(interestPrincipal) }} RON</td>
                          </tr>
                          <tr>
                            <td class="p-2.5 font-medium">Rată de bază BNR + Marjă legală</td>
                            <td class="p-2.5 text-gray-600">OG 13/2011 ({{ interestRelationLabel() }})</td>
                            <td class="p-2.5 text-right font-mono font-bold">{{ getEffectiveInterestRate() }}% / an</td>
                          </tr>
                          <tr>
                            <td class="p-2.5 font-medium">Interval întârziere</td>
                            <td class="p-2.5 text-gray-600">{{ interestStartDate }} — {{ interestEndDate }}</td>
                            <td class="p-2.5 text-right font-mono font-bold">{{ getDaysDiff() }} zile</td>
                          </tr>
                          <tr>
                            <td class="p-2.5 font-medium">Formulă matematică aplicată</td>
                            <td class="p-2.5 text-gray-600" colspan="2">
                              Debit × (Rată % / 365) × Număr Zile = 
                              {{ formatCurrency(interestPrincipal) }} × ({{ getEffectiveInterestRate() }}% / 365) × {{ getDaysDiff() }} zile
                            </td>
                          </tr>
                        </tbody>
                        <tfoot>
                          <tr class="bg-gray-100 font-bold border-t border-gray-300">
                            <td class="p-2.5 uppercase" colspan="2">Total Dobândă Penalizatoare Calculată:</td>
                            <td class="p-2.5 text-right font-mono text-amber-700 text-sm">
                              {{ formatCurrency(calculateInterestTotal()) }} RON
                            </td>
                          </tr>
                          <tr class="bg-gray-900 text-white font-bold text-sm">
                            <td class="p-3 uppercase" colspan="2">TOTAL CREANȚĂ DE RECUPERAT (DEBIT + DOBÂNDĂ):</td>
                            <td class="p-3 text-right font-mono text-amber-400 text-base">
                              {{ formatCurrency(calculateTotalClaimDue()) }} RON
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                }

                <!-- MODE 3: DECONT ONORARIU & CHELTUIELI -->
                @if (activeMode() === 'fee') {
                  <div class="space-y-4 text-xs">
                    <div class="border border-gray-300 rounded overflow-hidden">
                      <table class="w-full text-left border-collapse">
                        <thead>
                          <tr class="bg-gray-100 border-b border-gray-300 text-gray-700 uppercase text-[10px] tracking-wider">
                            <th class="p-2.5 font-bold">Descriere Serviciu Avocațial / Cheltuială</th>
                            <th class="p-2.5 font-bold">Temei / Justificare</th>
                            <th class="p-2.5 font-bold text-right">Cuantum (RON)</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                          <tr>
                            <td class="p-2.5 font-medium">
                              @if (feeType === 'hourly') {
                                Onorariu orar: {{ hoursSpent }} ore × {{ hourlyRate }} RON/oră
                              } @else {
                                Onorariu asistență și reprezentare judiciară
                              }
                            </td>
                            <td class="p-2.5 text-gray-600">Legea 51/1995 & Contract</td>
                            <td class="p-2.5 text-right font-mono font-bold">{{ formatCurrency(getBaseFeeCalculated()) }} RON</td>
                          </tr>
                          @if (feeType === 'success' && getSuccessFeeCalculated() > 0) {
                            <tr>
                              <td class="p-2.5 font-medium">Onorariu de succes ({{ successPercent }}% din {{ formatCurrency(successStakeValue) }} RON)</td>
                              <td class="p-2.5 text-gray-600">Statutul profesiei de avocat</td>
                              <td class="p-2.5 text-right font-mono font-bold">{{ formatCurrency(getSuccessFeeCalculated()) }} RON</td>
                            </tr>
                          }
                          @if (otherExpenses > 0) {
                            <tr>
                              <td class="p-2.5 font-medium">Cheltuieli procesuale justificate (traduceri, taxe, deplasare)</td>
                              <td class="p-2.5 text-gray-600">Art. 451-453 C.proc.civ.</td>
                              <td class="p-2.5 text-right font-mono font-bold">{{ formatCurrency(otherExpenses) }} RON</td>
                            </tr>
                          }
                        </tbody>
                        <tfoot>
                          <tr class="bg-gray-900 text-white font-bold text-sm">
                            <td class="p-3 uppercase" colspan="2">TOTAL CHELTUIELI DE JUDECATĂ SOLICITATE:</td>
                            <td class="p-3 text-right font-mono text-amber-400 text-base">
                              {{ formatCurrency(calculateFeeTotal()) }} RON
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    <div class="bg-gray-50 p-3 rounded border border-gray-200 text-[11px] text-gray-600 leading-relaxed">
                      <strong>Temei de acordare în instanță:</strong> Conform art. 453 alin. (1) C.proc.civ., partea care pierde procesul va fi obligată, la cererea părții care a câștigat, să îi plătească acesteia cheltuielile de judecată. Dovada achitării onorariului de avocat se face prin chitanță / ordin de plată bancar atașat la prezentul decont.
                    </div>
                  </div>
                }

                <!-- MODE 4: DEVIZ AI AVANSAT -->
                @if (activeMode() === 'ai_deviz') {
                  <div class="space-y-4">
                    @if (juristService.isLoading()) {
                      <div class="py-12 flex flex-col items-center justify-center text-center">
                        <div class="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                        <p class="text-xs text-gray-600 font-medium">Se elaborează devizul fiscal oficial conform OUG 80/2013 și ghidului UNBR...</p>
                      </div>
                    } @else if (aiDevizResult()) {
                      <div class="text-xs text-gray-900 leading-relaxed whitespace-pre-wrap font-sans text-justify">
                        {{ aiDevizResult() }}
                      </div>
                    } @else {
                      <div class="py-12 text-center text-gray-400 text-xs">
                        Completați parametrii din stânga și apăsați butonul <strong>„Generează Deviz & Notă Oficială”</strong>.
                      </div>
                    }
                  </div>
                }

              </div>

              <!-- Formal Signature Footer -->
              <div class="border-t border-gray-300 pt-6 mt-12 flex justify-between items-end text-xs">
                <div>
                  <div class="font-bold text-gray-800 uppercase">{{ cabinetTitle || 'CABINET DE AVOCAT' }}</div>
                  <div class="text-[11px] text-gray-500 mt-0.5">Avocat Titular / Coordonator</div>
                </div>
                <div class="text-right">
                  <div class="text-gray-400 text-[10px] mb-6">Loc Ștampilă & Semnătură</div>
                  <div class="border-b border-dashed border-gray-400 w-48 ml-auto"></div>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  `
})
export class FeesComponent {
  juristService = inject(JuristService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('a4Document') a4Document?: ElementRef<HTMLDivElement>;

  activeMode = signal<'timbre' | 'interest' | 'fee' | 'ai_deviz'>('timbre');

  // Meta info
  cabinetTitle = '';
  dossierNumber = '';
  courtName = '';
  partiesDesc = '';
  clientName = '';
  contractNumber = '';

  currentDate = new Date().toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  // 1. Timbre State
  timbreCategory = 'evaluable';
  timbreClaimValue = 50000;
  timbreAjutorPublic = false;
  timbreTranzactie = false;

  // 2. Interest State
  interestPrincipal = 25000;
  interestRelationType = 'b2b';
  bnrReferenceRate = 6.5;
  interestCustomRate = 12;
  interestStartDate = new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().slice(0, 10);
  interestEndDate = new Date().toISOString().slice(0, 10);

  // 3. Fee State
  feeType = 'fixed';
  baseFee = 3500;
  hourlyRate = 400;
  hoursSpent = 8;
  successPercent = 10;
  successStakeValue = 50000;
  otherExpenses = 300;

  // 4. AI Deviz State
  aiActionType = 'Acțiune în Pretenții (Bănești)';
  aiFinancialDetails = '100.000 RON';
  aiExtraDetails = '';
  aiDevizResult = signal<string>('');

  constructor() {
    effect(() => {
      const prof = this.juristService.profile();
      if (prof.name && !this.cabinetTitle) {
        this.cabinetTitle = prof.name;
        this.cdr.markForCheck();
      }
    });
  }

  setMode(mode: 'timbre' | 'interest' | 'fee' | 'ai_deviz') {
    this.activeMode.set(mode);
    this.cdr.markForCheck();
  }

  onParamChange() {
    this.cdr.markForCheck();
  }

  setTimbreAmount(amount: number) {
    this.timbreClaimValue = amount;
    this.cdr.markForCheck();
    this.notificationService.info(`Valoare obiect setată la ${this.formatCurrency(amount)} RON`);
  }

  setInterestPrincipal(amount: number) {
    this.interestPrincipal = amount;
    this.cdr.markForCheck();
    this.notificationService.info(`Debit setat la ${this.formatCurrency(amount)} RON`);
  }

  setInterestPeriodDays(days: number) {
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    this.interestEndDate = end.toISOString().slice(0, 10);
    this.interestStartDate = start.toISOString().slice(0, 10);
    this.cdr.markForCheck();
  }

  setInterestPeriodMonths(months: number) {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - months);
    this.interestEndDate = end.toISOString().slice(0, 10);
    this.interestStartDate = start.toISOString().slice(0, 10);
    this.cdr.markForCheck();
  }

  setBaseFeeAmount(amount: number) {
    this.baseFee = amount;
    this.cdr.markForCheck();
    this.notificationService.info(`Onorariu setat la ${this.formatCurrency(amount)} RON`);
  }

  generateReport(mode: 'timbre' | 'interest' | 'fee') {
    this.cdr.markForCheck();
    if (mode === 'timbre') {
      const tax = this.calculateTimbreTax();
      this.notificationService.success(`Notă de calcul generată: Taxă timbru ${this.formatCurrency(tax)} RON`);
    } else if (mode === 'interest') {
      const interest = this.calculateInterestTotal();
      this.notificationService.success(`Raport dobândă generat: ${this.formatCurrency(interest)} RON dobândă`);
    } else {
      const fee = this.calculateFeeTotal();
      this.notificationService.success(`Decont justificativ generat: Total ${this.formatCurrency(fee)} RON`);
    }
  }

  isClaimValueRequired(): boolean {
    return [
      'evaluable',
      'revendicare',
      'uzucapiune',
      'anulare_contract',
      'partaj',
      'apel',
      'contestatie_executare',
      'contencios_patrimonial',
      'valoare_redusa'
    ].includes(this.timbreCategory);
  }

  // --- TIMBRE LOGIC (OUG 80/2013 & CPC) ---
  calculateTimbreTax(): number {
    const category = this.timbreCategory;
    const value = Math.max(0, Number(this.timbreClaimValue) || 0);
    let totalTax = 0;

    switch (category) {
      // 1. Drept Civil & Pretenții
      case 'evaluable':
      case 'revendicare':
      case 'uzucapiune':
      case 'anulare_contract':
        totalTax = this.calculateBaseEvaluableTax(value);
        break;

      case 'granituire':
        totalTax = 100;
        break;

      case 'posesorie':
        totalTax = 100;
        break;

      case 'neevaluabil':
        totalTax = 20;
        break;

      // 2. Proceduri Rapide & Urgență
      case 'ordonanta':
        totalTax = 200;
        break;

      case 'valoare_redusa':
        totalTax = value <= 2000 ? 50 : 200;
        break;

      case 'ordonanta_presedintiala':
        totalTax = 20;
        break;

      case 'evacuare':
        totalTax = 100;
        break;

      case 'sechestru_asigurator':
      case 'sechestru_judiciar':
        totalTax = 100;
        break;

      case 'asigurare_dovezi':
        totalTax = 20;
        break;

      // 3. Executare Silită & Carte Funciară
      case 'contestatie_executare': {
        const baseContestatie = this.calculateBaseEvaluableTax(value);
        totalTax = Math.min(1000, baseContestatie);
        break;
      }

      case 'contestatie_executare_act':
        totalTax = 100;
        break;

      case 'executare':
        totalTax = 20;
        break;

      case 'suspendare_executare':
        totalTax = 50;
        break;

      case 'validare_poprire':
        totalTax = 20;
        break;

      case 'plangere_cf':
        totalTax = 50;
        break;

      case 'investire_titlu':
        totalTax = 20;
        break;

      // 4. Dreptul Familiei & Persoane
      case 'divort':
        totalTax = 200;
        break;

      case 'divort_culpa':
        totalTax = 100;
        break;

      case 'partaj':
        totalTax = value > 0 ? value * 0.03 : 50;
        break;

      case 'exercitare_autoritate':
        totalTax = 20;
        break;

      case 'pensie_intretinere':
      case 'curatela_tutela':
        totalTax = 0; // Scutit de drept conform art. 29
        break;

      case 'asociatii_fundatii':
        totalTax = 100;
        break;

      // 5. Contencios Administrativ, Fiscal & Contravențional
      case 'plangere_contraventionala':
        totalTax = 20;
        break;

      case 'contencios_anulare':
      case 'contencios_suspendare':
        totalTax = 50;
        break;

      case 'contencios_patrimonial':
        totalTax = this.calculateBaseEvaluableTax(value);
        break;

      // 6. Comercial, Societăți & Insolvență
      case 'insolventa_deschidere':
      case 'insolventa_creanta':
        totalTax = 200;
        break;

      case 'anulare_aga':
      case 'registru_comert':
        totalTax = 100;
        break;

      // 7. Căi de Atac
      case 'apel': {
        const baseApel = this.calculateBaseEvaluableTax(value);
        totalTax = baseApel * 0.5;
        break;
      }

      case 'recurs':
      case 'contestatie_anulare':
      case 'revizuire':
        totalTax = 100;
        break;

      // 8. Scutiri Expres (Art. 29)
      case 'scutit_munca':
      case 'scutit_penal':
      case 'scutit_protectie':
      case 'scutit_asigurari':
      case 'scutit_consumator':
        totalTax = 0;
        break;
    }

    if (this.timbreTranzactie && totalTax > 0) {
      totalTax = totalTax / 2;
    }

    return Math.round(totalTax * 100) / 100;
  }

  getTimbreFormula(): string {
    const category = this.timbreCategory;
    const value = Math.max(0, Number(this.timbreClaimValue) || 0);

    switch (category) {
      case 'evaluable':
      case 'revendicare':
      case 'uzucapiune':
      case 'anulare_contract':
      case 'contencios_patrimonial':
        if (value <= 500) return '8% din valoare, dar nu mai puțin de 20 lei';
        if (value <= 5000) return '40 lei + 7% pentru ce depășește 500 lei';
        if (value <= 25000) return '355 lei + 5% pentru ce depășește 5.000 lei';
        if (value <= 50000) return '1.355 lei + 3% pentru ce depășește 25.000 lei';
        if (value <= 250000) return '2.105 lei + 2% pentru ce depășește 50.000 lei';
        return '6.105 lei + 1% pentru ce depășește 250.000 lei';
      case 'granituire':
        return 'Taxă fixă 100 lei (grănițuire fără revendicare); la revendicare se adaugă taxa la valoare conform art. 3';
      case 'posesorie':
        return 'Taxă fixă 100 lei pentru acțiuni posesorii';
      case 'neevaluabil':
        return 'Taxă fixă 20 lei (cerere neevaluabilă în bani conform art. 8 alin. 1)';
      case 'ordonanta':
        return 'Taxă fixă 200 lei pentru procedura ordonanței de plată';
      case 'valoare_redusa':
        return value <= 2000 
          ? 'Taxă fixă 50 lei (debit principal & accesorii până la 2.000 lei inclusiv)' 
          : 'Taxă fixă 200 lei (debit între 2.000 lei și 10.000 lei)';
      case 'ordonanta_presedintiala':
        return 'Taxă fixă 20 lei pentru cererile de ordonanță președințială';
      case 'evacuare':
        return 'Taxă fixă 100 lei pentru cererile de evacuare pe procedura specială din CPC';
      case 'sechestru_asigurator':
      case 'sechestru_judiciar':
        return 'Taxă fixă 100 lei pentru încuviințarea măsurilor asigurătorii';
      case 'asigurare_dovezi':
        return 'Taxă fixă 20 lei pentru cererea de asigurare a dovezilor';
      case 'contestatie_executare':
        return 'Calculată la valoarea debitului / bunurilor urmărite conform grilei Art. 3, plafonată la maxim 1.000 lei';
      case 'contestatie_executare_act':
        return 'Taxă fixă 100 lei pentru contestație împotriva unui act de executare fără obiect evaluabil';
      case 'executare':
        return 'Taxă fixă 20 lei pentru fiecare cerere de încuviințare a executării silite';
      case 'suspendare_executare':
        return 'Taxă fixă 50 lei pentru cererea de suspendare a executării silite';
      case 'validare_poprire':
        return 'Taxă fixă 20 lei pentru cererea de validare a popririi';
      case 'plangere_cf':
        return 'Taxă fixă 50 lei pentru plângerea împotriva încheierii de carte funciară';
      case 'investire_titlu':
        return 'Taxă fixă 20 lei pentru învestirea sau recunoașterea titlului executoriu';
      case 'divort':
        return 'Taxă fixă 200 lei pentru divorț prin acordul soților (la cererea ambilor soți sau a unuia acceptată de celălalt)';
      case 'divort_culpa':
        return 'Taxă fixă 100 lei pentru divorț din culpă, separare în fapt sau motive temeinice';
      case 'partaj':
        return '3% din valoarea masei partajabile (sau 50 lei fix dacă nu se contestă compunerea masei / creanțele)';
      case 'exercitare_autoritate':
        return 'Taxă fixă 20 lei pentru cereri privind autoritatea părintească, locuința minorului și programul de vizită';
      case 'pensie_intretinere':
      case 'curatela_tutela':
        return '0 lei — Scutită expres de la plata taxei judiciare de timbru conform Art. 29 OUG 80/2013';
      case 'asociatii_fundatii':
        return 'Taxă fixă 100 lei pentru cereri de înregistrare sau modificare acte constitutive asociații/fundații';
      case 'plangere_contraventionala':
        return 'Taxă fixă 20 lei pentru plângeri împotriva proceselor-verbale de contravenție (OG 2/2001 & Art. 19 OUG 80)';
      case 'contencios_anulare':
        return 'Taxă fixă 50 lei pentru cereri de anulare a actelor administrative cu caracter individual';
      case 'contencios_suspendare':
        return 'Taxă fixă 50 lei pentru cererea de suspendare a executării actului administrativ (Art. 14 Legea 554/2004)';
      case 'insolventa_deschidere':
      case 'insolventa_creanta':
        return 'Taxă fixă 200 lei conform procedurilor speciale din Legea nr. 85/2014 & Art. 14 OUG 80/2013';
      case 'anulare_aga':
      case 'registru_comert':
        return 'Taxă fixă 100 lei conform Legii 31/1990 și OUG 80/2013';
      case 'apel':
        return '50% din taxa datorată pentru cererea introductivă de fond (Art. 23 alin. 1 OUG 80/2013)';
      case 'recurs':
      case 'contestatie_anulare':
      case 'revizuire':
        return 'Taxă fixă 100 lei (sau 50% din taxa la fond conform dispozițiilor art. 24–25 OUG 80/2013)';
      case 'scutit_munca':
        return '0 lei — Scutită de drept conform Art. 29 alin. (1) lit. a) OUG 80/2013 (Litigii de muncă și salariale)';
      case 'scutit_penal':
        return '0 lei — Scutită de drept conform Art. 29 alin. (1) lit. i) OUG 80/2013 (Latura civilă din procesul penal)';
      case 'scutit_protectie':
        return '0 lei — Scutită de drept conform Legii nr. 217/2003 & Art. 29 OUG 80/2013 (Ordine de protecție)';
      case 'scutit_asigurari':
        return '0 lei — Scutită de drept conform Art. 29 alin. (1) lit. a) OUG 80/2013 (Drepturi pensii & asigurări sociale)';
      case 'scutit_consumator':
        return '0 lei — Scutită de drept conform Art. 29 alin. (1) lit. f) OUG 80/2013 (Protecția consumatorilor)';
      default:
        return 'Calcul conform normelor OUG nr. 80/2013';
    }
  }

  getTimbreLegalBasis(): string {
    const category = this.timbreCategory;
    switch (category) {
      case 'evaluable': return 'Art. 3 alin. (1) OUG 80/2013';
      case 'revendicare': return 'Art. 3 alin. (1) raportat la Art. 31 OUG 80/2013';
      case 'uzucapiune': return 'Art. 3 alin. (1) OUG 80/2013';
      case 'anulare_contract': return 'Art. 3 alin. (1) OUG 80/2013';
      case 'granituire': return 'Art. 4 alin. (2) OUG 80/2013';
      case 'posesorie': return 'Art. 4 alin. (1) OUG 80/2013';
      case 'neevaluabil': return 'Art. 8 alin. (1) OUG 80/2013';
      case 'ordonanta': return 'Art. 6 alin. (2) OUG 80/2013';
      case 'valoare_redusa': return 'Art. 6 alin. (1) OUG 80/2013';
      case 'ordonanta_presedintiala': return 'Art. 6 alin. (4) OUG 80/2013';
      case 'evacuare': return 'Art. 6 alin. (3) OUG 80/2013';
      case 'sechestru_asigurator':
      case 'sechestru_judiciar': return 'Art. 11 alin. (1)-(2) OUG 80/2013';
      case 'asigurare_dovezi': return 'Art. 7 OUG 80/2013';
      case 'contestatie_executare': return 'Art. 10 alin. (2) OUG 80/2013';
      case 'contestatie_executare_act': return 'Art. 10 alin. (2) OUG 80/2013';
      case 'executare': return 'Art. 10 alin. (1) lit. a) OUG 80/2013';
      case 'suspendare_executare': return 'Art. 10 alin. (1) lit. c) OUG 80/2013';
      case 'validare_poprire': return 'Art. 10 alin. (1) lit. a) OUG 80/2013';
      case 'plangere_cf': return 'Art. 20 OUG 80/2013 & Legea 7/1996';
      case 'investire_titlu': return 'Art. 10 alin. (1) OUG 80/2013';
      case 'divort': return 'Art. 15 lit. a) OUG 80/2013';
      case 'divort_culpa': return 'Art. 15 lit. b) OUG 80/2013';
      case 'partaj': return 'Art. 5 alin. (1) OUG 80/2013';
      case 'exercitare_autoritate': return 'Art. 15 lit. e) OUG 80/2013';
      case 'pensie_intretinere': return 'Art. 29 alin. (1) lit. c) OUG 80/2013 (Scutit)';
      case 'curatela_tutela': return 'Art. 29 alin. (1) lit. e) OUG 80/2013 (Scutit)';
      case 'asociatii_fundatii': return 'Art. 12 OUG 80/2013 & OG 26/2000';
      case 'plangere_contraventionala': return 'Art. 19 OUG 80/2013 & OG 2/2001';
      case 'contencios_anulare': return 'Art. 16 alin. (1) lit. a) OUG 80/2013';
      case 'contencios_suspendare': return 'Art. 14 Legea 554/2004 & OUG 80/2013';
      case 'contencios_patrimonial': return 'Art. 16 alin. (1) lit. b) OUG 80/2013';
      case 'insolventa_deschidere': return 'Art. 14 alin. (1) OUG 80/2013 & Legea 85/2014';
      case 'insolventa_creanta': return 'Art. 14 alin. (2) OUG 80/2013';
      case 'anulare_aga': return 'Art. 18 OUG 80/2013 & Legea 31/1990';
      case 'registru_comert': return 'Art. 18 OUG 80/2013';
      case 'apel': return 'Art. 23 alin. (1) OUG 80/2013';
      case 'recurs': return 'Art. 24 alin. (1) OUG 80/2013';
      case 'contestatie_anulare': return 'Art. 25 alin. (1) OUG 80/2013';
      case 'revizuire': return 'Art. 25 alin. (1) OUG 80/2013';
      case 'scutit_munca': return 'Art. 29 alin. (1) lit. a) OUG 80/2013 (Scutit de drept)';
      case 'scutit_penal': return 'Art. 29 alin. (1) lit. i) OUG 80/2013 (Scutit de drept)';
      case 'scutit_protectie': return 'Legea 217/2003 & Art. 29 OUG 80/2013 (Scutit de drept)';
      case 'scutit_asigurari': return 'Art. 29 alin. (1) lit. a) OUG 80/2013 (Scutit de drept)';
      case 'scutit_consumator': return 'Art. 29 alin. (1) lit. f) OUG 80/2013 (Scutit de drept)';
      default: return 'OUG 80/2013';
    }
  }

  private calculateBaseEvaluableTax(value: number): number {
    if (value <= 500) return Math.max(20, value * 0.08);
    if (value <= 5000) return 40 + (value - 500) * 0.07;
    if (value <= 25000) return 355 + (value - 5000) * 0.05;
    if (value <= 50000) return 1355 + (value - 25000) * 0.03;
    if (value <= 250000) return 2105 + (value - 50000) * 0.02;
    return 6105 + (value - 250000) * 0.01;
  }

  timbreCategoryLabel(): string {
    const map: Record<string, string> = {
      'evaluable': 'Acțiune evaluabilă în bani / Pretenții',
      'revendicare': 'Revendicare imobiliară',
      'uzucapiune': 'Acțiune în uzucapiune',
      'anulare_contract': 'Anulare / Rezoluțiune contract',
      'granituire': 'Acțiune în grănițuire',
      'posesorie': 'Acțiune posesorie',
      'neevaluabil': 'Cerere neevaluabilă în bani',
      'ordonanta': 'Ordonanță de plată',
      'valoare_redusa': 'Cerere de valoare redusă',
      'ordonanta_presedintiala': 'Ordonanță președințială',
      'evacuare': 'Evacuare (procedură specială)',
      'sechestru_asigurator': 'Sechestru / Poprire asiguratorie',
      'sechestru_judiciar': 'Sechestru judiciar',
      'asigurare_dovezi': 'Asigurare de dovezi',
      'contestatie_executare': 'Contestație la executare (la valoare)',
      'contestatie_executare_act': 'Contestație act executare (fără valoare)',
      'executare': 'Încuviințare executare silită',
      'suspendare_executare': 'Suspendare executare silită',
      'validare_poprire': 'Validare de poprire',
      'plangere_cf': 'Plângere încheiere carte funciară',
      'investire_titlu': 'Învestire titlu executoriu',
      'divort': 'Divorț prin acord',
      'divort_culpa': 'Divorț din culpă / separare',
      'partaj': 'Partaj judiciar',
      'exercitare_autoritate': 'Autoritate părintească / Minori',
      'pensie_intretinere': 'Pensie de întreținere (Scutit)',
      'curatela_tutela': 'Măsuri ocrotire / Tutelă (Scutit)',
      'asociatii_fundatii': 'Înregistrare / Modificare Asociații',
      'plangere_contraventionala': 'Plângere contravențională (OG 2/2001)',
      'contencios_anulare': 'Anulare act administrativ',
      'contencios_suspendare': 'Suspendare act administrativ',
      'contencios_patrimonial': 'Contencios patrimonial (Despăgubiri)',
      'insolventa_deschidere': 'Deschidere insolvență (Legea 85/2014)',
      'insolventa_creanta': 'Declarație creanță / Tabel',
      'anulare_aga': 'Anulare hotărâre AGA',
      'registru_comert': 'Cerere Registrul Comerțului',
      'apel': 'Apel (50% din taxa inițială)',
      'recurs': 'Recurs (Art. 24 OUG 80/2013)',
      'contestatie_anulare': 'Contestație în anulare',
      'revizuire': 'Cerere de revizuire',
      'scutit_munca': 'Conflicte de muncă (Scutit)',
      'scutit_penal': 'Latură civilă din penal (Scutit)',
      'scutit_protectie': 'Ordin de protecție (Scutit)',
      'scutit_asigurari': 'Asigurări sociale / Pensii (Scutit)',
      'scutit_consumator': 'Protecția consumatorilor (Scutit)'
    };
    return map[this.timbreCategory] || 'Cerere introductivă';
  }

  // --- INTEREST LOGIC (OG 13/2011) ---
  getEffectiveInterestRate(): number {
    if (this.interestRelationType === 'custom') {
      return Number(this.interestCustomRate) || 0;
    }
    if (this.interestRelationType === 'b2b') {
      return Number(this.bnrReferenceRate) + 8;
    }
    if (this.interestRelationType === 'b2c_penal') {
      return Number(this.bnrReferenceRate) + 4;
    }
    return Number(this.bnrReferenceRate);
  }

  getDaysDiff(): number {
    if (!this.interestStartDate || !this.interestEndDate) return 0;
    const start = new Date(this.interestStartDate).getTime();
    const end = new Date(this.interestEndDate).getTime();
    return Math.max(0, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  }

  calculateInterestTotal(): number {
    const principal = Math.max(0, Number(this.interestPrincipal) || 0);
    const ratePercent = this.getEffectiveInterestRate();
    const days = this.getDaysDiff();

    const totalInterest = (principal * (ratePercent / 100) * days) / 365;
    return Math.round(totalInterest * 100) / 100;
  }

  calculateTotalClaimDue(): number {
    const principal = Math.max(0, Number(this.interestPrincipal) || 0);
    const totalInterest = this.calculateInterestTotal();
    return Math.round((principal + totalInterest) * 100) / 100;
  }

  interestRelationLabel(): string {
    if (this.interestRelationType === 'b2b') return 'Art. 3 alin. 2 ind. 1 (Profesioniști B2B: BNR + 8%)';
    if (this.interestRelationType === 'b2c_penal') return 'Art. 3 alin. 1 (Civil / Consumator: BNR + 4%)';
    if (this.interestRelationType === 'b2c_remun') return 'Art. 2 (Remuneratorie: Nivel BNR)';
    return 'Rată contractuală convenită';
  }

  // --- FEE LOGIC (Art. 453 CPC) ---
  getBaseFeeCalculated(): number {
    if (this.feeType === 'hourly') {
      return (Number(this.hourlyRate) || 0) * (Number(this.hoursSpent) || 0);
    }
    return Number(this.baseFee) || 0;
  }

  getSuccessFeeCalculated(): number {
    if (this.feeType === 'success') {
      return ((Number(this.successStakeValue) || 0) * (Number(this.successPercent) || 0)) / 100;
    }
    return 0;
  }

  calculateFeeTotal(): number {
    const base = this.getBaseFeeCalculated();
    const success = this.getSuccessFeeCalculated();
    const expenses = Number(this.otherExpenses) || 0;
    return Math.round((base + success + expenses) * 100) / 100;
  }

  // --- AI DEVIZ GENERATION ---
  async generateAiDeviz() {
    if (!this.aiActionType.trim()) {
      this.notificationService.error('Specificați tipul acțiunii.');
      return;
    }

    this.aiDevizResult.set('');
    try {
      const res = await this.juristService.calculateFees(
        this.aiActionType,
        this.aiFinancialDetails,
        this.aiExtraDetails,
        (chunk) => {
          this.aiDevizResult.set(chunk);
          this.cdr.detectChanges();
        }
      );
      this.aiDevizResult.set(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.notificationService.error(`Eroare la calcul AI: ${msg}`);
    }
  }

  formatCurrency(num: number): string {
    return (num || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  copyDocument() {
    if (!this.a4Document) return;
    const text = this.a4Document.nativeElement.innerText;
    navigator.clipboard.writeText(text).then(() => {
      this.notificationService.success('Nota de calcul a fost copiată în clipboard!');
    }).catch(() => {
      this.notificationService.error('Eroare la copiere.');
    });
  }

  exportWordDoc() {
    if (!this.a4Document) return;
    const rawText = this.a4Document.nativeElement.innerText;
    const title = 'Nota_de_Calcul_Judiciara';
    this.juristService.downloadDocx(rawText, title);
  }

  printOrPdf() {
    if (!this.a4Document) return;
    const content = this.a4Document.nativeElement.innerHTML;
    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (!printWindow) {
      this.notificationService.error('Permiteți pop-up-urile din browser pentru a printa documentul.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Notă de Calcul Judiciară - JuristPRO</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 portrait;
            margin: 2.2cm 2cm 2.2cm 2cm;
          }
          body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #111;
            background: #fff;
            margin: 0;
            padding: 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          th, td {
            border: 1pt solid #ccc;
            padding: 8px 10px;
            font-size: 10pt;
          }
          th {
            background-color: #f3f4f6;
            font-weight: bold;
          }
          .font-mono {
            font-family: 'JetBrains Mono', monospace;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div>${content}</div>
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
}
