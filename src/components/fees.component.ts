import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JuristService } from '../services/jurist.service';
import { AuthService } from '../services/auth.service';
import { MarkdownPipe } from '../pipes/markdown.pipe';

@Component({
  selector: 'app-fees',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full flex flex-col bg-jurist-card rounded-xl border border-gray-800 shadow-neon overflow-hidden animate-fadeIn">
      <!-- Header -->
      <div class="p-6 border-b border-gray-800 bg-jurist-dark flex justify-between items-center">
        <div>
          <h2 class="text-2xl font-bold text-jurist-orange mb-1">Taxe Judiciare & Onorarii</h2>
          <p class="text-sm text-gray-400">Calculator OUG 80/2013 • Onorarii UNBR • Cheltuieli</p>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slideUp">
        
        <!-- Controls -->
        <div class="space-y-6">
          <div class="bg-gray-900/50 p-6 rounded-xl border border-gray-700">
            <h3 class="text-white font-bold mb-4 flex items-center gap-2">
              <span class="w-2 h-6 bg-jurist-orange rounded-sm"></span>
              Configurează Calculul
            </h3>

            <div class="space-y-4">
              <div>
                <label for="actionType" class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tip Acțiune / Articol</label>
                <select id="actionType" [(ngModel)]="selectedType" class="w-full bg-black border border-gray-600 rounded-lg p-3 text-white focus:border-jurist-orange transition-all">
                  @for (type of actionTypes; track type) {
                    <option [value]="type">{{ type }}</option>
                  }
                </select>
              </div>

              <div>
                <label for="financialDetails" class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Detalii Financiare / Valoare Pretenții</label>
                <input 
                  id="financialDetails"
                  type="text" 
                  [(ngModel)]="financialDetails" 
                  placeholder="Ex: Partaj bunuri 100.000 EUR, sau 'Cerere divorț fără minori'"
                  class="w-full bg-black border border-gray-600 rounded-lg p-3 text-white focus:border-jurist-orange transition-all" 
                />
              </div>

              <div>
                <label for="lawyerNotes" class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Cerere Specială Avocat (Extra)</label>
                <textarea 
                  id="lawyerNotes"
                  [(ngModel)]="lawyerNotes"
                  rows="3"
                  placeholder="Alte costuri: deplasare, cazare, expertiză tehnică..."
                  class="w-full bg-black border border-gray-600 rounded-lg p-3 text-white focus:border-jurist-orange transition-all resize-none"
                ></textarea>
              </div>

              <button 
                (click)="calculate()" 
                [disabled]="juristService.isLoading() || !financialDetails"
                class="w-full bg-jurist-orange hover:bg-jurist-orangeHover text-white py-3 rounded-lg font-bold shadow-neon transition-all disabled:opacity-50"
              >
                {{ juristService.isLoading() ? 'Calculăm...' : 'Generează Deviz Estimativ' }}
              </button>

              <!-- Security Info -->
              <div class="bg-green-900/10 border border-green-900/30 rounded-xl p-4 flex items-start gap-3 mt-4">
                <div class="bg-green-900/30 p-1.5 rounded-lg shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 text-green-500">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <div>
                  <h4 class="text-green-500 font-bold text-xs mb-1">Date Financiare Securizate</h4>
                  <p class="text-[10px] text-gray-400 leading-relaxed">
                    Sumele și detaliile introduse sunt prelucrate temporar în memorie (RAM) și <strong>șterse definitiv</strong> după calcul. Nu stocăm date și nu antrenăm modele AI.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Results -->
        <div class="bg-white text-black p-6 rounded-sm shadow-2xl overflow-y-auto font-mono text-sm relative min-h-[400px]">
          <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-jurist-orange to-red-500"></div>
          
          @if (resultText()) {
            @if (authService.currentUser()?.plan !== 'trial') {
              <div class="absolute top-4 right-4 print:hidden">
                <button (click)="exportDoc()" class="bg-jurist-orange hover:bg-jurist-orangeHover text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1 font-sans">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3 h-3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Export DOCX
                </button>
              </div>
            }

            <h3 class="text-xl font-bold mb-4 uppercase text-center border-b-2 border-black pb-2 pt-2">Deviz Estimativ Costuri</h3>
            <div class="whitespace-normal leading-relaxed prose prose-sm max-w-none text-black markdown-body-light" [innerHTML]="resultText() | markdown:'light'"></div>
            
            <div class="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
              Generat de JuristPRO AI. Valorile sunt estimative conform legislației la zi.
            </div>
          } @else {
            <div class="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
              <span class="text-5xl mb-4">🧮</span>
              <p class="text-center max-w-xs">Selectează tipul acțiunii și introdu valoarea pentru a calcula taxele de timbru și onorariile.</p>
            </div>
          }
        </div>

      </div>
    </div>
  `
})
export class FeesComponent {
  juristService = inject(JuristService);
  authService = inject(AuthService);
  
  actionTypes = [
    'Acțiune în Pretenții (Bănești)',
    'Divorț cu/fără minori',
    'Partaj Judiciar',
    'Acțiune în Constatare',
    'Evacuare',
    'Ordonanță Președințială',
    'Plângere Contravențională',
    'Contestație la Executare',
    'Înființare Poprire',
    'Cerere de Valoare Redusă',
    'Altele (Personalizat)'
  ];

  selectedType = this.actionTypes[0];
  financialDetails = '';
  lawyerNotes = '';
  resultText = signal<string>('');

  async calculate() {
    const prompt = `Tip Acțiune: ${this.selectedType}. Valoare/Detalii: ${this.financialDetails}. Note Extra: ${this.lawyerNotes}`;
    this.resultText.set(""); // Clear previous result
    const res = await this.juristService.calculateFees(prompt, (text) => {
      this.resultText.set(text);
    });
    this.resultText.set(res);
  }

  exportDoc() {
    const filename = `Calcul_Taxe_${this.selectedType}`;
    this.juristService.downloadDocx(this.resultText(), filename);
  }
}
