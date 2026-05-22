// Force GitHub sync update - 2026-04-11
import { Component, inject, signal, effect, ElementRef, ViewChildren, ViewChild, QueryList, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JuristService } from '../services/jurist.service';
import { db } from '../app/firebase';
import { collection, addDoc } from 'firebase/firestore';

type LandingView = 'home' | 'terms' | 'privacy' | 'cookies' | 'guide';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div #scrollContainer class="fixed inset-0 w-full h-full bg-[#050505] text-white font-sans flex flex-col overflow-x-hidden overflow-y-auto selection:bg-jurist-orange selection:text-black animate-fadeIn touch-pan-y overscroll-none">
      
      <!-- NAVIGATION -->
      <nav class="fixed top-0 left-0 w-full z-50 bg-black/80 backdrop-blur-lg border-b border-white/5 transition-all duration-300">
        <div class="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div class="flex items-center gap-3 cursor-pointer group" (click)="scrollTo('hero')" tabindex="0" (keydown.enter)="scrollTo('hero')">
            <div class="w-10 h-10 bg-jurist-orange rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(255,140,0,0.4)] group-hover:shadow-[0_0_25px_rgba(255,140,0,0.6)] transition-all duration-300">
              <span class="text-black font-black text-xl">J</span>
            </div>
            <h1 class="text-2xl font-bold tracking-wide text-white">Jurist<span class="text-jurist-orange">PRO</span></h1>
          </div>

          <!-- Desktop Nav -->
          <div class="hidden lg:flex items-center gap-8">
            <button (click)="scrollTo('features')" class="text-sm font-medium text-gray-400 hover:text-white hover:scale-105 transition-all">Facilități</button>
            <button (click)="scrollTo('security')" class="text-sm font-medium text-gray-400 hover:text-white hover:scale-105 transition-all">Securitate</button>
            <button (click)="scrollTo('pricing')" class="text-sm font-medium text-gray-400 hover:text-white hover:scale-105 transition-all">Abonamente</button>
            <button (click)="scrollTo('faq')" class="text-sm font-medium text-gray-400 hover:text-white hover:scale-105 transition-all">FAQ</button>
            <button (click)="setView('guide')" class="text-sm font-medium text-gray-400 hover:text-white hover:scale-105 transition-all">Ghid</button>
          </div>

          <div class="flex items-center gap-4">
            <button (click)="enterApp()" class="hidden sm:block group relative px-6 py-2.5 bg-jurist-orange text-white rounded-lg text-sm font-bold overflow-hidden shadow-[0_0_20px_rgba(255,140,0,0.3)] hover:shadow-[0_0_30px_rgba(255,140,0,0.5)] transition-all">
              <div class="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              <span class="relative flex items-center gap-2">
                Autentificare
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
              </span>
            </button>

            <!-- Mobile Menu Toggle -->
            <button (click)="mobileMenuOpen.set(true)" class="lg:hidden p-2 text-white hover:text-jurist-orange transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-8 h-8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      <!-- MOBILE NAV DRAWER -->
      @if (mobileMenuOpen()) {
        <div class="fixed inset-0 z-[60] lg:hidden">
           <!-- Backdrop -->
           <div class="absolute inset-0 bg-black/90 backdrop-blur-md" 
                (click)="mobileMenuOpen.set(false)" 
                (keydown.enter)="mobileMenuOpen.set(false)" 
                tabindex="0" role="button"></div>
           
           <div class="absolute top-0 right-0 w-full max-w-sm h-full bg-jurist-dark border-l border-white/10 p-8 shadow-2xl animate-slideDown">
              <div class="flex justify-between items-center mb-12">
                 <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-jurist-orange rounded flex items-center justify-center text-black font-bold">J</div>
                    <span class="text-xl font-bold text-white">JuristPRO</span>
                 </div>
                 <button (click)="mobileMenuOpen.set(false)" class="p-2 text-gray-400 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                       <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                 </button>
              </div>

              <div class="flex flex-col gap-6">
                 <button (click)="mobileMenuOpen.set(false); scrollTo('features')" class="text-2xl font-bold text-left text-gray-400 hover:text-jurist-orange">Facilități</button>
                 <button (click)="mobileMenuOpen.set(false); scrollTo('security')" class="text-2xl font-bold text-left text-gray-400 hover:text-jurist-orange">Securitate</button>
                 <button (click)="mobileMenuOpen.set(false); scrollTo('pricing')" class="text-2xl font-bold text-left text-gray-400 hover:text-jurist-orange">Abonamente</button>
                 <button (click)="mobileMenuOpen.set(false); scrollTo('faq')" class="text-2xl font-bold text-left text-gray-400 hover:text-jurist-orange">FAQ</button>
                 <button (click)="mobileMenuOpen.set(false); setView('guide')" class="text-2xl font-bold text-left text-gray-400 hover:text-jurist-orange">Ghid</button>
                 
                 <div class="mt-12 pt-12 border-t border-white/10">
                    <button (click)="enterApp()" class="w-full py-4 bg-jurist-orange text-white rounded-xl font-bold text-lg shadow-lg">
                       Autentificare
                    </button>
                 </div>
              </div>
           </div>
        </div>
      }

      <!-- MAIN CONTENT -->
      <div class="flex-grow flex flex-col w-full pt-20">
          @switch (currentView()) {
            
            <!-- HOME VIEW -->
            @case ('home') {
              <div class="flex-1 flex flex-col w-full">
                
                <!-- HERO SECTION -->
                <section id="hero" class="relative w-full min-h-[90vh] flex flex-col items-center justify-center text-center px-4 sm:px-6 py-20 overflow-hidden">
                   <!-- Ambient Background -->
                   <div class="absolute inset-0 pointer-events-none">
                      <div class="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-jurist-orange/10 rounded-full blur-[120px] animate-pulse"></div>
                      <div class="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[120px]"></div>
                      <div class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                   </div>

                   <div class="relative z-10 max-w-5xl mx-auto space-y-8" #anim>
                     <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-jurist-orange text-[10px] sm:text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-colors cursor-default backdrop-blur-md">
                        <span class="w-2 h-2 rounded-full bg-jurist-orange animate-ping"></span>
                        JuristPRO Intelligence v2.0
                     </div>

                     <h1 class="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-none text-white drop-shadow-2xl">
                        Puterea Juridică <br/>
                        <span class="text-transparent bg-clip-text bg-gradient-to-r from-jurist-orange via-amber-500 to-yellow-500">Redefinită.</span>
                     </h1>
                     
                     <p class="text-base sm:text-lg md:text-2xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light px-4 sm:px-0">
                        Platforma inovatoare din România care transformă redactarea actelor și analiza dosarelor dintr-o corvoadă într-un avantaj competitiv.
                     </p>

                     <div class="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full justify-center pt-8 px-4 sm:px-0">
                        <button (click)="enterApp()" class="px-8 sm:px-10 py-4 sm:py-5 bg-jurist-orange text-white rounded-xl font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,140,0,0.4)] hover:shadow-[0_0_60px_rgba(255,140,0,0.6)] flex items-center justify-center gap-3">
                           Începe Gratuit
                        </button>
                        <button (click)="scrollTo('demo')" class="px-8 sm:px-10 py-4 sm:py-5 bg-white/5 border border-white/10 text-white rounded-xl font-bold text-lg hover:bg-white/10 hover:border-white/20 transition-all backdrop-blur-sm flex items-center justify-center gap-3">
                           <span>▶</span> Vezi Demo
                        </button>
                     </div>

                     <!-- Trust Badges -->
                     <div class="pt-16 flex flex-wrap justify-center gap-4 sm:gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                        <span class="text-[10px] sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap"><div class="w-2 h-2 bg-gray-500 rounded-full"></div> GDPR Compliant</span>
                        <span class="text-[10px] sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap"><div class="w-2 h-2 bg-gray-500 rounded-full"></div> ISO 27001 Security</span>
                        <span class="text-[10px] sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap"><div class="w-2 h-2 bg-gray-500 rounded-full"></div> 24/7 Availability</span>
                     </div>
                   </div>
                </section>

                <!-- FEATURES GRID -->
                <section id="features" class="py-32 bg-[#080808] relative">
                  <div class="max-w-7xl mx-auto px-6">
                    <div class="text-center mb-20 space-y-4 opacity-0 translate-y-10 transition-all duration-700" #anim>
                      <h2 class="text-4xl md:text-5xl font-bold text-white">Ecosistem Complet</h2>
                      <p class="text-gray-400 text-lg max-w-2xl mx-auto">Un singur dashboard pentru toate nevoile cabinetului tău.</p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <!-- Card 1 -->
                      <div class="group bg-[#111] p-8 rounded-3xl border border-gray-800 hover:border-jurist-orange/50 transition-all duration-300 hover:-translate-y-2 opacity-0 translate-y-10" #anim>
                        <div class="w-16 h-16 bg-blue-900/20 rounded-2xl flex items-center justify-center mb-6 text-blue-400 group-hover:scale-110 transition-transform duration-300">
                           <span class="text-3xl">🤖</span>
                        </div>
                        <h3 class="text-2xl font-bold text-white mb-3">Asistent AI</h3>
                        <p class="text-gray-400 leading-relaxed">Răspunde instant la întrebări procedurale, verifică jurisprudență și oferă sinteze legislative actualizate la zi.</p>
                      </div>

                      <!-- Card 2 -->
                      <div class="group bg-[#111] p-8 rounded-3xl border border-gray-800 hover:border-jurist-orange/50 transition-all duration-300 hover:-translate-y-2 delay-100 opacity-0 translate-y-10" #anim>
                        <div class="w-16 h-16 bg-purple-900/20 rounded-2xl flex items-center justify-center mb-6 text-purple-400 group-hover:scale-110 transition-transform duration-300">
                           <span class="text-3xl">📝</span>
                        </div>
                        <h3 class="text-2xl font-bold text-white mb-3">Redactare Automată</h3>
                        <p class="text-gray-400 leading-relaxed">Generează cereri de chemare în judecată, întâmpinări și contracte în mai puțin de 30 de secunde.</p>
                      </div>

                      <!-- Card 3 -->
                      <div class="group bg-[#111] p-8 rounded-3xl border border-gray-800 hover:border-jurist-orange/50 transition-all duration-300 hover:-translate-y-2 delay-200 opacity-0 translate-y-10" #anim>
                        <div class="w-16 h-16 bg-green-900/20 rounded-2xl flex items-center justify-center mb-6 text-green-400 group-hover:scale-110 transition-transform duration-300">
                           <span class="text-3xl">💰</span>
                        </div>
                        <h3 class="text-2xl font-bold text-white mb-3">Calculator Taxe</h3>
                        <p class="text-gray-400 leading-relaxed">Calcul instant pentru taxe de timbru, onorarii și dobânzi legale conform OUG 80/2013.</p>
                      </div>
                    </div>
                  </div>
                </section>

                <!-- SECURITY PARALLAX -->
                <section id="security" class="py-32 bg-black relative border-y border-gray-900 overflow-hidden">
                   <div class="absolute inset-0 bg-jurist-orange/5 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-jurist-orange/20 via-transparent to-transparent"></div>
                   
                   <div class="max-w-7xl mx-auto px-6 relative z-10">
                      <div class="text-center mb-20 opacity-0 translate-y-10 transition-all duration-700" #anim>
                         <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 text-green-500 mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8">
                               <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                            </svg>
                         </div>
                         <h2 class="text-4xl md:text-5xl font-bold text-white mb-6">Securitate la Standarde Bancare.</h2>
                         <p class="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
                            Știm că secretul profesional este fundamentul profesiei de avocat. De aceea, am construit JuristPRO cu o arhitectură de securitate Zero-Trust. Datele clienților tăi sunt în siguranță absolută.
                         </p>
                      </div>

                      <div class="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                         <!-- Left Column: What happens to data -->
                         <div class="space-y-8 opacity-0 -translate-x-10 transition-all duration-1000" #anim>
                            <h3 class="text-2xl font-bold text-white border-b border-gray-800 pb-4">Ce se întâmplă cu documentele încărcate?</h3>
                            
                            <div class="space-y-6">
                               <div class="flex gap-4">
                                  <div class="w-10 h-10 rounded-full bg-jurist-orange/20 text-jurist-orange flex items-center justify-center shrink-0 font-bold">1</div>
                                  <div>
                                     <h4 class="text-lg font-bold text-gray-200 mb-2">Criptare în Tranzit și în Repaus</h4>
                                     <p class="text-gray-400 text-sm leading-relaxed">În momentul încărcării, documentul este criptat folosind protocolul <strong>TLS 1.3</strong>. Odată ajuns pe serverele noastre din Frankfurt (UE), este criptat cu algoritmul militar <strong>AES-256</strong>. Doar tu deții cheia de decriptare.</p>
                                  </div>
                               </div>
                               
                               <div class="flex gap-4">
                                  <div class="w-10 h-10 rounded-full bg-jurist-orange/20 text-jurist-orange flex items-center justify-center shrink-0 font-bold">2</div>
                                  <div>
                                     <h4 class="text-lg font-bold text-gray-200 mb-2">Procesare Efemeră (In-Memory)</h4>
                                     <p class="text-gray-400 text-sm leading-relaxed">Când soliciți o analiză AI, documentul este decriptat strict în memoria RAM a serverului pentru fracțiuni de secundă. <strong>Nu este salvat niciodată pe disc în formă necriptată.</strong></p>
                                  </div>
                               </div>

                               <div class="flex gap-4">
                                  <div class="w-10 h-10 rounded-full bg-jurist-orange/20 text-jurist-orange flex items-center justify-center shrink-0 font-bold">3</div>
                                  <div>
                                     <h4 class="text-lg font-bold text-gray-200 mb-2">Ștergere Automată (Zero Retention)</h4>
                                     <p class="text-gray-400 text-sm leading-relaxed">Imediat după generarea răspunsului sau a sintezei, documentul sursă și datele extrase sunt <strong>șterse ireversibil</strong> din memoria sistemului AI. Nu păstrăm istoricul documentelor analizate.</p>
                                  </div>
                               </div>
                            </div>
                         </div>

                         <!-- Right Column: Technical Guarantees -->
                         <div class="space-y-8 opacity-0 translate-x-10 transition-all duration-1000 delay-100" #anim>
                            <h3 class="text-2xl font-bold text-white border-b border-gray-800 pb-4">Garanții Tehnice și Legale</h3>
                            
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                               <div class="bg-[#111] p-5 rounded-xl border border-gray-800 hover:border-jurist-orange/50 transition-colors">
                                  <div class="text-jurist-orange mb-3">
                                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                  </div>
                                  <h4 class="font-bold text-white text-sm mb-2">Fără Antrenare AI</h4>
                                  <p class="text-xs text-gray-400">Garantăm contractual că datele, spețele sau documentele tale <strong>NU</strong> sunt folosite pentru antrenarea modelelor de inteligență artificială.</p>
                               </div>

                               <div class="bg-[#111] p-5 rounded-xl border border-gray-800 hover:border-jurist-orange/50 transition-colors">
                                  <div class="text-jurist-orange mb-3">
                                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                  </div>
                                  <h4 class="font-bold text-white text-sm mb-2">Conformitate GDPR & UNBR</h4>
                                  <p class="text-xs text-gray-400">Infrastructura respectă normele GDPR și cerințele de confidențialitate impuse de Statutul Profesiei de Avocat.</p>
                               </div>

                               <div class="bg-[#111] p-5 rounded-xl border border-gray-800 hover:border-jurist-orange/50 transition-colors">
                                  <div class="text-jurist-orange mb-3">
                                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm-3-6h.008v.008h-.008v-.008z" /></svg>
                                  </div>
                                  <h4 class="font-bold text-white text-sm mb-2">Servere UE (Frankfurt)</h4>
                                  <p class="text-xs text-gray-400">Datele nu părăsesc niciodată Spațiul Economic European. Folosim centre de date certificate ISO 27001.</p>
                               </div>

                               <div class="bg-[#111] p-5 rounded-xl border border-gray-800 hover:border-jurist-orange/50 transition-colors">
                                  <div class="text-jurist-orange mb-3">
                                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                                  </div>
                                  <h4 class="font-bold text-white text-sm mb-2">Acces Restricționat</h4>
                                  <p class="text-xs text-gray-400">Niciun angajat JuristPRO nu are acces la documentele tale. Autentificarea se face prin token-uri securizate.</p>
                               </div>
                            </div>
                         </div>
                      </div>
                   </div>
                </section>

                <!-- DEMO PREVIEW -->
                <section id="demo" class="py-32 bg-[#050505] border-t border-gray-900">
                   <div class="max-w-7xl mx-auto px-6">
                      <div class="text-center mb-16 opacity-0 translate-y-10 transition-all duration-700" #anim>
                         <h2 class="text-4xl md:text-5xl font-bold text-white mb-6">Capabilități Platformă</h2>
                         <p class="text-gray-400 text-lg max-w-2xl mx-auto">Descoperă cum JuristPRO îți poate optimiza fluxul de lucru prin exemple concrete din fiecare modul.</p>
                      </div>
                      
                      <div class="flex flex-col lg:flex-row gap-8 opacity-0 translate-y-10 transition-all duration-1000 delay-100" #anim>
                         <!-- Tabs Sidebar -->
                         <div class="lg:w-1/4 flex flex-row lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0 custom-scrollbar-orange">
                            <button (click)="activeDemoTab.set('assistant')" 
                                    [class.bg-jurist-orange]="activeDemoTab() === 'assistant'"
                                    [class.text-black]="activeDemoTab() === 'assistant'"
                                    [class.bg-[#111]]="activeDemoTab() !== 'assistant'"
                                    [class.text-gray-400]="activeDemoTab() !== 'assistant'"
                                    class="text-left px-6 py-4 rounded-xl font-bold transition-all hover:bg-jurist-orange/20 hover:text-white flex items-center gap-3 whitespace-nowrap lg:whitespace-normal shrink-0">
                               <span class="text-xl">🤖</span> Asistent AI
                            </button>
                            <button (click)="activeDemoTab.set('drafting')" 
                                    [class.bg-jurist-orange]="activeDemoTab() === 'drafting'"
                                    [class.text-black]="activeDemoTab() === 'drafting'"
                                    [class.bg-[#111]]="activeDemoTab() !== 'drafting'"
                                    [class.text-gray-400]="activeDemoTab() !== 'drafting'"
                                    class="text-left px-6 py-4 rounded-xl font-bold transition-all hover:bg-jurist-orange/20 hover:text-white flex items-center gap-3 whitespace-nowrap lg:whitespace-normal shrink-0">
                               <span class="text-xl">📝</span> Redactare
                            </button>
                            <button (click)="activeDemoTab.set('fees')" 
                                    [class.bg-jurist-orange]="activeDemoTab() === 'fees'"
                                    [class.text-black]="activeDemoTab() === 'fees'"
                                    [class.bg-[#111]]="activeDemoTab() !== 'fees'"
                                    [class.text-gray-400]="activeDemoTab() !== 'fees'"
                                    class="text-left px-6 py-4 rounded-xl font-bold transition-all hover:bg-jurist-orange/20 hover:text-white flex items-center gap-3 whitespace-nowrap lg:whitespace-normal shrink-0">
                               <span class="text-xl">💰</span> Taxe & Onorarii
                            </button>
                            <button (click)="activeDemoTab.set('strategy')" 
                                    [class.bg-jurist-orange]="activeDemoTab() === 'strategy'"
                                    [class.text-black]="activeDemoTab() === 'strategy'"
                                    [class.bg-[#111]]="activeDemoTab() !== 'strategy'"
                                    [class.text-gray-400]="activeDemoTab() !== 'strategy'"
                                    class="text-left px-6 py-4 rounded-xl font-bold transition-all hover:bg-jurist-orange/20 hover:text-white flex items-center gap-3 whitespace-nowrap lg:whitespace-normal shrink-0">
                               <span class="text-xl">🎯</span> Strategie
                            </button>
                         </div>

                         <!-- Content Area -->
                         <div class="lg:w-3/4 bg-[#0a0a0a] border border-gray-800 rounded-2xl p-8 relative overflow-hidden min-h-[500px]">
                            <!-- Mock Browser Header -->
                            <div class="absolute top-0 left-0 w-full bg-[#151515] h-12 flex items-center px-4 gap-2 border-b border-gray-800">
                               <div class="w-3 h-3 rounded-full bg-red-500/80"></div>
                               <div class="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                               <div class="w-3 h-3 rounded-full bg-green-500/80"></div>
                               <div class="ml-4 bg-black/50 px-4 py-1.5 rounded-md text-xs text-gray-500 font-mono flex items-center gap-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3"><path fill-rule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clip-rule="evenodd" /></svg>
                                  juristpro.ai/app/{{activeDemoTab()}}
                               </div>
                            </div>

                            <div class="pt-12">
                               @switch (activeDemoTab()) {
                                  @case ('assistant') {
                                     <div class="space-y-8 animate-fadeIn">
                                        <div>
                                           <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2"><span class="text-jurist-orange">1.</span> Analiză Speță Civilă</h3>
                                           <div class="bg-[#111] rounded-xl p-5 border border-gray-800">
                                              <div class="flex gap-4 mb-4">
                                                 <div class="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center shrink-0 text-sm">👤</div>
                                                 <p class="text-gray-300 text-sm bg-gray-800/50 p-3 rounded-lg rounded-tl-none">Care este termenul de prescripție pentru o acțiune în pretenții derivată dintr-un contract de împrumut nerestituit la scadență, și de când începe să curgă?</p>
                                              </div>
                                              <div class="flex gap-4">
                                                 <div class="w-8 h-8 rounded-full bg-jurist-orange/20 text-jurist-orange flex items-center justify-center shrink-0 text-sm font-bold">J</div>
                                                 <div class="text-gray-300 text-sm bg-jurist-orange/5 p-4 rounded-lg rounded-tl-none border border-jurist-orange/10 space-y-2">
                                                    <p>Conform <strong>Art. 2517 Cod Civil</strong>, termenul general de prescripție este de <strong>3 ani</strong>.</p>
                                                    <p>Conform <strong>Art. 2524 alin. (1) Cod Civil</strong>, dacă prin contract nu s-a stipulat un termen de restituire, prescripția începe să curgă de la data încheierii contractului. Dacă s-a stipulat un termen, prescripția începe să curgă de la data la care obligația a devenit exigibilă (data scadenței).</p>
                                                    <p class="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-800">Temei legal: Art. 2517, Art. 2524 C.Civ. | Timp de răspuns: 1.2s</p>
                                                 </div>
                                              </div>
                                           </div>
                                        </div>
                                        <div>
                                           <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2"><span class="text-jurist-orange">2.</span> Sinteză Jurisprudență</h3>
                                           <div class="bg-[#111] rounded-xl p-5 border border-gray-800">
                                              <div class="flex gap-4 mb-4">
                                                 <div class="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center shrink-0 text-sm">👤</div>
                                                 <p class="text-gray-300 text-sm bg-gray-800/50 p-3 rounded-lg rounded-tl-none">Găsește practică judiciară recentă a ICCJ privind clauzele abuzive în contractele de credit în franci elvețieni (CHF).</p>
                                              </div>
                                              <div class="flex gap-4">
                                                 <div class="w-8 h-8 rounded-full bg-jurist-orange/20 text-jurist-orange flex items-center justify-center shrink-0 text-sm font-bold">J</div>
                                                 <div class="text-gray-300 text-sm bg-jurist-orange/5 p-4 rounded-lg rounded-tl-none border border-jurist-orange/10 space-y-3">
                                                    <p>Am identificat 3 decizii relevante recente ale Înaltei Curți de Casație și Justiție:</p>
                                                    <ul class="list-disc pl-5 space-y-1 text-gray-400">
                                                       <li><strong>Decizia nr. 1234/2023 (Secția a II-a Civilă):</strong> Constată caracterul abuziv al clauzei de risc valutar, obligând banca la stabilizarea cursului la momentul acordării creditului.</li>
                                                       <li><strong>Decizia nr. 892/2023:</strong> Respinge acțiunea consumatorului pe motiv de prescripție a dreptului la acțiune pentru restituirea prestațiilor.</li>
                                                    </ul>
                                                    <button class="text-jurist-orange text-xs font-bold hover:underline mt-2">Vezi documentele complete (PDF) &rarr;</button>
                                                 </div>
                                              </div>
                                           </div>
                                        </div>
                                     </div>
                                  }
                                  @case ('drafting') {
                                     <div class="space-y-8 animate-fadeIn">
                                        <div>
                                           <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2"><span class="text-jurist-orange">1.</span> Generare Cerere de Chemare în Judecată</h3>
                                           <div class="bg-[#111] rounded-xl p-5 border border-gray-800 flex flex-col md:flex-row gap-6 items-start">
                                              <div class="flex-1 space-y-4 w-full">
                                                 <div class="space-y-2">
                                                    <span class="text-xs text-gray-500 uppercase font-bold">Tip Acțiune</span>
                                                    <div class="bg-black border border-gray-800 p-2 rounded text-sm text-gray-300">Acțiune în pretenții (Răspundere civilă delictuală)</div>
                                                 </div>
                                                 <div class="space-y-2">
                                                    <span class="text-xs text-gray-500 uppercase font-bold">Situație de fapt (Input)</span>
                                                    <div class="bg-black border border-gray-800 p-2 rounded text-sm text-gray-400 italic">"Clientul Popescu Ion a fost inundat de vecinul de deasupra, Ionescu Vasile. Paguba e de 15.000 RON. Avem proces verbal de la asociație și deviz de reparații."</div>
                                                 </div>
                                                 <button class="bg-jurist-orange/20 text-jurist-orange border border-jurist-orange/50 px-4 py-2 rounded text-sm font-bold flex items-center gap-2">
                                                    <span class="animate-spin">⚙️</span> Generare Document...
                                                 </button>
                                              </div>
                                              <div class="flex-1 bg-white p-4 rounded shadow-inner h-48 overflow-hidden relative w-full">
                                                 <div class="absolute inset-0 bg-gradient-to-b from-transparent to-white/90 z-10"></div>
                                                 <div class="text-[10px] text-black font-serif leading-relaxed">
                                                    <p class="text-center font-bold mb-2">DOMNULE PREȘEDINTE,</p>
                                                    <p>Subsemnatul POPESCU ION, domiciliat în [...], formulez prezenta</p>
                                                    <p class="text-center font-bold my-2">CERERE DE CHEMARE ÎN JUDECATĂ</p>
                                                    <p>împotriva pârâtului IONESCU VASILE, domiciliat în [...], solicitând instanței ca prin hotărârea ce o va pronunța să dispună:</p>
                                                    <p>1. Obligarea pârâtului la plata sumei de 15.000 RON reprezentând daune materiale;</p>
                                                    <p>2. Obligarea pârâtului la plata cheltuielilor de judecată.</p>
                                                    <p class="font-bold mt-2">ÎN FAPT:</p>
                                                    <p>La data de [...], apartamentul subsemnatului a fost inundat ca urmare a unei defecțiuni la instalația sanitară a pârâtului...</p>
                                                 </div>
                                              </div>
                                           </div>
                                        </div>
                                        <div>
                                           <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2"><span class="text-jurist-orange">2.</span> Revizuire Contract</h3>
                                           <div class="bg-[#111] rounded-xl p-5 border border-gray-800">
                                              <div class="flex items-center justify-between mb-4">
                                                 <span class="text-sm text-gray-300 font-mono">Contract_Prestari_Servicii_IT.docx</span>
                                                 <span class="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded font-bold">3 Riscuri Identificate</span>
                                              </div>
                                              <div class="space-y-2">
                                                 <div class="bg-black border border-red-900/30 p-3 rounded-lg border-l-2 border-l-red-500">
                                                    <p class="text-sm text-gray-300"><span class="text-red-500 font-bold">Risc Major:</span> Clauza 5.2 (Penalități) prevede penalități de 1% pe zi de întârziere, ceea ce poate depăși debitul principal, încălcând Legea 72/2013 în relațiile B2B dacă nu este negociată expres.</p>
                                                    <p class="text-xs text-jurist-orange mt-1 cursor-pointer hover:underline">Sugestie modificare: Limitarea penalităților la 0.1% pe zi, maxim valoarea debitului.</p>
                                                 </div>
                                                 <div class="bg-black border border-yellow-900/30 p-3 rounded-lg border-l-2 border-l-yellow-500">
                                                    <p class="text-sm text-gray-300"><span class="text-yellow-500 font-bold">Atenție:</span> Clauza de forță majoră nu include explicit pandemiile sau starea de urgență.</p>
                                                 </div>
                                              </div>
                                           </div>
                                        </div>
                                     </div>
                                  }
                                  @case ('fees') {
                                     <div class="space-y-8 animate-fadeIn">
                                        <div>
                                           <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2"><span class="text-jurist-orange">1.</span> Calcul Taxă Judiciară de Timbru</h3>
                                           <div class="bg-[#111] rounded-xl p-5 border border-gray-800 flex flex-col md:flex-row gap-6">
                                              <div class="flex-1 space-y-3">
                                                 <div class="bg-black p-3 rounded border border-gray-800">
                                                    <span class="text-xs text-gray-500 block mb-1">Valoare Obiect (RON)</span>
                                                    <div class="text-lg text-white font-mono">150,000.00</div>
                                                 </div>
                                                 <div class="bg-black p-3 rounded border border-gray-800">
                                                    <span class="text-xs text-gray-500 block mb-1">Tip Acțiune</span>
                                                    <div class="text-sm text-gray-300">Evaluabilă în bani (Art. 3 OUG 80/2013)</div>
                                                 </div>
                                              </div>
                                              <div class="flex-1 bg-jurist-orange/10 border border-jurist-orange/30 rounded-xl p-5 flex flex-col justify-center items-center text-center">
                                                 <p class="text-sm text-gray-400 mb-2">Taxă de timbru datorată</p>
                                                 <p class="text-3xl font-bold text-jurist-orange font-mono">4,105.00 RON</p>
                                                 <p class="text-xs text-gray-500 mt-2">Calcul: 2105 lei + 2% pentru ce depăşeşte 50.000 lei</p>
                                              </div>
                                           </div>
                                        </div>
                                        <div>
                                           <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2"><span class="text-jurist-orange">2.</span> Calcul Penalități și Dobânzi</h3>
                                           <div class="bg-[#111] rounded-xl p-5 border border-gray-800">
                                              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                                 <div class="bg-black p-2 rounded border border-gray-800">
                                                    <span class="text-[10px] text-gray-500 uppercase">Debit Principal</span>
                                                    <div class="text-sm text-white font-mono">50,000 RON</div>
                                                 </div>
                                                 <div class="bg-black p-2 rounded border border-gray-800">
                                                    <span class="text-[10px] text-gray-500 uppercase">Data Scadenței</span>
                                                    <div class="text-sm text-white font-mono">15.01.2023</div>
                                                 </div>
                                                 <div class="bg-black p-2 rounded border border-gray-800">
                                                    <span class="text-[10px] text-gray-500 uppercase">Data Calculului</span>
                                                    <div class="text-sm text-white font-mono">15.10.2023</div>
                                                 </div>
                                              </div>
                                              <div class="bg-black border border-gray-800 rounded-lg p-4">
                                                 <div class="flex justify-between items-center border-b border-gray-800 pb-2 mb-2">
                                                    <span class="text-sm text-gray-400">Zile de întârziere:</span>
                                                    <span class="text-sm text-white font-bold">273 zile</span>
                                                 </div>
                                                 <div class="flex justify-between items-center border-b border-gray-800 pb-2 mb-2">
                                                    <span class="text-sm text-gray-400">Dobândă legală penalizatoare (OG 13/2011):</span>
                                                    <span class="text-sm text-jurist-orange font-bold font-mono">+ 2,991.78 RON</span>
                                                 </div>
                                                 <div class="flex justify-between items-center pt-1">
                                                    <span class="text-sm font-bold text-white">Total de recuperat:</span>
                                                    <span class="text-lg text-jurist-orange font-bold font-mono">52,991.78 RON</span>
                                                 </div>
                                              </div>
                                           </div>
                                        </div>
                                     </div>
                                  }
                                  @case ('strategy') {
                                     <div class="space-y-8 animate-fadeIn">
                                        <div>
                                           <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2"><span class="text-jurist-orange">1.</span> Evaluare Șanse de Câștig</h3>
                                           <div class="bg-[#111] rounded-xl p-5 border border-gray-800">
                                              <div class="flex items-center gap-6 mb-4">
                                                 <div class="relative w-24 h-24 shrink-0">
                                                    <svg class="w-full h-full" viewBox="0 0 36 36">
                                                       <path class="text-gray-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="3" />
                                                       <path class="text-green-500" stroke-dasharray="75, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="3" />
                                                    </svg>
                                                    <div class="absolute inset-0 flex items-center justify-center text-xl font-bold text-white">75%</div>
                                                 </div>
                                                 <div>
                                                    <h4 class="text-white font-bold mb-1">Litigiu Muncă - Concediere Abuzivă</h4>
                                                    <p class="text-sm text-gray-400">Probabilitate favorabilă bazată pe lipsa cercetării disciplinare prealabile (Art. 251 Codul Muncii).</p>
                                                 </div>
                                              </div>
                                              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                 <div class="bg-green-900/10 border border-green-900/30 p-3 rounded">
                                                    <span class="text-xs text-green-500 font-bold uppercase block mb-1">Puncte Forte</span>
                                                    <ul class="text-xs text-gray-300 list-disc pl-4">
                                                       <li>Viciu de procedură evident</li>
                                                       <li>Jurisprudență constantă favorabilă</li>
                                                    </ul>
                                                 </div>
                                                 <div class="bg-red-900/10 border border-red-900/30 p-3 rounded">
                                                    <span class="text-xs text-red-500 font-bold uppercase block mb-1">Riscuri</span>
                                                    <ul class="text-xs text-gray-300 list-disc pl-4">
                                                       <li>Dificultate în probarea daunelor morale</li>
                                                    </ul>
                                                 </div>
                                              </div>
                                           </div>
                                        </div>
                                        <div>
                                           <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2"><span class="text-jurist-orange">2.</span> Plan de Acțiune Procedural</h3>
                                           <div class="bg-[#111] rounded-xl p-5 border border-gray-800">
                                              <div class="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-700 before:to-transparent">
                                                 <div class="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                                    <div class="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#111] bg-jurist-orange text-black shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-[0_0_10px_rgba(255,140,0,0.5)] z-10">1</div>
                                                    <div class="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-black p-4 rounded-lg border border-jurist-orange/30">
                                                       <div class="flex items-center justify-between mb-1">
                                                          <h4 class="font-bold text-white text-sm">Notificare prealabilă</h4>
                                                          <span class="text-[10px] text-jurist-orange font-bold">Zilele 1-15</span>
                                                       </div>
                                                       <p class="text-xs text-gray-400">Trimitere somație de plată prin executor judecătoresc.</p>
                                                    </div>
                                                 </div>
                                                 <div class="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                                                    <div class="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#111] bg-gray-800 text-gray-400 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">2</div>
                                                    <div class="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-black p-4 rounded-lg border border-gray-800">
                                                       <div class="flex items-center justify-between mb-1">
                                                          <h4 class="font-bold text-gray-300 text-sm">Ordonanță de plată</h4>
                                                          <span class="text-[10px] text-gray-500 font-bold">Ziua 16</span>
                                                       </div>
                                                       <p class="text-xs text-gray-500">Depunere cerere conform OUG 119/2007 dacă creanța e certă, lichidă și exigibilă.</p>
                                                    </div>
                                                 </div>
                                              </div>
                                           </div>
                                        </div>
                                     </div>
                                  }
                               }
                            </div>
                         </div>
                      </div>
                   </div>
                </section>

                <!-- PRICING CARDS -->
                <section id="pricing" class="py-32 bg-[#0a0a0a] border-t border-gray-900">
                   <div class="max-w-7xl mx-auto px-6">
                      <div class="text-center mb-20 opacity-0 translate-y-10 transition-all duration-700" #anim>
                         <h2 class="text-4xl md:text-5xl font-bold text-white mb-6">Investiție Minimă. Randament Maxim.</h2>
                         <p class="text-gray-400">Pachete flexibile pentru cabinete individuale și societăți de avocatură.</p>
                      </div>

                      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                         <!-- Starter -->
                         <div class="bg-black border border-gray-800 p-8 rounded-3xl opacity-0 translate-y-10 transition-all duration-700" #anim>
                            <h3 class="text-xl font-bold text-gray-300">Trial</h3>
                            <div class="my-6"><span class="text-4xl font-bold text-white">0 RON</span></div>
                            <ul class="space-y-4 mb-8 text-gray-400 text-sm">
                               <li class="flex gap-2">✓ 5 Credite AI</li>
                               <li class="flex gap-2">✓ Acces de bază</li>
                               <li class="flex gap-2 opacity-50">✕ Fără Export</li>
                               <li class="flex gap-2 opacity-50">✕ Fără Top-Up</li>
                            </ul>
                            <button (click)="enterApp()" class="w-full py-3 border border-gray-700 rounded-xl text-white font-bold hover:bg-gray-800">Înregistrare</button>
                         </div>

                         <!-- Expert (Highlighted) -->
                         <div class="bg-[#151515] border-2 border-jurist-orange p-10 rounded-3xl relative shadow-[0_0_40px_rgba(255,140,0,0.15)] transform scale-105 z-10 opacity-0 translate-y-10 transition-all duration-700 delay-100" #anim>
                            <div class="absolute top-0 right-0 bg-jurist-orange text-black text-xs font-bold px-4 py-1.5 rounded-bl-xl rounded-tr-xl">POPULAR</div>
                            <h3 class="text-2xl font-bold text-white">Expert</h3>
                            <div class="my-6"><span class="text-5xl font-bold text-white">200</span> <span class="text-gray-500">RON</span></div>
                            <ul class="space-y-4 mb-10 text-gray-300">
                               <li class="flex gap-2 text-white"><span class="text-jurist-orange">✓</span> 150 Credite / lună</li>
                               <li class="flex gap-2 text-white"><span class="text-jurist-orange">✓</span> Strategie & Redactare</li>
                               <li class="flex gap-2 text-white"><span class="text-jurist-orange">✓</span> Export DOCX Nelimitat</li>
                            </ul>
                            <button (click)="enterApp()" class="w-full py-4 bg-jurist-orange text-white rounded-xl font-bold shadow-lg hover:bg-amber-500 transition-colors">Alege Expert</button>
                         </div>

                         <!-- Gold -->
                         <div class="bg-black border border-gray-800 p-8 rounded-3xl opacity-0 translate-y-10 transition-all duration-700 delay-200" #anim>
                            <h3 class="text-xl font-bold text-yellow-500">Gold</h3>
                            <div class="my-6"><span class="text-4xl font-bold text-white">500 RON</span></div>
                            <ul class="space-y-4 mb-8 text-gray-400 text-sm">
                               <li class="flex gap-2">✓ 500 Credite / lună</li>
                               <li class="flex gap-2">✓ Suport Prioritar</li>
                               <li class="flex gap-2">✓ Acces API Beta</li>
                            </ul>
                            <button (click)="enterApp()" class="w-full py-3 border border-gray-700 rounded-xl text-yellow-500 font-bold hover:bg-gray-800">Alege Gold</button>
                         </div>
                      </div>

                      <!-- TOP-UP PACKAGES -->
                      <div class="mt-32">
                         <div class="text-center mb-16 opacity-0 translate-y-10 transition-all duration-700" #anim>
                            <div class="inline-block px-4 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-bold uppercase tracking-widest mb-4">Venit Suplimentar</div>
                            <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">Pachete Top-Up (Credite)</h2>
                            <p class="text-gray-500">Ai nevoie de mai multă putere de procesare? Reîncarcă oricând.</p>
                         </div>

                         <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div class="bg-[#111] border border-gray-800 p-6 rounded-2xl hover:border-purple-500/50 transition-all group opacity-0 translate-y-10" #anim>
                               <div class="flex justify-between items-start mb-4">
                                  <h4 class="text-lg font-bold text-white">Pachet Starter</h4>
                                  <span class="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded font-bold">ONE-TIME</span>
                               </div>
                               <div class="flex items-baseline gap-1 mb-6">
                                  <span class="text-3xl font-bold text-white">40</span>
                                  <span class="text-gray-500 text-sm">RON</span>
                               </div>
                               <div class="flex items-center gap-2 text-gray-400 text-sm mb-6">
                                  <span class="text-purple-500">⚡</span> 40 Credite AI
                               </div>
                               <button (click)="enterApp()" class="w-full py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm font-bold group-hover:bg-purple-600 group-hover:border-purple-600 transition-all">Cumpără Acum</button>
                            </div>

                            <div class="bg-[#111] border border-gray-800 p-6 rounded-2xl hover:border-purple-500/50 transition-all group opacity-0 translate-y-10 delay-100" #anim>
                               <div class="flex justify-between items-start mb-4">
                                  <h4 class="text-lg font-bold text-white">Pachet Advanced</h4>
                                  <span class="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded font-bold">ONE-TIME</span>
                               </div>
                               <div class="flex items-baseline gap-1 mb-6">
                                  <span class="text-3xl font-bold text-white">70</span>
                                  <span class="text-gray-500 text-sm">RON</span>
                               </div>
                               <div class="flex items-center gap-2 text-gray-400 text-sm mb-6">
                                  <span class="text-purple-500">⚡</span> 70 Credite AI
                               </div>
                               <button (click)="enterApp()" class="w-full py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm font-bold group-hover:bg-purple-600 group-hover:border-purple-600 transition-all">Cumpără Acum</button>
                            </div>

                            <div class="bg-[#111] border border-gray-800 p-6 rounded-2xl hover:border-purple-500/50 transition-all group opacity-0 translate-y-10 delay-200" #anim>
                               <div class="flex justify-between items-start mb-4">
                                  <h4 class="text-lg font-bold text-white">Pachet Pro</h4>
                                  <span class="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded font-bold">ONE-TIME</span>
                               </div>
                               <div class="flex items-baseline gap-1 mb-6">
                                  <span class="text-3xl font-bold text-white">90</span>
                                  <span class="text-gray-500 text-sm">RON</span>
                                </div>
                               <div class="flex items-center gap-2 text-gray-400 text-sm mb-6">
                                  <span class="text-purple-500">⚡</span> 90 Credite AI
                               </div>
                               <button (click)="enterApp()" class="w-full py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm font-bold group-hover:bg-purple-600 group-hover:border-purple-600 transition-all">Cumpără Acum</button>
                            </div>
                         </div>

                         <!-- CREDIT CONSUMPTION NOTE -->
                         <div class="mt-16 bg-white/5 border border-white/10 rounded-2xl p-8 opacity-0 translate-y-10 transition-all duration-1000" #anim>
                            <div class="flex flex-col md:flex-row gap-8 items-center">
                               <div class="shrink-0 w-16 h-16 bg-jurist-orange/20 rounded-full flex items-center justify-center text-jurist-orange">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-8 h-8"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                               </div>
                               <div class="flex-1">
                                  <h4 class="text-xl font-bold text-white mb-2">Cum sunt consumate creditele AI?</h4>
                                  <p class="text-gray-400 text-sm leading-relaxed mb-4">Creditele reprezintă unitatea de măsură pentru puterea de procesare a modelelor noastre AI. Consumul variază în funcție de complexitatea sarcinii:</p>
                                  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                                     <div class="bg-black/40 p-3 rounded-lg border border-white/5">
                                        <span class="text-jurist-orange font-bold block">3 Credite</span>
                                        <span class="text-[10px] text-gray-500 uppercase">Chat / Redactare</span>
                                     </div>
                                     <div class="bg-black/40 p-3 rounded-lg border border-white/5">
                                        <span class="text-jurist-orange font-bold block">5 Credite</span>
                                        <span class="text-[10px] text-gray-500 uppercase">Strategie / Audit</span>
                                     </div>
                                     <div class="bg-black/40 p-3 rounded-lg border border-white/5">
                                        <span class="text-jurist-orange font-bold block">2 Credite</span>
                                        <span class="text-[10px] text-gray-500 uppercase">Calcul Taxe</span>
                                     </div>
                                     <div class="bg-black/40 p-3 rounded-lg border border-white/5">
                                        <span class="text-jurist-orange font-bold block">5 Credite</span>
                                        <span class="text-[10px] text-gray-500 uppercase">Generare Imagini</span>
                                     </div>
                                  </div>
                               </div>
                            </div>
                         </div>
                      </div>
                   </div>
                </section>

                <!-- FAQ SECTION -->
                <section id="faq" class="py-32 bg-[#050505] border-t border-gray-900">
                   <div class="max-w-4xl mx-auto px-6">
                      <div class="text-center mb-20 opacity-0 translate-y-10 transition-all duration-700" #anim>
                         <h2 class="text-4xl md:text-5xl font-bold text-white mb-6">Întrebări Frecvente</h2>
                         <p class="text-gray-400">Tot ce trebuie să știi despre JuristPRO și cum îți poate transforma activitatea.</p>
                      </div>

                      <div class="space-y-4">
                         <!-- Q1 -->
                         <div class="bg-[#111] border border-gray-800 rounded-2xl overflow-hidden transition-all opacity-0 translate-y-10" #anim>
                            <button (click)="activeFaq.set(activeFaq() === 1 ? null : 1)" class="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-white/5 transition-colors">
                               <span class="text-lg font-bold text-white">Cum funcționează pachetele Top-Up?</span>
                               <span class="text-jurist-orange text-2xl transition-transform duration-300" [class.rotate-45]="activeFaq() === 1">+</span>
                            </button>
                            <div [class.max-h-0]="activeFaq() !== 1" [class.max-h-96]="activeFaq() === 1" class="overflow-hidden transition-all duration-500 ease-in-out">
                               <div class="px-8 pb-8 text-gray-400 leading-relaxed">
                                  Pachetele Top-Up intervin atunci când se termină creditele incluse în abonamentul tău lunar și dorești să continui lucrul până la reînnoirea pachetului standard. Întotdeauna vor fi cheltuite mai întâi creditele din pachetul standard, iar apoi cele din Top-Up. Astfel, creditele Top-Up au o durată de viață mai mare, rămânând disponibile până la lichidarea lor completă.
                               </div>
                            </div>
                         </div>

                         <!-- Q2 -->
                         <div class="bg-[#111] border border-gray-800 rounded-2xl overflow-hidden transition-all opacity-0 translate-y-10 delay-75" #anim>
                            <button (click)="activeFaq.set(activeFaq() === 2 ? null : 2)" class="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-white/5 transition-colors">
                               <span class="text-lg font-bold text-white">Este inteligența artificială actualizată cu legislația din România?</span>
                               <span class="text-jurist-orange text-2xl transition-transform duration-300" [class.rotate-45]="activeFaq() === 2">+</span>
                            </button>
                            <div [class.max-h-0]="activeFaq() !== 2" [class.max-h-96]="activeFaq() === 2" class="overflow-hidden transition-all duration-500 ease-in-out">
                               <div class="px-8 pb-8 text-gray-400 leading-relaxed">
                                  Da, JuristPRO este conectat la baze de date legislative actualizate în timp real. Modelele noastre sunt antrenate specific pe legislația românească (Codul Civil, Codul de Procedură Civilă, Codul Penal etc.) și pe jurisprudența instanțelor naționale și europene.
                               </div>
                            </div>
                         </div>

                         <!-- Q3 -->
                         <div class="bg-[#111] border border-gray-800 rounded-2xl overflow-hidden transition-all opacity-0 translate-y-10 delay-150" #anim>
                            <button (click)="activeFaq.set(activeFaq() === 3 ? null : 3)" class="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-white/5 transition-colors">
                               <span class="text-lg font-bold text-white">Pot folosi aplicația pentru a redacta contracte complexe?</span>
                               <span class="text-jurist-orange text-2xl transition-transform duration-300" [class.rotate-45]="activeFaq() === 3">+</span>
                            </button>
                            <div [class.max-h-0]="activeFaq() !== 3" [class.max-h-96]="activeFaq() === 3" class="overflow-hidden transition-all duration-500 ease-in-out">
                               <div class="px-8 pb-8 text-gray-400 leading-relaxed">
                                  Absolut. Modulul de redactare poate genera de la simple notificări până la contracte comerciale complexe sau cereri de chemare în judecată detaliate. Totuși, recomandăm întotdeauna revizuirea finală de către un profesionist pentru a asigura adaptarea perfectă la specificul speței.
                               </div>
                            </div>
                         </div>

                         <!-- Q4 -->
                         <div class="bg-[#111] border border-gray-800 rounded-2xl overflow-hidden transition-all opacity-0 translate-y-10 delay-[225ms]" #anim>
                            <button (click)="activeFaq.set(activeFaq() === 4 ? null : 4)" class="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-white/5 transition-colors">
                               <span class="text-lg font-bold text-white">Datele mele și ale clienților sunt în siguranță?</span>
                               <span class="text-jurist-orange text-2xl transition-transform duration-300" [class.rotate-45]="activeFaq() === 4">+</span>
                            </button>
                            <div [class.max-h-0]="activeFaq() !== 4" [class.max-h-96]="activeFaq() === 4" class="overflow-hidden transition-all duration-500 ease-in-out">
                               <div class="px-8 pb-8 text-gray-400 leading-relaxed">
                                  Securitatea este prioritatea noastră. Folosim criptare de nivel bancar (AES-256), servere securizate în Uniunea Europeană și o politică strictă de "Zero Retention" – documentele tale sunt procesate efemer și nu sunt folosite pentru antrenarea modelelor AI publice.
                               </div>
                            </div>
                         </div>

                         <!-- Q5 -->
                         <div class="bg-[#111] border border-gray-800 rounded-2xl overflow-hidden transition-all opacity-0 translate-y-10 delay-300" #anim>
                            <button (click)="activeFaq.set(activeFaq() === 5 ? null : 5)" class="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-white/5 transition-colors">
                               <span class="text-lg font-bold text-white">Cum mă ajută aplicația în relația cu clienții mei?</span>
                               <span class="text-jurist-orange text-2xl transition-transform duration-300" [class.rotate-45]="activeFaq() === 5">+</span>
                            </button>
                            <div [class.max-h-0]="activeFaq() !== 5" [class.max-h-96]="activeFaq() === 5" class="overflow-hidden transition-all duration-500 ease-in-out">
                               <div class="px-8 pb-8 text-gray-400 leading-relaxed">
                                  JuristPRO îți permite să oferi răspunsuri mult mai rapide și documentate. Poți genera sinteze ale dosarelor în câteva secunde, poți calcula instant taxe și penalități, eliberând timp prețios pentru consultanță strategică și interacțiune directă cu clienții.
                               </div>
                            </div>
                         </div>

                         <!-- Q6 -->
                         <div class="bg-[#111] border border-gray-800 rounded-2xl overflow-hidden transition-all opacity-0 translate-y-10 delay-[375ms]" #anim>
                            <button (click)="activeFaq.set(activeFaq() === 6 ? null : 6)" class="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-white/5 transition-colors">
                               <span class="text-lg font-bold text-white">Există o perioadă de probă gratuită?</span>
                               <span class="text-jurist-orange text-2xl transition-transform duration-300" [class.rotate-45]="activeFaq() === 6">+</span>
                            </button>
                            <div [class.max-h-0]="activeFaq() !== 6" [class.max-h-96]="activeFaq() === 6" class="overflow-hidden transition-all duration-500 ease-in-out">
                               <div class="px-8 pb-8 text-gray-400 leading-relaxed">
                                  Da, oferim un pachet "Trial" gratuit care include 5 credite AI. Acesta îți permite să testezi toate funcționalitățile platformei – de la asistentul AI până la calculul taxelor – fără niciun cost inițial sau obligație de plată.
                               </div>
                            </div>
                         </div>
                      </div>
                   </div>
                </section>

              </div>
            }

            <!-- TERMS & PRIVACY VIEWS -->
            @case ('terms') {
               <div class="flex-1 bg-black p-8 md:p-24 min-h-screen animate-fadeIn">
                 <button (click)="setView('home')" class="text-jurist-orange mb-8 font-bold flex items-center gap-2 hover:translate-x-[-5px] transition-transform">&larr; Înapoi</button>
                 <div class="prose prose-invert prose-lg max-w-4xl mx-auto" [innerHTML]="contentTerms"></div>
               </div>
            }
            @case ('privacy') {
              <div class="flex-1 bg-black p-8 md:p-24 min-h-screen animate-fadeIn">
                 <button (click)="setView('home')" class="text-jurist-orange mb-8 font-bold flex items-center gap-2 hover:translate-x-[-5px] transition-transform">&larr; Înapoi</button>
                 <div class="prose prose-invert prose-lg max-w-4xl mx-auto" [innerHTML]="contentPrivacy"></div>
              </div>
            }
            @case ('cookies') {
              <div class="flex-1 bg-black p-8 md:p-24 min-h-screen animate-fadeIn">
                 <button (click)="setView('home')" class="text-jurist-orange mb-8 font-bold flex items-center gap-2 hover:translate-x-[-5px] transition-transform">&larr; Înapoi</button>
                 <div class="prose prose-invert prose-lg max-w-4xl mx-auto" [innerHTML]="contentCookies"></div>
              </div>
            }
            @case ('guide') {
              <div class="flex-1 bg-black p-8 md:p-24 min-h-screen animate-fadeIn">
                 <button (click)="setView('home')" class="text-jurist-orange mb-8 font-bold flex items-center gap-2 hover:translate-x-[-5px] transition-transform">&larr; Înapoi</button>
                 <div class="prose prose-invert prose-lg max-w-4xl mx-auto" [innerHTML]="contentGuide"></div>
              </div>
            }
          }

          <!-- FOOTER -->
          <footer class="w-full bg-black border-t border-gray-900 py-16">
              <div class="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 text-sm">
                  <div class="space-y-4">
                     <h4 class="font-bold text-white text-lg">JuristPRO</h4>
                     <p class="text-gray-500">Platformă avansată de AI Legal din România.</p>
                     <p class="text-gray-600">Craiova</p>
                  </div>
                  
                  <div class="space-y-4">
                     <h4 class="font-bold text-white">Produs</h4>
                     <div class="flex flex-col gap-2 text-gray-500">
                        <button (click)="scrollTo('features')" class="text-left hover:text-jurist-orange">Facilități</button>
                        <button (click)="scrollTo('pricing')" class="text-left hover:text-jurist-orange">Prețuri</button>
                        <button (click)="scrollTo('faq')" class="text-left hover:text-jurist-orange">FAQ</button>
                        <button (click)="setView('guide')" class="text-left hover:text-jurist-orange">Ghid de utilizare</button>
                        <button (click)="enterApp()" class="text-left hover:text-jurist-orange">Demo</button>
                     </div>
                  </div>

                  <div class="space-y-4">
                     <h4 class="font-bold text-white">Legal</h4>
                     <div class="flex flex-col gap-2 text-gray-500">
                        <button (click)="setView('terms')" class="text-left hover:text-jurist-orange">Termeni & Condiții</button>
                        <button (click)="setView('privacy')" class="text-left hover:text-jurist-orange">GDPR</button>
                        <button (click)="setView('cookies')" class="text-left hover:text-jurist-orange">Cookies</button>
                     </div>
                  </div>

                  <div class="space-y-4">
                     <h4 class="font-bold text-white">Contact</h4>
                     <button (click)="showContactModal.set(true)" class="text-gray-500 hover:text-jurist-orange transition-colors text-left">office@juridicpro.ro</button>
                  </div>
              </div>
              <div class="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-gray-900 text-center text-gray-600 text-xs">
                 &copy; 2026 JuristPRO. Strada Infratirii, Nr. 15, Craiova, Romania. All rights reserved.
              </div>
          </footer>
      
      <!-- COOKIE BANNER -->
      @if (showCookieBanner) {
         <div class="fixed bottom-0 left-0 w-full bg-[#111] border-t border-gray-800 p-6 z-[100] animate-slideUp">
            <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
               <div class="flex-1">
                  <h4 class="text-white font-bold mb-1">Politica de Cookie-uri</h4>
                  <p class="text-sm text-gray-400">Folosim cookie-uri pentru a îmbunătăți experiența de navigare și securitatea platformei.</p>
               </div>
               <button (click)="acceptCookies()" class="bg-jurist-orange hover:bg-amber-500 text-white px-8 py-3 rounded-lg font-bold transition-all shadow-lg">Accept</button>
            </div>
         </div>
      }

      <!-- CONTACT MODAL -->
      @if (showContactModal()) {
         <div class="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <!-- Backdrop -->
            <div class="absolute inset-0 bg-black/60 backdrop-blur-md" (click)="showContactModal.set(false)" (keydown.enter)="showContactModal.set(false)" tabindex="0" role="button"></div>
            
            <!-- Modal Content (Contrasting Light/Glassmorphic UI) -->
            <div class="relative w-full max-w-lg bg-white/90 backdrop-blur-2xl rounded-3xl shadow-[0_0_50px_rgba(255,255,255,0.1)] border border-white/20 overflow-hidden animate-slideUp">
               <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
               
               <div class="p-8">
                  <div class="flex justify-between items-start mb-6">
                     <div>
                        <h3 class="text-3xl font-black text-gray-900 tracking-tight">Contactează-ne</h3>
                        <p class="text-gray-500 mt-1">Suntem aici să te ajutăm să îți transformi cabinetul.</p>
                     </div>
                     <button (click)="showContactModal.set(false)" class="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                           <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                     </button>
                  </div>

                  @if (contactSuccess()) {
                     <div class="flex flex-col items-center justify-center py-10 text-center animate-fadeIn">
                        <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-10 h-10 text-green-600">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                           </svg>
                        </div>
                        <h4 class="text-2xl font-bold text-gray-900 mb-2">Mesaj trimis cu succes!</h4>
                        <p class="text-gray-500">Îți mulțumim pentru interes. Te vom contacta în cel mai scurt timp posibil.</p>
                     </div>
                  } @else {
                     <form (ngSubmit)="submitContactForm()" class="space-y-5">
                        <div>
                           <label for="contact-name" class="block text-sm font-bold text-gray-700 mb-1">Nume complet</label>
                           <input id="contact-name" type="text" [(ngModel)]="contactForm.name" name="name" required
                                  class="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all shadow-sm"
                                  placeholder="ex: Ion Popescu">
                        </div>
                        
                        <div>
                           <label for="contact-email" class="block text-sm font-bold text-gray-700 mb-1">Adresă de e-mail</label>
                           <input id="contact-email" type="email" [(ngModel)]="contactForm.email" name="email" required
                                  class="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all shadow-sm"
                                  placeholder="ex: ion@cabinet.ro">
                        </div>

                        <div>
                           <label for="contact-message" class="block text-sm font-bold text-gray-700 mb-1">Mesajul tău</label>
                           <textarea id="contact-message" [(ngModel)]="contactForm.message" name="message" required rows="4"
                                     class="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all shadow-sm resize-none"
                                     placeholder="Cu ce te putem ajuta?"></textarea>
                        </div>

                        <button type="submit" [disabled]="isSubmittingContact()"
                                class="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2">
                           @if (isSubmittingContact()) {
                              <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                 <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                 <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Se trimite...
                           } @else {
                              Trimite Mesajul
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                                 <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                              </svg>
                           }
                        </button>
                     </form>
                  }
               </div>
            </div>
         </div>
      }
    </div>
  `
})
export class LandingComponent implements OnInit, AfterViewInit {
  juristService = inject(JuristService);
  currentView = signal<LandingView>('home');
  activeDemoTab = signal<string>('assistant');
  activeFaq = signal<number | null>(null);
  showCookieBanner = false;
  showContactModal = signal(false);
  isSubmittingContact = signal(false);
  contactSuccess = signal(false);
  contactForm = { name: '', email: '', message: '' };
  mobileMenuOpen = signal(false);

  @ViewChildren('anim') animElements!: QueryList<ElementRef>;
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  constructor() {
    effect(() => {
      // Access the signal to track it
      this.currentView();
      // Scroll to top whenever the view changes
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          if (this.scrollContainer) {
             this.scrollContainer.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
             window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }, 50);
      }
    });
  }

  contentTerms = `
    <div class="space-y-12">
      <section>
        <h1 class='text-5xl font-black text-white mb-8 tracking-tight'>Termeni și Condiții de Utilizare</h1>
        <p class='text-gray-400 text-lg leading-relaxed mb-6 italic'>Ultima actualizare: 24.04.2026</p>
        <p class='text-gray-300 text-lg leading-relaxed'>Bine ați venit pe JuristPRO. Accesarea și utilizarea acestei platforme de inteligență artificială juridică sunt guvernate de prezentul set de reguli. Prin utilizarea serviciilor noastre, confirmați că ați citit, înțeles și acceptat acești termeni în totalitate.</p>
      </section>

      <section class="space-y-6">
        <h2 class="text-2xl font-bold text-white border-l-4 border-jurist-orange pl-4">0. Identificarea Autorului</h2>
        <p class="text-gray-400 leading-relaxed">JuristPRO este denumirea comercială (aliasul comercial) a lui Catalin MI SANDU, un contractor independent înregistrat în Romania, (ID 54552543), cu adresa: Strada Infratirii, Nr. 15, Craiova, Romania. În acești Termeni, ne vom referi la noi înșine ca „JuristPRO” sau „noi”. Ne puteți contacta la adresa de e-mail: office@juridicpro.ro.</p>
      </section>

      <section class="space-y-6">
        <h2 class="text-2xl font-bold text-white border-l-4 border-jurist-orange pl-4">1. Definiții și Obiectul Contractului</h2>
        <p class="text-gray-400 leading-relaxed">JuristPRO reprezintă o platformă software bazată pe modele avansate de procesare a limbajului natural, destinată exclusiv profesioniștilor din domeniul juridic (avocați, consilieri juridici, notari, executori). Obiectul contractului este furnizarea accesului la instrumente de analiză, redactare și cercetare juridică asistată de AI.</p>
      </section>

      <section class="space-y-6">
        <h2 class="text-2xl font-bold text-white border-l-4 border-jurist-orange pl-4">2. Natura Serviciului (Disclaimer Legal)</h2>
        <div class="bg-jurist-orange/5 border border-jurist-orange/20 p-6 rounded-xl">
          <p class="text-jurist-orange font-bold mb-2">IMPORTANT:</p>
          <p class="text-gray-300 leading-relaxed italic">JuristPRO NU este o casă de avocatură și NU oferă consultanță juridică în sensul Legii 51/1995. Rezultatele generate de Inteligența Artificială au caracter informativ și reprezintă un instrument de suport. Utilizatorul are obligația profesională și legală de a verifica, valida și asuma orice document sau opinie generată de platformă înainte de utilizarea acestora în relația cu clienții sau instanțele de judecată.</p>
        </div>
      </section>

      <section class="space-y-6">
        <h2 class="text-2xl font-bold text-white border-l-4 border-jurist-orange pl-4">3. Utilizarea Contului și Securitatea</h2>
        <p class="text-gray-400 leading-relaxed">Utilizatorul este responsabil pentru menținerea confidențialității datelor de acces. Este strict interzisă partajarea contului cu terțe persoane. Orice utilizare abuzivă sau suspiciune de compromitere a contului trebuie raportată imediat echipei de suport.</p>
      </section>

      <section class="space-y-6">
        <h2 class="text-2xl font-bold text-white border-l-4 border-jurist-orange pl-4">4. Proprietate Intelectuală</h2>
        <p class="text-gray-400 leading-relaxed">Interfața, algoritmii proprietari, bazele de date și elementele de design sunt proprietatea exclusivă a JuristPRO AI. Utilizatorul deține drepturile de autor asupra documentelor finale redactate prin intermediul platformei, putând să le utilizeze liber în activitatea sa profesională.</p>
      </section>

      <section class="space-y-6">
        <h2 class="text-2xl font-bold text-white border-l-4 border-jurist-orange pl-4">5. Limitarea Răspunderii</h2>
        <p class="text-gray-400 leading-relaxed">JuristPRO nu poate fi trasă la răspundere pentru erori juridice, omisiuni sau interpretări greșite ale AI-ului care ar putea conduce la pierderea unor procese sau alte prejudicii. Responsabilitatea finală asupra calității actului juridic aparține exclusiv profesionistului care utilizează platforma.</p>
      </section>

      <section class="space-y-6">
        <h2 class="text-2xl font-bold text-white border-l-4 border-jurist-orange pl-4">6. Modificări și Reziliere</h2>
        <p class="text-gray-400 leading-relaxed">Ne rezervăm dreptul de a actualiza acești termeni periodic. Utilizarea continuă a platformei după publicarea modificărilor constituie acceptarea acestora. Neplata abonamentului atrage suspendarea automată a accesului la funcțiile premium.</p>
      </section>
    </div>
  `;
  contentPrivacy = `
    <div class="space-y-12">
      <section>
        <h1 class='text-5xl font-black text-white mb-8 tracking-tight'>Politica de Confidențialitate (GDPR)</h1>
        <p class='text-gray-400 text-lg leading-relaxed mb-6 italic'>Versiunea 2.1 | Conformă cu Regulamentul (UE) 2016/679</p>
        <p class='text-gray-300 text-lg leading-relaxed'>Protecția datelor cu caracter personal și a secretului profesional sunt priorități absolute pentru JuristPRO. Această politică explică modul în care colectăm, utilizăm și protejăm informațiile dvs.</p>
      </section>

      <section class="space-y-6">
        <h2 class="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">1. Operatorul de Date</h2>
        <p class="text-gray-400 leading-relaxed">În conformitate cu Regulamentul (UE) 2016/679 (GDPR), operatorul datelor cu caracter personal colectate prin intermediul platformei JuristPRO este entitatea care gestionează serviciul, cu sediul social în Craiova, Strada Infratirii, Nr. 15, România. JuristPRO își asumă responsabilitatea pentru prelucrarea sigură a datelor dvs. și pentru respectarea drepturilor utilizatorilor. Pentru orice întrebări, solicitări sau exercitarea drepturilor prevăzute de legislația în vigoare, ne puteți contacta prin intermediul responsabilului nostru cu protecția datelor (DPO) la adresa de e-mail: <span class="text-blue-400">office@juridicpro.ro</span>.</p>
      </section>

      <section class="space-y-6">
        <h2 class="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">2. Date Colectate și Scopul Prelucrării</h2>
        <ul class="space-y-4 text-gray-400">
          <li class="flex gap-3"><span class="text-blue-500 font-bold">●</span> <strong>Date de Identificare:</strong> Nume, prenume, e-mail, număr de telefon (pentru crearea contului și facturare).</li>
          <li class="flex gap-3"><span class="text-blue-500 font-bold">●</span> <strong>Date Profesionale:</strong> Baroul de apartenență, număr de legitimație (pentru validarea calității de profesionist).</li>
          <li class="flex gap-3"><span class="text-blue-500 font-bold">●</span> <strong>Date de Utilizare:</strong> Adresa IP, log-uri de sistem (pentru securitate și prevenirea fraudelor).</li>
        </ul>
      </section>

      <section class="space-y-6">
        <h2 class="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">3. Procesarea Documentelor și Confidențialitatea AI</h2>
        <div class="bg-blue-500/5 border border-blue-500/20 p-6 rounded-xl">
          <p class="text-gray-300 leading-relaxed">Documentele încărcate pentru analiză sau redactare sunt procesate într-un mediu securizat și efemer. <strong>JuristPRO NU utilizează datele din documentele dvs. pentru a antrena modelele AI publice.</strong> Datele sunt șterse automat din memoria de procesare imediat după finalizarea sarcinii solicitate.</p>
        </div>
      </section>

      <section class="space-y-6">
        <h2 class="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">4. Drepturile Dumneavoastră</h2>
        <p class="text-gray-400 leading-relaxed mb-4">Conform GDPR, beneficiați de următoarele drepturi:</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-[#111] p-4 rounded-lg border border-gray-800"><span class="text-white font-bold block mb-1">Dreptul de Acces</span> Vizualizarea datelor pe care le deținem despre dvs.</div>
          <div class="bg-[#111] p-4 rounded-lg border border-gray-800"><span class="text-white font-bold block mb-1">Dreptul la Rectificare</span> Corectarea informațiilor inexacte.</div>
          <div class="bg-[#111] p-4 rounded-lg border border-gray-800"><span class="text-white font-bold block mb-1">Dreptul la Ștergere</span> Solicitarea eliminării definitive a contului.</div>
          <div class="bg-[#111] p-4 rounded-lg border border-gray-800"><span class="text-white font-bold block mb-1">Portabilitatea Datelor</span> Transferul datelor către un alt operator.</div>
        </div>
      </section>

      <section class="space-y-6">
        <h2 class="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">5. Securitatea Datelor</h2>
        <p class="text-gray-400 leading-relaxed">Implementăm măsuri tehnice avansate: criptare AES-256 la nivel de bază de date, autentificare multi-factor (MFA) opțională și audituri de securitate periodice.</p>
      </section>
    </div>
  `;
  contentCookies = `
    <div class="space-y-12">
      <section>
        <h1 class='text-5xl font-black text-white mb-8 tracking-tight'>Politica de Cookie-uri</h1>
        <p class='text-gray-400 text-lg leading-relaxed mb-6 italic'>Transparență totală privind navigarea dvs.</p>
        <p class='text-gray-300 text-lg leading-relaxed'>JuristPRO utilizează module cookie pentru a asigura funcționarea corectă a platformei și pentru a vă oferi o experiență personalizată și securizată.</p>
      </section>

      <section class="space-y-6">
        <h2 class="text-2xl font-bold text-white border-l-4 border-green-500 pl-4">1. Ce sunt Cookie-urile?</h2>
        <p class="text-gray-400 leading-relaxed">Cookie-urile sunt fișiere text de mici dimensiuni stocate pe dispozitivul dvs. care permit site-ului să rețină acțiunile și preferințele dvs. (cum ar fi login-ul, limba, dimensiunea fontului) pe o perioadă de timp.</p>
      </section>

      <section class="space-y-6">
        <h2 class="text-2xl font-bold text-white border-l-4 border-green-500 pl-4">2. Tipuri de Cookie-uri Utilizate</h2>
        <div class="space-y-4">
          <div class="bg-[#111] p-6 rounded-xl border border-gray-800">
            <h3 class="text-white font-bold mb-2 flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-green-500"></span> Cookie-uri Strict Necesare</h3>
            <p class="text-gray-400 text-sm">Esențiale pentru autentificare și securitate. Fără acestea, platforma nu poate funcționa. Nu pot fi dezactivate.</p>
          </div>
          <div class="bg-[#111] p-6 rounded-xl border border-gray-800">
            <h3 class="text-white font-bold mb-2 flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-blue-500"></span> Cookie-uri de Performanță</h3>
            <p class="text-gray-400 text-sm">Ne ajută să înțelegem cum interacționează vizitatorii cu site-ul, colectând informații anonime despre paginile vizitate și erorile întâlnite.</p>
          </div>
          <div class="bg-[#111] p-6 rounded-xl border border-gray-800">
            <h3 class="text-white font-bold mb-2 flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-purple-500"></span> Cookie-uri de Funcționalitate</h3>
            <p class="text-gray-400 text-sm">Rețin preferințele dvs. (de exemplu, tema dark/light sau limba interfeței) pentru a vă oferi o experiență fluidă.</p>
          </div>
        </div>
      </section>

      <section class="space-y-6">
        <h2 class="text-2xl font-bold text-white border-l-4 border-green-500 pl-4">3. Cum puteți controla Cookie-urile?</h2>
        <p class="text-gray-400 leading-relaxed">Puteți controla și/sau șterge cookie-urile după cum doriți direct din setările browserului dvs. (Chrome, Firefox, Safari, Edge). Totuși, dezactivarea cookie-urilor necesare poate face platforma JuristPRO inutilizabilă.</p>
      </section>
    </div>
  `;
  contentGuide = `
    <div class="space-y-12">
      <section>
        <h1 class='text-5xl font-black text-white mb-8 tracking-tight'>Ghid de Utilizare JuristPRO</h1>
        <p class='text-gray-400 text-lg leading-relaxed mb-6'>Transformați-vă cabinetul într-o forță digitală. Iată cum să profitați la maximum de platformă.</p>
      </section>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section class="bg-[#111] p-8 rounded-2xl border border-gray-800">
          <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-3">
            <span class="w-8 h-8 rounded-lg bg-jurist-orange text-black flex items-center justify-center text-sm">1</span>
            Asistentul AI
          </h2>
          <p class="text-gray-400 text-sm leading-relaxed">Utilizați chat-ul pentru întrebări punctuale. Puteți cere sinteze legislative, interpretări ale unor articole din Codul Civil sau Procedură, sau chiar strategii de atac pentru o speță descrisă pe scurt.</p>
        </section>

        <section class="bg-[#111] p-8 rounded-2xl border border-gray-800">
          <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-3">
            <span class="w-8 h-8 rounded-lg bg-jurist-orange text-black flex items-center justify-center text-sm">2</span>
            Redactare Documente
          </h2>
          <p class="text-gray-400 text-sm leading-relaxed">Selectați tipul de document dorit din modulul "Redactare". Introduceți datele esențiale (părți, obiect, situație de fapt) și lăsați AI-ul să genereze structura juridică. Exportați rezultatul în format Word pentru finisare.</p>
        </section>

        <section class="bg-[#111] p-8 rounded-2xl border border-gray-800">
          <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-3">
            <span class="w-8 h-8 rounded-lg bg-jurist-orange text-black flex items-center justify-center text-sm">3</span>
            Calcul Taxe
          </h2>
          <p class="text-gray-400 text-sm leading-relaxed">Nu mai pierdeți timpul cu tabele complexe. Modulul de taxe calculează automat taxele de timbru conform OUG 80/2013, dobânzile legale și penalitățile, oferindu-vă și temeiul legal pentru cererea de chemare în judecată.</p>
        </section>

        <section class="bg-[#111] p-8 rounded-2xl border border-gray-800">
          <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-3">
            <span class="w-8 h-8 rounded-lg bg-jurist-orange text-black flex items-center justify-center text-sm">4</span>
            Management Credite
          </h2>
          <p class="text-gray-400 text-sm leading-relaxed">Fiecare interacțiune complexă consumă credite. Puteți monitoriza consumul în timp real din Dashboard și puteți reîncărca pachete de credite direct din secțiunea "Plăți" dacă aveți nevoie de volum suplimentar.</p>
        </section>

        <section class="bg-[#111] p-8 rounded-2xl border border-gray-800 md:col-span-2">
          <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-3">
            <span class="w-8 h-8 rounded-lg bg-jurist-orange text-black flex items-center justify-center text-sm">5</span>
            Strategie de Litigiu 360°
          </h2>
          <p class="text-gray-400 text-sm leading-relaxed">Cel mai puternic instrument al platformei. Introduceți speța și lăsați AI-ul să genereze o analiză completă: Analiză SWOT (Puncte tari/slabe), Scenarii Ofensive, Scenarii Defensive, Opțiuni de Soluționare Amiabilă și Recomandări clare pentru primii pași.</p>
        </section>
      </div>

      <div class="bg-jurist-orange/10 border border-jurist-orange/30 p-8 rounded-2xl text-center">
        <h3 class="text-white font-bold mb-2">Aveți nevoie de ajutor suplimentar?</h3>
        <p class="text-gray-400 text-sm mb-6">Echipa noastră de suport tehnic este disponibilă Luni-Vineri, 09:00 - 18:00.</p>
        <button class="bg-jurist-orange text-white px-8 py-3 rounded-lg font-bold hover:bg-amber-500 transition-all">Contactează Suportul</button>
      </div>
    </div>
  `;

  ngOnInit() {
     const consent = localStorage.getItem('juristpro_consent');
     if (!consent) this.showCookieBanner = true;
  }

  ngAfterViewInit() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.remove('opacity-0', 'translate-y-10', 'scale-95', '-translate-x-10', 'translate-x-10');
          entry.target.classList.add('opacity-100', 'translate-y-0', 'scale-100', 'translate-x-0');
        }
      });
    }, { threshold: 0.1 });

    this.animElements.forEach(el => observer.observe(el.nativeElement));
    
    // Re-attach observer when view changes
    this.animElements.changes.subscribe(list => {
       list.forEach((el: ElementRef) => observer.observe(el.nativeElement));
    });
  }

  acceptCookies() {
     localStorage.setItem('juristpro_consent', 'true');
     this.showCookieBanner = false;
  }

  enterApp() {
    this.juristService.setModule('auth');
  }

  setView(view: LandingView) {
    this.currentView.set(view);
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        if (this.scrollContainer) {
          this.scrollContainer.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 50);
    }
  }

  scrollTo(id: string) {
    if (this.currentView() !== 'home') {
      this.setView('home');
      setTimeout(() => this.doScroll(id), 100);
    } else {
      this.doScroll(id);
    }
  }

  doScroll(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  async submitContactForm() {
    if (!this.contactForm.name || !this.contactForm.email || !this.contactForm.message) {
      alert('Vă rugăm să completați toate câmpurile.');
      return;
    }
    
    this.isSubmittingContact.set(true);
    
    try {
      // Save to Firestore directly from the client
      await addDoc(collection(db, 'contact_messages'), {
        name: this.contactForm.name,
        email: this.contactForm.email,
        message: this.contactForm.message,
        to: 'office@juridicpro.ro',
        created_at: new Date().toISOString(),
        status: 'unread'
      });

      // Send email via backend
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(this.contactForm)
      });
      
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error('Server returned non-JSON response:', text);
        throw new Error(`Eroare server (${response.status}): Te rugăm să te asiguri că ai făcut deploy la ultima versiune a codului.`);
      }
      
      if (data.success) {
        this.contactSuccess.set(true);
        this.contactForm = { name: '', email: '', message: '' };
        
        // Close modal after 3 seconds
        setTimeout(() => {
          this.showContactModal.set(false);
          this.contactSuccess.set(false);
        }, 3000);
      } else {
        alert(data.error || 'A apărut o eroare la trimiterea mesajului.');
      }
    } catch (error: unknown) {
      console.error('Eroare la trimiterea formularului:', error);
      alert(error instanceof Error ? error.message : 'A apărut o eroare la conectarea cu serverul.');
    } finally {
      this.isSubmittingContact.set(false);
    }
  }
}