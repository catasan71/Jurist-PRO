import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

@Pipe({
  name: 'markdown',
  standalone: true
})
export class MarkdownPipe implements PipeTransform {
  private sanitizer = inject(DomSanitizer);

  private extractTextContent(value: string): string {
    let text = value.trim();
    if (text.startsWith('```json')) {
      text = text.substring(7).trim();
    } else if (text.startsWith('```')) {
      text = text.substring(3).trim();
    }
    if (text.endsWith('```')) {
      text = text.substring(0, text.length - 3).trim();
    }

    if (!text.startsWith('{')) {
      return value;
    }

    // Try full JSON parse first
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') {
        const keys = ['analiza_juridica', 'analiza', 'raspuns', 'content', 'text', 'strategie_juridica', 'strategie', 'draft', 'document', 'rezultat'];
        for (const key of keys) {
          if (typeof parsed[key] === 'string' && parsed[key].trim().length > 0) {
            return parsed[key];
          }
        }
        for (const key of Object.keys(parsed)) {
          if (typeof parsed[key] === 'string' && parsed[key].trim().length > 0) {
            return parsed[key];
          }
        }
      }
    } catch {
      // If it's a partial JSON string being streamed (e.g. starting with { and not closed yet)
      // We will extract via regex
      const match = text.match(/"(?:analiza_juridica|analiza|raspuns|content|text|strategie_juridica|strategie|draft|document|rezultat)"\s*:\s*"(.*)/s);
      if (match && match[1]) {
        let extracted = match[1];
        if (extracted.endsWith('"}')) {
          extracted = extracted.slice(0, -2);
        } else if (extracted.endsWith('"} ')) {
          extracted = extracted.slice(0, -3);
        } else if (extracted.endsWith('"')) {
          extracted = extracted.slice(0, -1);
        }
        
        try {
          let jsonString = extracted;
          if (!jsonString.endsWith('"') || jsonString.endsWith('\\"')) {
            jsonString += '"';
          }
          if (!jsonString.startsWith('"')) {
            jsonString = '"' + jsonString;
          }
          return JSON.parse(jsonString);
        } catch {
          // Fallback manual unescape
          return extracted
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\t/g, '\t')
            .replace(/\\\\/g, '\\');
        }
      } else {
        // General fallback for any key
        const generalMatch = text.match(/"[^"]+"\s*:\s*"(.*)/s);
        if (generalMatch && generalMatch[1]) {
          let extracted = generalMatch[1];
          if (extracted.endsWith('"}')) {
            extracted = extracted.slice(0, -2);
          } else if (extracted.endsWith('"')) {
            extracted = extracted.slice(0, -1);
          }
          try {
            let jsonString = extracted;
            if (!jsonString.endsWith('"') || jsonString.endsWith('\\"')) {
              jsonString += '"';
            }
            if (!jsonString.startsWith('"')) {
              jsonString = '"' + jsonString;
            }
            return JSON.parse(jsonString);
          } catch {
            return extracted
              .replace(/\\n/g, '\n')
              .replace(/\\"/g, '"')
              .replace(/\\t/g, '\t')
              .replace(/\\\\/g, '\\');
          }
        }
      }
    }
    return value;
  }

  transform(value: string | undefined, theme: 'dark' | 'light' = 'dark'): SafeHtml | string {
    if (!value) return '';
    try {
      const cleanValue = this.extractTextContent(value);
      const parsedHtml = marked.parse(cleanValue, {
        async: false,
        breaks: true,
        gfm: true,
      }) as string;

      let styledHtml = parsedHtml;

      if (theme === 'dark') {
        styledHtml = styledHtml
          .replace(/<a /g, '<a class="text-blue-400 hover:text-jurist-orange underline" target="_blank" ')
          .replace(/<pre>/g, '<pre class="bg-gray-900 border border-gray-700 p-4 rounded-lg my-4 overflow-x-auto text-sm text-gray-300">')
          .replace(/<code>/g, '<code class="bg-gray-800 text-jurist-orange px-1.5 py-0.5 rounded text-sm font-mono">')
          .replace(/<table>/g, '<div class="overflow-x-auto my-4"><table class="w-full text-left border-collapse border border-gray-700">')
          .replace(/<th>/g, '<th class="bg-gray-800 p-3 border border-gray-700 font-bold text-gray-200">')
          .replace(/<td>/g, '<td class="p-3 border border-gray-700 text-gray-300">')
          .replace(/<h1([^>]*)>/gi, '<h1 class="text-2xl font-extrabold text-jurist-orange mt-8 mb-4 border-b-2 border-jurist-orange/30 pb-2 tracking-tight" $1>')
          .replace(/<h2([^>]*)>/gi, '<h2 class="text-xl font-bold text-jurist-orange border-b border-gray-800 mt-6 pb-2 mb-4 tracking-tight" $1>')
          .replace(/<h3([^>]*)>/gi, '<h3 class="text-lg font-bold text-jurist-orange mt-5 mb-3 tracking-tight" $1>')
          .replace(/<h4([^>]*)>/gi, '<h4 class="text-base font-semibold text-jurist-orange mt-4 mb-2 tracking-tight" $1>')
          .replace(/<h5([^>]*)>/gi, '<h5 class="text-sm font-medium text-jurist-orange mt-3 mb-1" $1>')
          .replace(/<h6([^>]*)>/gi, '<h6 class="text-xs font-semibold text-jurist-orange uppercase tracking-wider mt-3 mb-1" $1>')
          .replace(/<ul>/g, '<ul class="list-disc pl-5 my-4 space-y-1 text-gray-300">')
          .replace(/<ol>/g, '<ol class="list-decimal pl-5 my-4 space-y-1 text-gray-300">')
          .replace(/<p>/g, '<p class="mb-2.5 text-gray-300 leading-relaxed text-justify">')
          .replace(/<strong>/g, '<strong class="text-white font-bold">')
          .replace(/<em>/g, '<em class="text-gray-400 italic">');
      } else {
        // Light mode styling
        styledHtml = styledHtml
          .replace(/<a /g, '<a class="text-blue-600 hover:text-jurist-orange underline" target="_blank" ')
          .replace(/<pre>/g, '<pre class="bg-gray-100 border border-gray-300 p-4 rounded-lg my-4 overflow-x-auto text-sm text-gray-800">')
          .replace(/<code>/g, '<code class="bg-gray-100 text-jurist-orange px-1.5 py-0.5 rounded text-sm font-mono">')
          .replace(/<table>/g, '<div class="overflow-x-auto my-4"><table class="w-full text-left border-collapse border border-gray-300">')
          .replace(/<th>/g, '<th class="bg-gray-200 p-3 border border-gray-300 font-bold text-gray-900">')
          .replace(/<td>/g, '<td class="p-3 border border-gray-300 text-gray-800">')
          .replace(/<h1([^>]*)>/gi, '<h1 class="text-2xl font-extrabold text-jurist-orange mt-8 mb-4 border-b-2 border-jurist-orange/30 pb-2 tracking-tight" $1>')
          .replace(/<h2([^>]*)>/gi, '<h2 class="text-xl font-bold text-jurist-orange border-b border-gray-300 mt-6 pb-2 mb-4 tracking-tight" $1>')
          .replace(/<h3([^>]*)>/gi, '<h3 class="text-lg font-bold text-jurist-orange mt-5 mb-3 tracking-tight" $1>')
          .replace(/<h4([^>]*)>/gi, '<h4 class="text-base font-semibold text-jurist-orange mt-4 mb-2 tracking-tight" $1>')
          .replace(/<h5([^>]*)>/gi, '<h5 class="text-sm font-medium text-jurist-orange mt-3 mb-1" $1>')
          .replace(/<h6([^>]*)>/gi, '<h6 class="text-xs font-semibold text-jurist-orange uppercase tracking-wider mt-3 mb-1" $1>')
          .replace(/<ul>/g, '<ul class="list-disc pl-5 my-4 space-y-1 text-gray-800">')
          .replace(/<ol>/g, '<ol class="list-decimal pl-5 my-4 space-y-1 text-gray-800">')
          .replace(/<p>/g, '<p class="mb-2.5 text-gray-800 leading-relaxed text-justify">')
          .replace(/<strong>/g, '<strong class="text-black font-bold">')
          .replace(/<em>/g, '<em class="text-gray-600 italic">');
      }

      const sanitizedHtml = DOMPurify.sanitize(styledHtml, {
        ADD_ATTR: ['target']
      });
      return this.sanitizer.bypassSecurityTrustHtml(sanitizedHtml);
    } catch (e) {
      console.error('Markdown parsing error', e);
      return value || '';
    }
  }
}
