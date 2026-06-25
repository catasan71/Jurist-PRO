import { Component, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JuristService } from '../services/jurist.service';
import { AuthService } from '../services/auth.service';
import { MarkdownPipe } from '../pipes/markdown.pipe';

interface UploadedFile {
  name: string;
  type: string;
  base64: string;
  previewUrl?: string;
}

interface PdfJsPage {
  getTextContent: () => Promise<{ items: ({ str: string } | unknown)[] }>;
}
interface PdfJsDocument {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfJsPage>;
}
interface PdfJsLib {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (config: { data: ArrayBuffer }) => { promise: Promise<PdfJsDocument> };
}

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownPipe],
  template: `
    <div class="h-full flex flex-col bg-jurist-card rounded-xl border border-gray-800 shadow-neon overflow-hidden">
      <!-- Tabs -->
      <div class="flex border-b border-gray-800 bg-jurist-dark">
        <button 
          (click)="mode.set('analyze')"
          [class]="'flex-1 py-4 text-sm font-medium transition-colors ' + (mode() === 'analyze' ? 'text-jurist-orange border-b-2 border-jurist-orange bg-gray-900/50' : 'text-gray-400 hover:text-white hover:bg-gray-800')"
        >
          Analiză & Audit (OCR)
        </button>
        <button 
          (click)="mode.set('evidence')"
          [class]="'flex-1 py-4 text-sm font-medium transition-colors ' + (mode() === 'evidence' ? 'text-jurist-orange border-b-2 border-jurist-orange bg-gray-900/50' : 'text-gray-400 hover:text-white hover:bg-gray-800')"
        >
          Prelucrare Probe (Foto/Video)
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-6">
        @if (mode() === 'analyze') {
          <div class="max-w-6xl mx-auto space-y-8 animate-slideUp">
            
            <!-- Upload Area -->
            <div class="bg-gray-900/30 border border-gray-700 rounded-xl p-10 text-center border-dashed hover:border-jurist-orange hover:bg-gray-900/50 transition-all cursor-pointer relative group">
              <input type="file" (change)="handleFileUpload($event)" accept=".pdf,.txt,.jpeg,.jpg,.png" class="absolute inset-0 opacity-0 cursor-pointer z-10" />
              <div class="space-y-4 flex flex-col items-center">
                <!-- Orange Paperclip Icon -->
                <div class="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center shadow-neon group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-10 h-10 text-jurist-orange">
                    <path fill-rule="evenodd" d="M18.97 3.659a2.25 2.25 0 00-3.182 0l-10.94 10.94a3.75 3.75 0 105.304 5.303l7.693-7.693a.75.75 0 011.06 1.06l-7.693 7.693a5.25 5.25 0 11-7.424-7.424l10.939-10.94a3.75 3.75 0 115.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 015.91 15.66l7.81-7.81a.75.75 0 011.061 1.06l-7.81 7.81a.75.75 0 001.054 1.068L18.97 6.84a2.25 2.25 0 000-3.182z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 class="text-xl font-medium text-white">Încarcă Documentul pentru Audit</h3>
                  <p class="text-sm text-gray-500 mt-1 uppercase tracking-widest font-bold">PDF • TXT • JPG • PNG</p>
                  <p class="text-xs text-red-400 mt-2">* Pentru documente Word (.docx), vă rugăm să le salvați ca PDF înainte de încărcare.</p>
                </div>
              </div>
            </div>

            <!-- Disclaimer Calitate Documente -->
            <div class="bg-yellow-900/15 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-4">
              <div class="bg-yellow-500/10 p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 text-yellow-500">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div class="flex-1">
                <h4 class="text-yellow-500 font-bold text-sm mb-1">ATENȚIE: Calitatea Scanării influențează direct Raportul!</h4>
                <p class="text-xs text-gray-400 leading-relaxed">
                  Asigurați-vă că fișierul încărcat are o rezoluție optimă și text clar. Dacă documentul este o scanare degradată, mișcată, extrem de întunecată sau ilizibilă, calitatea auditului va fi redusă substanțial sau raportul nu va putea fi generat corespunzător. <span class="text-yellow-500 font-semibold">Evitați irosirea inutilă a creditelor</span> prin trimiterea doar de documente lizibile (PDF digital sau scanări clare).
                </p>
              </div>
            </div>

            <!-- Security Info -->
            <div class="bg-green-900/10 border border-green-900/30 rounded-xl p-4 flex items-start gap-4">
              <div class="bg-green-900/30 p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 text-green-500">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <div>
                <h4 class="text-green-500 font-bold text-sm mb-1">Securitate și Confidențialitate Garantată</h4>
                <p class="text-xs text-gray-400 leading-relaxed">
                  Toate documentele încărcate sunt procesate folosind criptare <strong>AES-256</strong> (standard militar). 
                  Fișierele sunt analizate temporar în memorie (RAM) și <strong>sunt șterse definitiv și ireversibil</strong> imediat după generarea răspunsului. 
                  Nu stocăm documentele pe serverele noastre și nu le folosim pentru antrenarea modelelor AI. 
                  Conformitate 100% cu normele GDPR și secretul profesional al avocatului.
                </p>
              </div>
            </div>

            <!-- Preview & Controls -->
            @if (uploadedFile()) {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                <!-- File Preview -->
                <div class="relative group rounded-lg overflow-hidden border border-gray-700 bg-gray-900 flex items-center justify-center min-h-[250px]">
                  @if (uploadedFile()!.previewUrl) {
                    <img [src]="uploadedFile()!.previewUrl" class="w-full h-full object-contain max-h-[300px]" alt="File Preview" />
                  } @else {
                    <div class="text-center p-6">
                      <div class="text-6xl mb-3">
                        @if (uploadedFile()!.type.includes('pdf')) { 📕 }
                        @else if (uploadedFile()!.type.includes('word') || uploadedFile()!.name.endsWith('.docx')) { 📘 }
                        @else if (uploadedFile()!.type.includes('text') || uploadedFile()!.name.endsWith('.txt')) { 📄 }
                        @else { 📁 }
                      </div>
                      <p class="text-white font-bold text-lg break-all px-4">{{ uploadedFile()!.name }}</p>
                      <p class="text-xs text-gray-500 uppercase mt-1">{{ uploadedFile()!.type || 'Document' }}</p>
                    </div>
                  }
                  <div class="absolute bottom-0 left-0 right-0 bg-black/80 p-2 text-xs text-center text-gray-300">
                    Fișier pregătit pentru expertiză
                  </div>
                </div>
                
                <!-- Prompt Area -->
                <div class="flex flex-col gap-4">
                  <div class="flex justify-between items-center">
                    <label for="auditPrompt" class="text-sm font-bold text-gray-400">Context Speță (Opțional)</label>
                    <span class="text-xs text-orange-400 font-bold bg-orange-900/10 px-2 py-1 rounded border border-orange-500/30">5 Credite - Analiză Deep Dive</span>
                  </div>
                  <textarea 
                    id="auditPrompt"
                    [(ngModel)]="auditPrompt" 
                    class="w-full flex-1 bg-black border border-gray-700 rounded-lg p-4 text-sm focus:border-jurist-orange focus:ring-1 focus:ring-jurist-orange resize-none"
                    placeholder="Ex: 'Acesta este un contract de credit din 2008. Verifică clauzele abuzive privind dobânda variabilă și riscul valutar conform deciziilor CJUE.'"
                  ></textarea>
                  <button 
                    (click)="analyze()" 
                    [disabled]="juristService.isLoading()"
                    class="bg-jurist-orange hover:bg-jurist-orangeHover text-white py-4 rounded-xl font-bold shadow-neon transition-all flex items-center justify-center gap-2"
                  >
                    @if (juristService.isLoading()) {
                      <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Se Redactează Raportul...
                    } @else {
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                         <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      Generează Audit Complet
                    }
                  </button>
                </div>
              </div>
            }

            @if (auditResult()) {
              <div class="animate-fadeIn mt-8 w-full flex justify-center">
                <!-- Dark Mode Report Container -->
                <div class="bg-[#18181b] border border-gray-700 text-gray-300 p-12 md:p-16 rounded-xl shadow-2xl relative font-sans w-full mx-auto max-w-[210mm]">
                   
                   <!-- Decorative Top Line -->
                   <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-jurist-orange to-red-600"></div>

                   <!-- Stamp/Header Effect -->
                   <div class="absolute top-8 right-8 border border-red-500/50 text-red-500 font-bold px-4 py-1 text-sm transform opacity-80 uppercase tracking-widest hidden md:block rounded">
                     Audit Juridic
                   </div>
                   
                   <div class="mb-8 border-b border-gray-700 pb-4">
                     <h2 class="text-3xl font-bold text-center uppercase tracking-tight text-white">Raport de Analiză Juridică</h2>
                     <p class="text-center text-sm text-gray-500 mt-2">Generat de JuristPRO AI • Expertiză Documentară</p>
                   </div>

                   <!-- Report Content with fixed formatting -->
                   <div class="text-sm text-justify leading-relaxed markdown-body" [innerHTML]="auditResult() | markdown"></div>
                   
                   <div class="mt-12 pt-6 border-t border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
                     <p class="text-xs text-gray-600 italic">Prezentul raport reprezintă o opinie juridică bazată pe documentele furnizate și legislația în vigoare.</p>
                     @if (authService.currentUser()?.plan !== 'trial') {
                       <button (click)="exportDoc()" class="bg-jurist-orange hover:bg-jurist-orangeHover text-white px-6 py-2 rounded-lg text-sm font-sans font-bold transition-colors flex items-center gap-2 shadow-lg">
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                           <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                         </svg>
                         Salvează DOCX
                       </button>
                     }
                   </div>
                </div>
              </div>
            }
          </div>
        } @else {
          <!-- EVIDENCE LAB (Same as before) -->
          <div class="max-w-4xl mx-auto space-y-6 animate-slideUp">
            <div class="bg-gray-800/50 p-8 rounded-xl border border-gray-700 text-center relative overflow-hidden">
              <div class="absolute -top-10 -right-10 w-40 h-40 bg-jurist-orange/10 rounded-full blur-2xl"></div>
              
              <h3 class="text-2xl font-bold text-white mb-2">Laborator Reconstituire Probe</h3>
              <p class="text-sm text-gray-400 mb-8 max-w-lg mx-auto">Generează scenarii vizuale sau îmbunătățește claritatea probelor folosind Gemini Vision & Imagen 3.</p>
              
              <div class="flex flex-col md:flex-row gap-4">
                <input 
                  type="text" 
                  [(ngModel)]="evidencePrompt"
                  (keyup.enter)="generateEvidence()"
                  placeholder="Descrie scena sau modificarea dorită..."
                  class="flex-1 bg-black border border-gray-700 rounded-xl px-6 py-4 text-sm focus:border-jurist-orange focus:ring-1 focus:ring-jurist-orange transition-all placeholder-gray-600"
                />
                <button 
                  (click)="generateEvidence()"
                  [disabled]="!evidencePrompt || juristService.isLoading()"
                  class="bg-jurist-orange hover:bg-jurist-orangeHover text-white px-8 py-3 rounded-xl font-bold whitespace-nowrap shadow-lg transition-all"
                >
                  Generează
                </button>
              </div>
            </div>

            @if (juristService.isLoading() && mode() === 'evidence') {
              <div class="flex flex-col items-center justify-center p-12 gap-4">
                 <div class="w-12 h-12 border-4 border-jurist-orange border-t-transparent rounded-full animate-spin"></div>
                 <p class="text-gray-500 text-sm animate-pulse">Generăm proba vizuală...</p>
              </div>
            }

            @if (evidenceImage()) {
              <div class="bg-black p-6 rounded-xl border border-gray-800 flex flex-col items-center">
                <img [src]="evidenceImage()" class="max-w-full rounded-lg shadow-2xl mb-6 max-h-[600px]" alt="Evidence Generated" />
                <a [href]="evidenceImage()" download="proba_generata.jpg" class="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Salvează Imaginea
                </a>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class AuditComponent {
  juristService = inject(JuristService);
  authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  mode = signal<'analyze' | 'evidence'>('analyze');
  
  // Analyze State
  uploadedFile = signal<UploadedFile | null>(null);
  auditPrompt = '';
  auditResult = signal<string>('');
  
  // Evidence State
  evidencePrompt = '';
  evidenceImage = signal<string>('');

  private loadPdfJs(): Promise<PdfJsLib> {
    const win = window as unknown as { pdfjsLib?: PdfJsLib };
    if (win.pdfjsLib) {
      return Promise.resolve(win.pdfjsLib);
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.crossOrigin = 'anonymous';
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        const pdfjsLib = win.pdfjsLib;
        if (pdfjsLib) {
          // Setting the workerSrc directly. If web workers are blocked in the iframe sandbox,
          // PDFJS gracefully falls back to the main thread for parsing.
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          resolve(pdfjsLib);
        } else {
          reject(new Error('Biblioteca PDF.js nu a putut fi instanțiată.'));
        }
      };
      script.onerror = (err) => reject(err);
      document.head.appendChild(script);
    });
  }

  async extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
    try {
      const pdfjsLib = await this.loadPdfJs();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      let fullText = '';
      
      const maxPages = Math.min(pdf.numPages, 100); // safety cap to prevent CPU lock on extreme documents
      for (let i = 1; i <= maxPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item) => (item as { str?: string })?.str || '')
            .join(' ');
          fullText += `--- Pagina ${i} ---\n${pageText}\n\n`;
        } catch (pageErr) {
          console.error(`Eroare la citirea paginii ${i}:`, pageErr);
        }
      }
      return fullText.trim();
    } catch (err) {
      console.error('Eroare generală la procesarea PDF-ului în browser:', err);
      return '';
    }
  }

  utf8ToBase64(str: string): string {
    return btoa(unescape(encodeURIComponent(str)));
  }

  async handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      let file = input.files[0];
      const originalSize = file.size;
      
      if (file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        this.juristService.notificationService.warning('Formatul .docx nu este suportat direct. Vă rugăm să salvați documentul ca PDF.');
        this.auditResult.set('Eroare: Formatul .docx nu este suportat direct pentru analiza AI. Vă rugăm să salvați documentul ca PDF și să îl încărcați din nou.');
        input.value = ''; // Reset input
        return;
      }
      
      // Dacă este imagine, încercăm să o comprimăm (reducem dimensiunea pe loc)
      if (file.type.startsWith('image/')) {
         this.juristService.notificationService.success('Se optimizează și comprimă imaginea pentru upload rapid...');
         try {
            file = await this.compressImage(file);
            const savedPct = ((1 - file.size / originalSize) * 100).toFixed(1);
            this.juristService.notificationService.success(`Optimizare finalizată! Dimensiune redusă cu ${savedPct}% (${(originalSize / 1024).toFixed(1)} KB -> ${(file.size / 1024).toFixed(1)} KB).`);
         } catch (err) {
            console.error('Eroare la comprimarea imaginii:', err);
         }
      }

      // Dacă este PDF, încercăm extracția inteligentă a textului digital client-side
      let isDigitalPdfOptimized = false;
      let extractedTextContent = '';
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        this.juristService.notificationService.success('Se analizează tipul de document PDF pentru optimizare structurală...');
        try {
          const arrayBuffer = await file.arrayBuffer();
          const extractedText = await this.extractTextFromPdf(arrayBuffer);
          
          if (extractedText && extractedText.trim().length > 150) {
            extractedTextContent = extractedText;
            isDigitalPdfOptimized = true;
            
            const rawBytesLen = new Blob([extractedText]).size;
            const savedPct = ((1 - rawBytesLen / originalSize) * 100).toFixed(1);
            this.juristService.notificationService.success(
              `Optimizare excelentă! PDF digital transformat în text: dimensiune redusă cu ${savedPct}% (Original: ${(originalSize / 1024 / 1024).toFixed(2)} MB -> Text: ${(rawBytesLen / 1024).toFixed(1)} KB)`
            );
          } else {
            this.juristService.notificationService.warning('PDF-ul pare să fie scanat (nu conține text digital). Se încarcă formatul vizual complet.');
          }
        } catch (err) {
          console.error('Eroare la optimizarea PDF-ului:', err);
        }
      }

      // Verificăm dimensiunea (Limită maximă 15MB) după posibila compresie
      const MAX_MB = 15;
      const MAX_BYTES = MAX_MB * 1024 * 1024;
      if (!isDigitalPdfOptimized && file.size > MAX_BYTES) {
         this.juristService.notificationService.error(`Fișierul este prea mare (${(file.size / 1024 / 1024).toFixed(1)} MB). Limita maximă este de ${MAX_MB} MB.`);
         input.value = ''; // Reset input
         return;
      }

      if (isDigitalPdfOptimized) {
        this.uploadedFile.set({
          name: file.name,
          type: 'text/plain',
          base64: 'data:text/plain;base64,' + this.utf8ToBase64(extractedTextContent)
        });
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          const isImage = file.type.startsWith('image/');
          
          this.uploadedFile.set({
            name: file.name,
            type: file.type || 'unknown',
            base64: result,
            previewUrl: isImage ? result : undefined
          });
        };
        reader.readAsDataURL(file);
      }
    }
  }

  // Comprimarea inteligentă a imaginilor nativ în browser cu calitate optimă pentru text/OCR
  compressImage(file: File): Promise<File> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimensions de 1200px pentru detalii ideale de caractere/OCR în timp ce reducem cantitatea masiv
          const MAX_DIM = 1200;
          if (width > height && width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          } else if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file); // fail gracefully
            return;
          }
          
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
               const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                  type: 'image/jpeg',
                  lastModified: Date.now()
               });
               resolve(compressedFile);
            } else {
               resolve(file);
            }
          }, 'image/jpeg', 0.55); // calitate de 55% - echilibru excelent pentru contrast text/OCR și dimensiune minimă
        };
        img.onerror = () => resolve(file); // fallback la fișierul original
      };
      reader.onerror = () => resolve(file);
    });
  }

  async analyze() {
    const file = this.uploadedFile();
    if (!file) {
      this.juristService.notificationService.warning("Vă rugăm să încărcați un fișier mai întâi.");
      return;
    }
    
    try {
      let mimeType = file.type;
      if (!mimeType || mimeType === 'unknown') {
        if (file.name.endsWith('.pdf')) mimeType = 'application/pdf';
        else if (file.name.endsWith('.txt')) mimeType = 'text/plain';
        else if (file.name.endsWith('.jpg') || file.name.endsWith('.jpeg')) mimeType = 'image/jpeg';
        else if (file.name.endsWith('.png')) mimeType = 'image/png';
        else mimeType = 'application/pdf'; // fallback
      }

      const base64Parts = file.base64.split(',');
      if (base64Parts.length < 2) {
        this.juristService.notificationService.error("Fișierul nu a putut fi procesat.");
        return;
      }
      const base64Data = base64Parts[1];
      
      this.auditResult.set(""); // Clear previous result
      const result = await this.juristService.analyzeEvidence(base64Data, mimeType, this.auditPrompt, (text) => {
        this.auditResult.set(text);
        this.cdr.detectChanges();
      });
      this.auditResult.set(result);
    } catch (e: unknown) {
      const err = e as { message?: string };
      this.juristService.notificationService.error(err.message || "A apărut o eroare la generarea auditului.");
      console.error("Audit analyze error:", e);
    }
  }

  async generateEvidence() {
    if (!this.evidencePrompt) return;
    const result = await this.juristService.generateEvidenceImage(this.evidencePrompt);
    this.evidenceImage.set(result);
  }
  
  exportDoc() {
    let filenamePrompt = 'Audit_Juridic';
    if (this.uploadedFile()?.name) {
      filenamePrompt = `Audit_${this.uploadedFile()!.name}`;
    } else if (this.auditPrompt) {
      filenamePrompt = `Audit_${this.auditPrompt}`;
    }
    
    this.juristService.downloadDocx(this.auditResult(), filenamePrompt);
  }
}