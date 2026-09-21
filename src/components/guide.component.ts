import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JuristService, ModuleType } from '../services/jurist.service';

@Component({
  selector: 'app-guide',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full flex flex-col animate-fadeIn">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h2 class="text-3xl font-black text-white tracking-tight">Ghid de Utilizare</h2>
          <p class="text-gray-400">Învață cum să folosești JuristPRO la capacitate maximă.</p>
        </div>
        <div class="w-12 h-12 bg-jurist-orange/20 rounded-xl flex items-center justify-center text-jurist-orange">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto pr-2 space-y-12 animate-slideUp">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section class="bg-jurist-dark p-8 rounded-2xl border border-gray-800 hover:border-jurist-orange/30 transition-colors group">
            <div class="w-10 h-10 rounded-lg bg-jurist-orange text-black flex items-center justify-center font-bold mb-6 group-hover:scale-110 transition-transform">1</div>
            <h3 class="text-xl font-bold text-white mb-4">Asistentul AI</h3>
            <p class="text-gray-400 text-sm leading-relaxed">
              Utilizați chat-ul pentru întrebări punctuale. Puteți cere sinteze legislative, interpretări ale unor articole din Codul Civil sau Procedură, sau chiar strategii de atac pentru o speță descrisă pe scurt.
            </p>
            <button (click)="nav('assistant')" class="mt-6 text-jurist-orange text-xs font-bold hover:underline">Mergi la Asistent &rarr;</button>
          </section>

          <section class="bg-jurist-dark p-8 rounded-2xl border border-gray-800 hover:border-jurist-orange/30 transition-colors group">
            <div class="w-10 h-10 rounded-lg bg-jurist-orange text-black flex items-center justify-center font-bold mb-6 group-hover:scale-110 transition-transform">2</div>
            <h3 class="text-xl font-bold text-white mb-4">Strategie de Litigiu 360°</h3>
            <p class="text-gray-400 text-sm leading-relaxed">
              Cel mai puternic instrument al platformei. Introduceți speța și lăsați AI-ul să genereze o analiză completă: Analiză SWOT (Puncte tari/slabe), Scenarii Ofensive, Scenarii Defensive, Opțiuni de Soluționare Amiabilă și Recomandări clare pentru primii pași.
            </p>
            <button (click)="nav('strategy')" class="mt-6 text-jurist-orange text-xs font-bold hover:underline">Mergi la Strategie &rarr;</button>
          </section>

          <section class="bg-jurist-dark p-8 rounded-2xl border border-gray-800 hover:border-jurist-orange/30 transition-colors group">
            <div class="w-10 h-10 rounded-lg bg-jurist-orange text-black flex items-center justify-center font-bold mb-6 group-hover:scale-110 transition-transform">3</div>
            <h3 class="text-xl font-bold text-white mb-4">Redactare Documente</h3>
            <p class="text-gray-400 text-sm leading-relaxed">
              Selectați tipul de document dorit din modulul "Redactare". Introduceți datele esențiale (părți, obiect, situație de fapt) și lăsați AI-ul să genereze structura juridică. Exportați rezultatul în format Word pentru finisare.
            </p>
            <button (click)="nav('drafting')" class="mt-6 text-jurist-orange text-xs font-bold hover:underline">Mergi la Redactare &rarr;</button>
          </section>

          <section class="bg-jurist-dark p-8 rounded-2xl border border-gray-800 hover:border-jurist-orange/30 transition-colors group">
            <div class="w-10 h-10 rounded-lg bg-jurist-orange text-black flex items-center justify-center font-bold mb-6 group-hover:scale-110 transition-transform">4</div>
            <h3 class="text-xl font-bold text-white mb-4">Calcul Taxe</h3>
            <p class="text-gray-400 text-sm leading-relaxed">
              Nu mai pierdeți timpul cu tabele complexe. Modulul de taxe calculează automat taxele de timbru conform OUG 80/2013, dobânzile legale și penalitățile, oferindu-vă și temeiul legal pentru cererea de chemare în judecată.
            </p>
            <button (click)="nav('fees')" class="mt-6 text-jurist-orange text-xs font-bold hover:underline">Mergi la Taxe &rarr;</button>
          </section>

          <section class="bg-jurist-dark p-8 rounded-2xl border border-gray-800 hover:border-jurist-orange/30 transition-colors group">
            <div class="w-10 h-10 rounded-lg bg-jurist-orange text-black flex items-center justify-center font-bold mb-6 group-hover:scale-110 transition-transform">5</div>
            <h3 class="text-xl font-bold text-white mb-4">Management Credite</h3>
            <p class="text-gray-400 text-sm leading-relaxed">
              Fiecare interacțiune complexă consumă credite. Puteți monitoriza consumul în timp real din Dashboard și puteți reîncărca pachete de credite direct din secțiunea "Plăți" dacă aveți nevoie de volum suplimentar.
            </p>
            <button (click)="nav('pricing')" class="mt-6 text-jurist-orange text-xs font-bold hover:underline">Vezi Abonamente &rarr;</button>
          </section>
        </div>

        <div class="bg-jurist-orange/5 border border-jurist-orange/20 p-8 rounded-2xl">
          <h3 class="text-white font-bold mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 text-jurist-orange">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            Sfaturi pentru rezultate mai bune
          </h3>
          <ul class="space-y-3 text-sm text-gray-400">
            <li class="flex gap-2">
              <span class="text-jurist-orange font-bold">•</span>
              Fii cât mai specific în descrierea situației de fapt pentru redactare.
            </li>
            <li class="flex gap-2">
              <span class="text-jurist-orange font-bold">•</span>
              Verifică întotdeauna temeiurile legale citate de AI (deși folosim căutare în timp real, validarea umană este obligatorie).
            </li>
            <li class="flex gap-2">
              <span class="text-jurist-orange font-bold">•</span>
              Folosește modulul de Strategie pentru a obține o perspectivă de ansamblu asupra șanselor de câștig.
            </li>
          </ul>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
  `]
})
export class GuideComponent {
  juristService = inject(JuristService);

  nav(module: ModuleType) {
    this.juristService.setModule(module);
  }
}
