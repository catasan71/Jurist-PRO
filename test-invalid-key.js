const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: "MY_GEMINI_API_KEY" });
ai.models.generateContent({
  model: 'gemini-3-flash-preview',
  contents: 'hello'
}).then(res => console.log('SUCCESS:', res.text)).catch(err => console.error('ERROR:', err));
