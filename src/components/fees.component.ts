import { Component, inject, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
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
            [class]="'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ' + 
              (activeMode() === 'timbre' ? 'bg-jurist-orange text-black shadow-md' : 'text-gray-400 hover:text-white')"
          >
            <span>🏛️ Taxă Timbru OUG 80</span>
          </button>
          <button 
            (click)="setMode('interest')"
            [class]="'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ' + 
              (activeMode() === 'interest' ? 'bg-jurist-orange text-black shadow-md' : 'text-gray-400 hover:text-white')"
          >
            <span>📈 Dobândă Legală OG 13</span>
          </button>
          <button 
            (click)="setMode('fee')"
            [class]="'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ' + 
              (activeMode() === 'fee' ? 'bg-jurist-orange text-black shadow-md' : 'text-gray-400 hover:text-white')"
          >
            <span>💼 Decont Onorariu & Art. 453</span>
          </button>
          <button 
            (click)="setMode('ai_deviz')"
            [class]="'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ' + 
              (activeMode() === 'ai_deviz' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white')"
          >
            <span>✨ Deviz AI Avansat</span>
          </button>
        </div>
      </div>

      <!-- Main Workspace Grid -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <!-- LEFT PANEL: Controls (5 cols) -->
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
                  class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:border-jurist-orange font-medium"
                >
                  <option value="evaluable">Cerere evaluabilă în bani (Art. 3 alin. 1 - Regula Generală)</option>
                  <option value="partaj">Partaj judiciar (Art. 5 - 3% din masă / 50 lei)</option>
                  <option value="divort">Divorț prin acord (Art. 15 lit. a - 200 lei)</option>
                  <option value="divort_culpa">Divorț din culpă / separare (Art. 15 lit. b - 100 lei)</option>
                  <option value="ordonanta">Ordonanță de plată (Art. 6 alin. 2 - 200 lei)</option>
                  <option value="evacuare">Evacuare din imobil (Art. 6 alin. 3 - 100 lei)</option>
                  <option value="posesorie">Acțiune posesorie (Art. 4 alin. 1 - 100 lei)</option>
                  <option value="neevaluabil">Cerere neevaluabilă în bani (Art. 8 alin. 1 - 20 lei)</option>
                  <option value="apel">Apel / Cale de atac ordinară (50% din taxa inițială)</option>
                  <option value="recurs">Recurs (100 lei sau 50% conform art. 24)</option>
                  <option value="executare">Încuviințare executare silită (20 lei / titlu)</option>
                  <option value="contestatie_executare">Contestație la executare (Art. 10 - plafonat max 1.000 lei)</option>
                </select>
              </div>

              <!-- Valoare Obiect Litigiu -->
              @if (timbreCategory === 'evaluable' || timbreCategory === 'partaj' || timbreCategory === 'apel' || timbreCategory === 'contestatie_executare') {
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label for="timbreValueInput" class="text-xs font-semibold text-gray-300">Valoarea Obiectului Cererii (RON)</label>
                    <span class="text-[10px] text-amber-400 font-mono">{{ formatCurrency(timbreClaimValue) }} RON</span>
                  </div>
                  <div class="relative">
                    <input 
                      id="timbreValueInput"
                      type="number" 
                      [(ngModel)]="timbreClaimValue" 
                      placeholder="0"
                      min="0"
                      step="100"
                      class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-sm text-amber-300 font-bold focus:border-jurist-orange font-mono"
                    />
                    <span class="absolute right-3 top-2.5 text-xs text-gray-500 font-bold">RON</span>
                  </div>
                  <p class="text-[10px] text-gray-400 mt-1">Calcul automat pe tranșele prevăzute de art. 3 alin. (1) din OUG 80/2013.</p>
                </div>
              }

              <!-- Scutiri & Tranzactie -->
              <div class="bg-black/50 p-3 rounded-lg border border-gray-800 space-y-2">
                <span class="text-[11px] font-bold text-gray-300 uppercase tracking-wider block">Opțiuni & Scutiri</span>
                <label class="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="timbreAjutorPublic" class="rounded border-gray-700 text-amber-500 focus:ring-jurist-orange bg-gray-900" />
                  <span>Se solicită ajutor public judiciar (OUG 51/2008)</span>
                </label>
                <label class="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="timbreTranzactie" class="rounded border-gray-700 text-amber-500 focus:ring-jurist-orange bg-gray-900" />
                  <span>Stingere prin tranzacție (restituire 50% conform art. 45 OUG 80)</span>
                </label>
              </div>

              <!-- Detalii Dosar & Părți -->
              <div class="space-y-2 pt-2 border-t border-gray-800">
                <span class="text-[11px] font-bold text-gray-300 uppercase tracking-wider block">Date Dosar (Apar pe Nota A4)</span>
                <input 
                  type="text" 
                  [(ngModel)]="dossierNumber" 
                  placeholder="Nr. Dosar (Ex: 12345/299/2026)" 
                  class="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-jurist-orange font-mono"
                />
                <input 
                  type="text" 
                  [(ngModel)]="courtName" 
                  placeholder="Instanța (Ex: Tribunalul București - Secția a IV-a Civilă)" 
                  class="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-jurist-orange"
                />
                <input 
                  type="text" 
                  [(ngModel)]="partiesDesc" 
                  placeholder="Părți (Ex: Reclamant SC Alfa SRL vs. Pârât SC Beta SRL)" 
                  class="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-jurist-orange"
                />
              </div>

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
                    placeholder="0"
                    min="0"
                    class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-sm text-amber-300 font-bold focus:border-jurist-orange font-mono"
                  />
                  <span class="absolute right-3 top-2.5 text-xs text-gray-500 font-bold">RON</span>
                </div>
              </div>

              <!-- Tip Raport -->
              <div>
                <label for="interestRelationSelect" class="block text-xs font-semibold text-gray-300 mb-1">Tipul Raportului Juridic</label>
                <select 
                  id="interestRelationSelect"
                  [(ngModel)]="interestRelationType" 
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
                    <span class="text-emerald-400 font-bold font-mono">{{ computedInterestRate() }}% / an</span>
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
                    class="w-full bg-black border border-gray-700 rounded-lg p-2 text-xs text-white focus:border-jurist-orange font-mono"
                  />
                </div>
                <div>
                  <label for="interestEndInput" class="block text-xs font-semibold text-gray-300 mb-1">Data Calculului</label>
                  <input 
                    id="interestEndInput"
                    type="date" 
                    [(ngModel)]="interestEndDate" 
                    class="w-full bg-black border border-gray-700 rounded-lg p-2 text-xs text-white focus:border-jurist-orange font-mono"
                  />
                </div>
              </div>

              <div class="text-xs text-gray-400 flex justify-between px-1">
                <span>Număr zile întârziere:</span>
                <span class="text-white font-bold font-mono">{{ computedDaysDiff() }} zile</span>
              </div>

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
                    placeholder="3500"
                    class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-sm text-amber-300 font-bold font-mono focus:border-jurist-orange"
                  />
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
                  placeholder="0 (Ex: expertiză, deplasare, traduceri)" 
                  class="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-xs text-white font-mono focus:border-jurist-orange"
                />
              </div>

              <div class="space-y-2 pt-2 border-t border-gray-800">
                <input 
                  type="text" 
                  [(ngModel)]="contractNumber" 
                  placeholder="Nr. Contract Asistență Juridică (Ex: CAJ 89/2026)" 
                  class="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-jurist-orange font-mono"
                />
                <input 
                  type="text" 
                  [(ngModel)]="clientName" 
                  placeholder="Nume Client / Beneficiar" 
                  class="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-jurist-orange"
                />
              </div>

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
            <span class="text-[11px] font-bold text-gray-300 uppercase tracking-wider block">Antet Cabinet Avocat (Apare pe foaia A4)</span>
            <input 
              type="text" 
              [(ngModel)]="cabinetTitle" 
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
                <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                Document Oficial A4 • Format Instanță / Decont
              </span>
            </div>

            <!-- Actions: Copy, Print/PDF, Word -->
            <div class="flex items-center gap-2">
              <button 
                (click)="copyDocument()"
                class="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs rounded-lg border border-gray-700 flex items-center gap-1.5 transition-all shadow-sm active:scale-95 font-medium"
                title="Copiază conținutul în clipboard"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
                <span>Copiază</span>
              </button>

              <button 
                (click)="exportWordDoc()"
                class="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs rounded-lg border border-blue-500/30 flex items-center gap-1.5 transition-all active:scale-95 font-medium"
                title="Descarcă în format Word (.doc)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <span>Word (.doc)</span>
              </button>

              <button 
                (click)="printOrPdf()"
                class="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-md active:scale-95"
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
                <div class="border-b-2 border-gray-900 pb-4 mb-6 flex items-start justify-between gap-4">
                  <div>
                    <div class="text-[13px] font-bold tracking-widest text-black uppercase">
                      {{ cabinetTitle || 'CABINET DE AVOCAT / SOCIETATE CIVILĂ PROFESIONALĂ' }}
                    </div>
                    <div class="text-[11px] text-gray-600 tracking-wide mt-0.5">
                      Baroul București • Asistență & Reprezentare Juridică
                    </div>
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
                            <td class="p-2.5 text-gray-600">{{ timbreCalculation().legalBasis }}</td>
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
                            <td class="p-2.5 text-gray-600" colspan="2">{{ timbreCalculation().formula }}</td>
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
                              <td class="p-2.5 text-right font-mono font-bold">- {{ formatCurrency(timbreCalculation().totalTax / 2) }} RON</td>
                            </tr>
                          }
                        </tbody>
                        <tfoot>
                          <tr class="bg-gray-900 text-white font-bold text-sm">
                            <td class="p-3 uppercase" colspan="2">TOTAL TAXĂ JUDICIARĂ DE TIMBRU DATORATĂ:</td>
                            <td class="p-3 text-right font-mono text-amber-400 text-base">
                              {{ formatCurrency(timbreCalculation().totalTax) }} RON
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
                            <td class="p-2.5 text-right font-mono font-bold">{{ computedInterestRate() }}% / an</td>
                          </tr>
                          <tr>
                            <td class="p-2.5 font-medium">Interval întârziere</td>
                            <td class="p-2.5 text-gray-600">{{ interestStartDate }} — {{ interestEndDate }}</td>
                            <td class="p-2.5 text-right font-mono font-bold">{{ computedDaysDiff() }} zile</td>
                          </tr>
                          <tr>
                            <td class="p-2.5 font-medium">Formulă matematică aplicată</td>
                            <td class="p-2.5 text-gray-600" colspan="2">
                              Debit × (Rată % / 365) × Număr Zile = 
                              {{ formatCurrency(interestPrincipal) }} × ({{ computedInterestRate() }}% / 365) × {{ computedDaysDiff() }}
                            </td>
                          </tr>
                        </tbody>
                        <tfoot>
                          <tr class="bg-gray-100 font-bold border-t border-gray-300">
                            <td class="p-2.5 uppercase" colspan="2">Total Dobândă Penalizatoare Calculată:</td>
                            <td class="p-2.5 text-right font-mono text-amber-700 text-sm">
                              {{ formatCurrency(interestCalculation().totalInterest) }} RON
                            </td>
                          </tr>
                          <tr class="bg-gray-900 text-white font-bold text-sm">
                            <td class="p-3 uppercase" colspan="2">TOTAL CREANȚĂ DE RECUPERAT (DEBIT + DOBÂNDĂ):</td>
                            <td class="p-3 text-right font-mono text-amber-400 text-base">
                              {{ formatCurrency(interestCalculation().totalDue) }} RON
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
                            <td class="p-2.5 text-right font-mono font-bold">{{ formatCurrency(feeCalculation().baseFeeAmount) }} RON</td>
                          </tr>
                          @if (feeType === 'success' && feeCalculation().successAmount > 0) {
                            <tr>
                              <td class="p-2.5 font-medium">Onorariu de succes ({{ successPercent }}% din {{ formatCurrency(successStakeValue) }} RON)</td>
                              <td class="p-2.5 text-gray-600">Statutul profesiei de avocat</td>
                              <td class="p-2.5 text-right font-mono font-bold">{{ formatCurrency(feeCalculation().successAmount) }} RON</td>
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
                              {{ formatCurrency(feeCalculation().totalFee) }} RON
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
  timbreClaimValue = 100000;
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
    const user = this.authService.currentUser();
    if (user?.fullName) {
      this.cabinetTitle = `CABINET DE AVOCAT ${user.fullName.toUpperCase()}`;
    }
  }

  setMode(mode: 'timbre' | 'interest' | 'fee' | 'ai_deviz') {
    this.activeMode.set(mode);
  }

  // --- TIMBRE LOGIC (OUG 80/2013) ---
  timbreCalculation = computed(() => {
    const category = this.timbreCategory;
    const value = Math.max(0, this.timbreClaimValue || 0);

    let totalTax = 0;
    let formula = '';
    let legalBasis = 'OUG 80/2013';

    switch (category) {
      case 'evaluable':
        legalBasis = 'Art. 3 alin. (1) OUG 80/2013';
        if (value <= 500) {
          totalTax = Math.max(20, value * 0.08);
          formula = '8% din valoare, dar nu mai puțin de 20 lei';
        } else if (value <= 5000) {
          totalTax = 40 + (value - 500) * 0.07;
          formula = '40 lei + 7% pentru ce depășește 500 lei';
        } else if (value <= 25000) {
          totalTax = 355 + (value - 5000) * 0.05;
          formula = '355 lei + 5% pentru ce depășește 5.000 lei';
        } else if (value <= 50000) {
          totalTax = 1355 + (value - 25000) * 0.03;
          formula = '1.355 lei + 3% pentru ce depășește 25.000 lei';
        } else if (value <= 250000) {
          totalTax = 2105 + (value - 50000) * 0.02;
          formula = '2.105 lei + 2% pentru ce depășește 50.000 lei';
        } else {
          totalTax = 6105 + (value - 250000) * 0.01;
          formula = '6.105 lei + 1% pentru ce depășește 250.000 lei';
        }
        break;

      case 'partaj':
        legalBasis = 'Art. 5 alin. (1) OUG 80/2013';
        totalTax = value > 0 ? value * 0.03 : 50;
        formula = '3% din valoarea masei partajabile (sau 50 lei dacă nu se contestă masa/creanțele)';
        break;

      case 'divort':
        legalBasis = 'Art. 15 lit. a) OUG 80/2013';
        totalTax = 200;
        formula = 'Taxă fixă 200 lei pentru divorț prin acordul soților';
        break;

      case 'divort_culpa':
        legalBasis = 'Art. 15 lit. b) OUG 80/2013';
        totalTax = 100;
        formula = 'Taxă fixă 100 lei pentru divorț din culpă / separare';
        break;

      case 'ordonanta':
        legalBasis = 'Art. 6 alin. (2) OUG 80/2013';
        totalTax = 200;
        formula = 'Taxă fixă 200 lei pentru procedura ordonanței de plată';
        break;

      case 'evacuare':
        legalBasis = 'Art. 6 alin. (3) OUG 80/2013';
        totalTax = 100;
        formula = 'Taxă fixă 100 lei pentru cererile de evacuare procedură specială';
        break;

      case 'posesorie':
        legalBasis = 'Art. 4 alin. (1) OUG 80/2013';
        totalTax = 100;
        formula = 'Taxă fixă 100 lei pentru acțiuni posesorii';
        break;

      case 'neevaluabil':
        legalBasis = 'Art. 8 alin. (1) OUG 80/2013';
        totalTax = 20;
        formula = 'Taxă fixă 20 lei (cerere neevaluabilă în bani)';
        break;

      case 'apel': {
        legalBasis = 'Art. 23 alin. (1) OUG 80/2013';
        const baseApel = this.calculateBaseEvaluableTax(value);
        totalTax = baseApel * 0.5;
        formula = '50% din taxa datorată pentru fond';
        break;
      }

      case 'recurs':
        legalBasis = 'Art. 24 alin. (1) OUG 80/2013';
        totalTax = 100;
        formula = '100 lei (sau 50% din taxa inițială)';
        break;

      case 'executare':
        legalBasis = 'Art. 10 alin. (1) OUG 80/2013';
        totalTax = 20;
        formula = '20 lei pentru fiecare cerere de încuviințare a executării silite';
        break;

      case 'contestatie_executare': {
        legalBasis = 'Art. 10 alin. (2) OUG 80/2013';
        const baseContestatie = this.calculateBaseEvaluableTax(value);
        totalTax = Math.min(1000, baseContestatie);
        formula = 'Calculată la valoarea bunurilor/creanței urmărite, plafonată la maxim 1.000 lei';
        break;
      }
    }

    if (this.timbreTranzactie) {
      totalTax = totalTax / 2;
    }

    return {
      totalTax: Math.round(totalTax * 100) / 100,
      formula,
      legalBasis
    };
  });

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
      'evaluable': 'Acțiune evaluabilă în bani',
      'partaj': 'Partaj judiciar',
      'divort': 'Divorț prin acord',
      'divort_culpa': 'Divorț din culpă',
      'ordonanta': 'Ordonanță de plată',
      'evacuare': 'Evacuare imobil',
      'posesorie': 'Acțiune posesorie',
      'neevaluabil': 'Cerere neevaluabilă',
      'apel': 'Apel',
      'recurs': 'Recurs',
      'executare': 'Încuviințare executare',
      'contestatie_executare': 'Contestație la executare'
    };
    return map[this.timbreCategory] || 'Cerere introductivă';
  }

  // --- INTEREST LOGIC (OG 13/2011) ---
  computedInterestRate = computed(() => {
    if (this.interestRelationType === 'custom') {
      return this.interestCustomRate || 0;
    }
    if (this.interestRelationType === 'b2b') {
      return this.bnrReferenceRate + 8;
    }
    if (this.interestRelationType === 'b2c_penal') {
      return this.bnrReferenceRate + 4;
    }
    return this.bnrReferenceRate;
  });

  computedDaysDiff = computed(() => {
    if (!this.interestStartDate || !this.interestEndDate) return 0;
    const start = new Date(this.interestStartDate).getTime();
    const end = new Date(this.interestEndDate).getTime();
    return Math.max(0, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  });

  interestCalculation = computed(() => {
    const principal = Math.max(0, this.interestPrincipal || 0);
    const ratePercent = this.computedInterestRate();
    const days = this.computedDaysDiff();

    const totalInterest = (principal * (ratePercent / 100) * days) / 365;
    const totalDue = principal + totalInterest;

    return {
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalDue: Math.round(totalDue * 100) / 100
    };
  });

  interestRelationLabel(): string {
    if (this.interestRelationType === 'b2b') return 'Art. 3 alin. 2 ind. 1 (Profesioniști B2B: BNR + 8%)';
    if (this.interestRelationType === 'b2c_penal') return 'Art. 3 alin. 1 (Civil / Consumator: BNR + 4%)';
    if (this.interestRelationType === 'b2c_remun') return 'Art. 2 (Remuneratorie: Nivel BNR)';
    return 'Rată contractuală convenită';
  }

  // --- FEE LOGIC (Art. 453 CPC) ---
  feeCalculation = computed(() => {
    const baseFeeAmount = this.feeType === 'hourly'
      ? (this.hourlyRate || 0) * (this.hoursSpent || 0)
      : (this.baseFee || 0);

    let successAmount = 0;
    if (this.feeType === 'success') {
      successAmount = ((this.successStakeValue || 0) * (this.successPercent || 0)) / 100;
    }

    const expenses = this.otherExpenses || 0;
    const totalFee = baseFeeAmount + successAmount + expenses;

    return {
      baseFeeAmount,
      successAmount,
      totalFee: Math.round(totalFee * 100) / 100
    };
  });

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
    const cabinet = this.cabinetTitle || 'CABINET DE AVOCAT';
    const title = 'Nota_de_Calcul_Judiciara';

    const wordHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${title}</title>
        <style>
          @page {
            size: 21cm 29.7cm;
            margin: 2.5cm 2.2cm 2.5cm 2.2cm;
            mso-page-orientation: portrait;
          }
          body {
            font-family: 'Times New Roman', 'Arial', serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #000000;
          }
          .header-table {
            width: 100%;
            border-bottom: 1.5pt solid #000;
            margin-bottom: 20pt;
            padding-bottom: 6pt;
          }
          .cabinet-name {
            font-size: 12pt;
            font-weight: bold;
            text-transform: uppercase;
          }
          .doc-body {
            text-align: justify;
            white-space: pre-wrap;
          }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td align="left">
              <div class="cabinet-name">${cabinet}</div>
              <div style="font-size: 9pt; color: #444;">Baroul București • Asistență & Reprezentare Juridică</div>
            </td>
            <td align="right" style="font-size: 9pt;">
              Data: ${this.currentDate}<br/>
              <b>EXEMPLAR OFICIAL</b>
            </td>
          </tr>
        </table>

        <div class="doc-body">${rawText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', wordHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nota_calcul_${new Date().toISOString().slice(0,10)}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.notificationService.success('Documentul Word a fost descărcat!');
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
