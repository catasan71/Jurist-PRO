import 'dotenv/config';
import * as dotenv from 'dotenv';
dotenv.config({ path: '/.env' });

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

// Configurare
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

console.log("DEBUG: All env vars:", Object.keys(process.env));
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Date de probă (Articole din Codul Civil)
const sampleArticles = [
  {
    number: "Art. 1",
    content: "Codul civil reglementează raporturile patrimoniale și nepatrimoniale dintre persoane, ca subiecte ale dreptului civil."
  },
  {
    number: "Art. 2",
    content: "Dispozițiile prezentului cod se aplică și în alte domenii reglementate de legi speciale, în măsura în care acestea nu cuprind dispoziții contrare."
  }
];

async function ingestDemo() {
  console.log("Începem ingestia demo în Firestore...");

  // 1. Inserăm sursa (Codul Civil)
  const sourceRef = await addDoc(collection(db, 'legal_sources'), { 
    title: 'Codul Civil', 
    description: 'Codul Civil al României' 
  });

  for (const article of sampleArticles) {
    // 2. Inserăm articolul
    const articleRef = await addDoc(collection(db, 'legal_articles'), { 
      source_id: sourceRef.id, 
      article_number: article.number, 
      content: article.content 
    });

    // 3. Generăm embedding-ul (Sărit peste, cheia API nu este disponibilă)
    const embedding = [0.1, 0.2, 0.3]; // Placeholder

    // 4. Inserăm vectorul (Firestore nu suportă vectori direct, îi salvăm ca array)
    await addDoc(collection(db, 'legal_embeddings'), {
      article_id: articleRef.id,
      content: article.content,
      embedding: embedding,
    });
    
    console.log(`Ingerat: ${article.number}`);
  }
  console.log("Ingestia demo finalizată cu succes!");
}

ingestDemo().catch(console.error);
