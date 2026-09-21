const fs = require('fs');
require('dotenv').config();

console.log('Building environment.ts...');
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
console.log('Detected API Key (first 5 chars):', apiKey.substring(0, 5) + '...');

const targetPath = './src/environments/environment.ts';
const envConfigFile = `export const environment = {
  production: true,
  geminiApiKey: '${apiKey}',
};
`;

fs.mkdirSync('./src/environments', { recursive: true });
fs.writeFileSync(targetPath, envConfigFile);
console.log(`Output generated at ${targetPath}`);
