import { Component, inject, signal, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JuristService } from '../services/jurist.service';
import { AuthService } from '../services/auth.service';
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
      <div class="p-6 border-b border-gray-800 bg-jurist-dark flex justify-between items-center">
        <div>
           <h2 class="text-2xl font-bold text-jurist-orange mb-1">Redactare Documente</h2>
           <p class="text-sm text-gray-400">Automatizare Acte Procedurale & Cereri Diverse</p>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 animate-slideUp">
        <!-- Configuration Panel -->
        <div class="lg:col-span-4 space-y-6">
          
          <!-- Category Selector -->
          <div class="space-y-2">
            <h3 class="block text-xs font-bold text-gray-400 uppercase tracking-wider">1. Alege Materia</h3>
            <div class="grid grid-cols-2 gap-2">
              @for (cat of categories; track cat.id) {
                <button 
                  (click)="selectCategory(cat)"
                  [class]="'p-3 rounded-lg text-sm font-medium border transition-all text-left flex items-center gap-2 ' + 
                    (selectedCategory().id === cat.id 
                      ? 'bg-jurist-orange text-white border-jurist-orange shadow-lg' 
                      : 'bg-gray-900 text-gray-400 border-gray-700 hover:border-gray-500 hover:text-white')"
                >
                  <span>{{ cat.icon }}</span>
                  {{ cat.label }}
                </button>
              }
            </div>
          </div>

          <!-- Document Selector -->
          <div class="bg-gray-900 p-5 rounded-xl border border-gray-700 space-y-4">
            <div>
              <label for="docType" class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">2. Ce document doriți să redactați?</label>
              
              <div class="space-y-3">
                <input 
                  id="docType"
                  type="text" 
                  [(ngModel)]="customDocType" 
                  placeholder="Ex: Cerere de chemare în judecată pentru pretenții..."
                  class="w-full bg-black border border-gray-600 rounded-lg p-3 text-white text-sm focus:border-jurist-orange focus:ring-1 focus:ring-jurist-orange transition-all"
                />

                <!-- Quick Suggestions -->
                <div class="flex flex-wrap gap-2 mt-2">
                  @for (sug of selectedCategory().suggestions; track sug) {
                    <button 
                      (click)="customDocType = sug"
                      class="px-3 py-1.5 bg-gray-800 hover:bg-jurist-orange/20 hover:text-jurist-orange hover:border-jurist-orange border border-gray-700 rounded-full text-xs text-gray-400 transition-colors"
                    >
                      {{ sug }}
                    </button>
                  }
                </div>
              </div>
            </div>

            <div>
              <label for="docDetails" class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">3. Detalii Părți & Situație</label>
              <textarea 
                id="docDetails"
                [(ngModel)]="docDetails" 
                rows="10"
                class="w-full bg-black border border-gray-600 rounded-lg p-3 text-sm text-white focus:border-jurist-orange resize-none placeholder-gray-600"
                placeholder="Ex: Reclamant: Popescu Ion (domiciliu, CNP). Pârât: SC X SRL. Motivare: Solicit rezoluțiunea contractului nr. 10/2023 pentru neexecutare. Factura neachitată este..."
              ></textarea>
              <p class="text-[10px] text-gray-500 mt-2 text-right">Includeți datele de identificare și motivele de fapt.</p>
            </div>

            <!-- Security Info -->
            <div class="bg-green-900/10 border border-green-900/30 rounded-xl p-4 flex items-start gap-3 mt-2">
              <div class="bg-green-900/30 p-1.5 rounded-lg shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 text-green-500">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <div>
                <h4 class="text-green-500 font-bold text-xs mb-1">Date Securizate (AES-256)</h4>
                <p class="text-[10px] text-gray-400 leading-relaxed">
                  Informațiile introduse sunt procesate temporar în memorie (RAM) și <strong>șterse definitiv</strong> după generare. Nu stocăm datele clienților și nu antrenăm modele AI cu ele.
                </p>
              </div>
            </div>

            <button 
              (click)="generate()" 
              [disabled]="juristService.isLoading()" 
              class="w-full bg-jurist-orange hover:bg-jurist-orangeHover text-white py-3 rounded-lg font-bold transition-all shadow-[0_0_15px_rgba(255,140,0,0.4)] disabled:opacity-50 flex justify-center items-center gap-2"
            >
              @if (juristService.isLoading()) {
                <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              }
              {{ juristService.isLoading() ? 'Generare în curs...' : 'Redactează Documentul' }}
            </button>
          </div>
        </div>

        <!-- Preview Panel (Updated to Dark Mode) -->
        <div class="lg:col-span-8 bg-[#0a0a0a] border border-gray-800 p-8 rounded-xl shadow-inner min-h-[700px] overflow-y-auto font-sans relative">
          @if (generatedDoc()) {
            @if (authService.currentUser()?.plan !== 'trial') {
              <div class="absolute top-4 right-4 print:hidden z-10">
                <button (click)="exportDoc()" class="bg-jurist-orange hover:bg-jurist-orangeHover text-white px-4 py-2 rounded-lg text-sm shadow-neon flex items-center gap-2 transition-all font-bold">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Export DOCX
                </button>
              </div>
            }
            
            <!-- Dark Paper Effect Container -->
            <div class="max-w-[210mm] mx-auto bg-[#18181b] border border-gray-700 p-12 rounded-lg shadow-2xl relative">
              <!-- Decorative Header Line -->
              <div class="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-jurist-orange via-red-500 to-purple-600 rounded-t-lg"></div>
              
              <!-- Content -->
              <div class="whitespace-normal leading-relaxed text-[11pt] text-justify font-serif text-gray-200 markdown-body" [innerHTML]="generatedDoc() | markdown"></div>
            </div>
          } @else {
            <div class="h-full flex flex-col items-center justify-center text-gray-500 opacity-60 select-none border-2 border-dashed border-gray-800 rounded-xl m-4 bg-gray-900/20">
              <span class="text-6xl mb-4 grayscale">⚖️</span>
              <p class="text-xl font-bold text-gray-400">Zona de Previzualizare</p>
              <p class="text-sm font-sans max-w-md text-center mt-2 text-gray-500">Documentul generat va apărea aici în modul Dark Mode, optimizat pentru confortul vizual.</p>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class DraftingComponent {
  juristService = inject(JuristService);
  authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  
  // Categories covering "Ghidul Justitiabilului"
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
      label: 'Admin/Munca',
      icon: '💼',
      suggestions: [
        'Plângere contravențională',
        'Contestație decizie concediere',
        'Acțiune în contencios administrativ'
      ]
    }
  ];

  selectedCategory = signal<DocCategory>(this.categories[0]);
  customDocType = '';
  
  docDetails = '';
  generatedDoc = signal<string>('');

  selectCategory(cat: DocCategory) {
    this.selectedCategory.set(cat);
    this.customDocType = '';
  }

  async generate() {
    const finalType = this.customDocType.trim();
    
    if (!finalType) {
      console.warn("Vă rugăm să specificați tipul documentului pe care doriți să îl redactați.");
      this.generatedDoc.set("Eroare: Vă rugăm să specificați tipul documentului.");
      return;
    }

    const detailsToPass = this.docDetails.trim() !== '' 
      ? this.docDetails 
      : "Nu au fost furnizate detalii specifice. Te rog să generezi un model standard (șablon) cu spații libere [...] pentru completare ulterioară.";

    this.generatedDoc.set(""); // Clear previous doc
    const result = await this.juristService.draftDocument(finalType, detailsToPass, (text) => {
      this.generatedDoc.set(text);
      this.cdr.detectChanges();
    });
    this.generatedDoc.set(result);
  }

  exportDoc() {
    const finalType = this.customDocType.trim() || 'Document_Juridic';
    this.juristService.downloadDocx(this.generatedDoc(), finalType);
  }
}
