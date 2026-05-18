import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
ai.models.generateContent({
  model: 'gemini-3-flash-preview',
  contents: 'hello'
}).then(res => console.log(Object.keys(res)));
