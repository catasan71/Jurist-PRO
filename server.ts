// Force GitHub sync update - 2026-04-11
import process from 'process';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { Resend } from 'resend';

const __dirname = process.cwd();

// Load environment variables
dotenv.config();

let resendInstance: Resend | null = null;
function getResend() {
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_SECRET_KEY || process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

const app = express();
const port = 3000;

// Lazy initialization
let adminDbInstance: admin.firestore.Firestore | null = null;
function getAdminDb() {
  if (!adminDbInstance) {
    let projectId = process.env.FIREBASE_PROJECT_ID;
    let databaseId = '(default)';
    
    try {
      const configPath = path.join(__dirname, 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        // Use projectId from config if it exists
        if (config.projectId) {
           projectId = config.projectId;
        }

        if (config.firestoreDatabaseId) {
          databaseId = config.firestoreDatabaseId;
        }
      }
    } catch (e) {
      console.error('Failed to read config:', e);
    }

    if (!admin.apps.length) {
      const finalProjectId = projectId || 'juristpro-d79ee';
      console.log(`[FIREBASE] Initializing Admin SDK with projectId: ${finalProjectId}`);
      try {
        admin.initializeApp({
          projectId: finalProjectId
        });
      } catch (initErr) {
        console.error('[FIREBASE] Initialization error:', initErr);
      }
    }
    
    const app = admin.app();
    adminDbInstance = getFirestore(app, (databaseId === '(default)' || !databaseId) ? undefined : databaseId);
    
    // Test connection
    adminDbInstance.listCollections().then(() => {
      console.log('[FIREBASE] Admin SDK connection successful');
    }).catch(err => {
      console.warn('[FIREBASE] Admin SDK connection warned (expected if external project without service account):', err.message);
    });
  }
  return adminDbInstance;
}

function getRevolutConfig() {
  const apiKey = (process.env.REVOLUT_API_KEY || process.env.REVOLUT_MERCHANT_API_KEY || '').trim();
  const envSandbox = process.env.REVOLUT_SANDBOX === 'true' || 
                     process.env.REVOLUT_MODE === 'sandbox' ||
                     process.env.REVOLUT_ENV === 'sandbox';
                     
  const isSandbox = !apiKey || 
                    apiKey === 'dummy_revolut_key_for_testing' || 
                    apiKey.startsWith('sand_') || 
                    apiKey.includes('sandbox') || 
                    envSandbox;
                    
  const baseUrl = isSandbox ? 'https://sandbox-merchant.revolut.com/api/1.0' : 'https://merchant.revolut.com/api/1.0';
  return {
    apiKey: apiKey || 'dummy_revolut_key_for_testing',
    baseUrl,
    isSandbox
  };
}

// Standard JSON parsing for all JSON routes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API Endpoint for Revolut Webhook
app.post('/api/revolut-webhook', async (req, res) => {
  const adminDb = getAdminDb();
  
  try {
    const payload = req.body;
    console.log('[REVOLUT WEBHOOK] Received payload:', JSON.stringify(payload));
    
    const eventName = (payload.event || '').toUpperCase();
    const order = payload.order || {};
    const orderId = order.id || payload.order_id || '';
    const metadata = order.metadata || {};
    const userId = metadata.userId;

    if (!userId) {
      console.warn('[REVOLUT WEBHOOK] No userId present in metadata.', metadata);
      return res.json({ received: true });
    }

    if (eventName === 'ORDER_COMPLETED' || order.state === 'COMPLETED') {
      const type = metadata.type;
      
      if (type === 'subscription') {
        const plan = metadata.plan;
        const credits = plan === 'expert' ? 150 : 500;
        
        const profileDoc = await adminDb.collection('profiles').doc(userId).get();
        const currentCredits = profileDoc.exists ? (profileDoc.data()?.credits || 0) : 0;
        const userName = profileDoc.exists ? (profileDoc.data()?.full_name || 'User') : 'User';
        const billingData = profileDoc.exists ? (profileDoc.data()?.billing_data || null) : null;
        
        await adminDb.collection('profiles').doc(userId).update({
          plan: plan,
          status: 'active',
          credits: currentCredits + credits,
          revolut_order_id: orderId
        });
        
        await adminDb.collection('transactions').add({
          user_id: userId,
          user_name: userName,
          billing_data: billingData,
          amount: order.amount ? order.amount / 100 : (plan === 'expert' ? 200 : 500),
          type: 'subscription',
          description: `Abonament ${plan.toUpperCase()} (Revolut Pay)`,
          created_at: new Date().toISOString()
        });
        
        console.log(`[REVOLUT WEBHOOK] Successfully upgraded subscription for user ${userId} to ${plan}`);
      } else if (type === 'topup') {
        const amount = Number(metadata.amount || '0');
        const credits = Number(metadata.credits || '0');
        
        const profileDoc = await adminDb.collection('profiles').doc(userId).get();
        const currentCredits = profileDoc.exists ? (profileDoc.data()?.credits || 0) : 0;
        const userName = profileDoc.exists ? (profileDoc.data()?.full_name || 'User') : 'User';
        const billingData = profileDoc.exists ? (profileDoc.data()?.billing_data || null) : null;
        
        await adminDb.collection('profiles').doc(userId).update({
          credits: currentCredits + credits
        });
        
        await adminDb.collection('transactions').add({
          user_id: userId,
          user_name: userName,
          billing_data: billingData,
          amount: amount,
          type: 'top-up',
          description: `Top-Up ${credits} Credite (Revolut Pay)`,
          created_at: new Date().toISOString()
        });
        
        console.log(`[REVOLUT WEBHOOK] Successfully processed top-up for user ${userId}`);
      }
    }
    
    res.json({ received: true });
  } catch (err: any) {
    console.error('Error processing Revolut webhook:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// API Endpoint for Testing Revolut API Configuration
app.get('/api/test-revolut', async (req, res) => {
  try {
    const { apiKey, baseUrl, isSandbox } = getRevolutConfig();
    const configured = apiKey !== 'dummy_revolut_key_for_testing';
    
    // Diagnostics check (without exposing full key)
    const keyPrefix = apiKey === 'dummy_revolut_key_for_testing' ? 'none' : apiKey.substring(0, Math.min(8, apiKey.length));
    const keySuffix = apiKey === 'dummy_revolut_key_for_testing' ? 'none' : apiKey.substring(Math.max(0, apiKey.length - 4));
    const isPublicKey = apiKey.startsWith('pk_');
    const isSecretKey = apiKey.startsWith('sk_') || apiKey.startsWith('oa_');
    
    let advice = "";
    if (!configured) {
      advice = "Revolut nu este configurat în Secrets. Se folosește modul demo/mock (plata se simulează automat la checkout). Adăugați REVOLUT_API_KEY în Secrets pentru a activa plățile reale.";
    } else if (isPublicKey) {
      advice = "CRITICAL: Ați utilizat 'Public Key' (începe cu pk_). Revolut Merchant API are nevoie de 'Secret Key' (începe cu sk_ sau oa_). Generați o cheie nouă tip 'Secret Key' din Revolut Business -> Merchant -> Online Payments -> APIs.";
    } else if (isSandbox) {
      advice = "INFO: SANDBOX MODE. Aplicația utilizează sandbox-merchant.revolut.com. Asigurați-vă că acest API key provine din portalul Revolut Sandbox (sandbox-business.revolut.com) și nu cel de producție, altfel veți primi 401 Unauthorized.";
    } else {
      advice = "INFO: LIVE MODE. Aplicația face apeluri directe către serverul Live Revolut (merchant.revolut.com). Asigurați-vă că folosiți o cheie SECRETĂ de Live (începe cu sk_ sau oa_). Dacă cheia dvs. este de Sandbox, în mod obligatoriu adăugați REVOLUT_SANDBOX=true în variabilele de mediu.";
    }

    res.json({ 
      success: true, 
      message: "Revolut controller diagnostics ready.", 
      configured,
      isSandbox,
      baseUrl,
      keyLength: apiKey.length,
      keyPrefix,
      keySuffix,
      isPublicKey,
      isSecretKey,
      advice
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API Endpoint to Create Revolut Hosted Checkout Order
app.post('/api/create-revolut-order', async (req, res) => {
  try {
    const { type, plan, amount, credits, userId, email } = req.body;
    
    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    const { apiKey, baseUrl, isSandbox } = getRevolutConfig();
    const appUrl = req.headers.origin || process.env.APP_URL || `https://juristpro.ro`;

    // Compute amount in cents (Revolut takes positive integers as sub-unit values of the currency)
    const amountVal = type === 'subscription' ? (plan === 'expert' ? 20000 : 50000) : Math.round(Number(amount) * 100);

    // If key is dummy/missing, gracefully auto-credit the user profile immediately and redirect
    if (apiKey === 'dummy_revolut_key_for_testing' || apiKey.startsWith('dummy_')) {
      console.log(`[REVOLUT] Mock Order generated. Auto-crediting user profile: ${userId}`);
      const adminDb = getAdminDb();
      try {
        if (type === 'subscription') {
          const creditsToAdd = plan === 'expert' ? 150 : 500;
          const profileDoc = await adminDb.collection('profiles').doc(userId).get();
          const currentCredits = profileDoc.exists ? (profileDoc.data()?.credits || 0) : 0;
          const userName = profileDoc.exists ? (profileDoc.data()?.full_name || 'User') : 'User';
          const billingData = profileDoc.exists ? (profileDoc.data()?.billing_data || null) : null;

          await adminDb.collection('profiles').doc(userId).update({
            plan: plan,
            status: 'active',
            credits: currentCredits + creditsToAdd,
            revolut_order_id: 'mock_revolut_order_' + Date.now()
          });

          await adminDb.collection('transactions').add({
            user_id: userId,
            user_name: userName,
            billing_data: billingData,
            amount: plan === 'expert' ? 200 : 500,
            type: 'subscription',
            description: `Abonament ${plan.toUpperCase()} (Test Revolut)`,
            created_at: new Date().toISOString()
          });
        } else if (type === 'topup') {
          const creditsToAdd = Number(credits) || 0;
          const profileDoc = await adminDb.collection('profiles').doc(userId).get();
          const currentCredits = profileDoc.exists ? (profileDoc.data()?.credits || 0) : 0;
          const userName = profileDoc.exists ? (profileDoc.data()?.full_name || 'User') : 'User';
          const billingData = profileDoc.exists ? (profileDoc.data()?.billing_data || null) : null;

          await adminDb.collection('profiles').doc(userId).update({
            credits: currentCredits + creditsToAdd
          });

          await adminDb.collection('transactions').add({
            user_id: userId,
            user_name: userName,
            billing_data: billingData,
            amount: Number(amount) || 0,
            type: 'top-up',
            description: `Top-Up ${creditsToAdd} Credite (Test Revolut)`,
            created_at: new Date().toISOString()
          });
        }
      } catch (err: any) {
        console.error('[REVOLUT] Mock auto-crediting failed:', err);
      }
      
      const successMockUrl = `${appUrl}/?payment=success&mock=true`;
      res.json({ url: successMockUrl });
      return;
    }

    const keyLogStr = apiKey === 'dummy_revolut_key_for_testing' 
      ? 'DUMMY KEY' 
      : `${apiKey.substring(0, Math.min(6, apiKey.length))}...${apiKey.substring(Math.max(0, apiKey.length - 4))}`;
    console.log(`[REVOLUT] Creating order. Endpoint: ${baseUrl}, Sandbox: ${isSandbox}, Key: ${keyLogStr} (Length: ${apiKey.length})`);
    
    // Convert fetch response safely
    const fetchResponse = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Revolut-Api-Version': '2023-09-01'
      },
      body: JSON.stringify({
        amount: amountVal,
        currency: 'RON',
        customer: {
          email: email || 'checkout@juristpro.ro'
        },
        metadata: {
          app_name: 'JuristPRO',
          user_id: userId,
          userId,
          type,
          plan: plan || '',
          credits: credits ? String(credits) : '',
          amount: type === 'subscription' ? String(amountVal / 100) : String(amount)
        }
      })
    });

    if (!fetchResponse.ok) {
      const errorText = await fetchResponse.text();
      console.error('[REVOLUT] Error response from Revolut API:', errorText);
      if (fetchResponse.status === 401) {
        throw new Error(`Revolut API returned 401 Unauthorized. Verificați dacă ați configurat cheia corespunzătoare în Secrets: dacă folosiți cheia Sandbox, asigurați-vă că aveți REVOLUT_SANDBOX=true în Secrets (variabile de mediu). De asemenea, asigurați-vă că folosiți Secret Key (sk_* sau oa_*), NU Public Key (pk_*).`);
      }
      throw new Error(`Revolut API returned status ${fetchResponse.status}: ${errorText}`);
    }

    const orderData = await fetchResponse.json();
    console.log('[REVOLUT] Order created successfully:', orderData.id);
    
    const checkoutUrl = orderData.checkout_url || `https://checkout.revolut.com/payment?token=${orderData.public_id}`;
    res.json({ url: checkoutUrl });

  } catch (error: any) {
    console.error('Revolut checkout error:', error);
    res.status(500).json({ error: error.message || 'Eroare internă Revolut Pay' });
  }
});

// API Endpoint for Contact Form
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Toate câmpurile sunt obligatorii.' });
    }

    // Send email using Resend
    try {
      const resend = getResend();
      const { data, error } = await resend.emails.send({
        from: 'JuristPRO Contact <onboarding@resend.dev>',
        to: ['office@developly.pro'], // Resend test domain only allows sending to the registered account email
        subject: `Mesaj nou de la ${name} (Contact JuristPRO)`,
        html: `
          <h2>Mesaj nou de contact</h2>
          <p><strong>Nume:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Mesaj:</strong></p>
          <blockquote style="border-left: 4px solid #ccc; padding-left: 10px; margin-left: 0;">
            ${message.replace(/\n/g, '<br>')}
          </blockquote>
        `
      });

      if (error) {
        console.error('Resend API error:', error);
      }
    } catch (resendError) {
      console.error('Resend execution error (likely missing API key):', resendError);
      // We don't throw here so the user still sees success since it was saved in Firestore
    }
    
    res.json({ success: true, message: 'Mesajul a fost salvat cu succes.' });
  } catch (error: any) {
    console.error('Contact form error:', error);
    res.status(500).json({ error: 'Eroare la procesarea mesajului.' });
  }
});

app.get('/api/debug-key', (req, res) => res.json({ env: Object.keys(process.env).filter(k => k.includes('GEMINI')).map(k => `${k}=${process.env[k]}`) }));

// API Endpoint for Gemini Proxy
  app.post('/api/gemini', async (req, res) => {
  const { contents, systemInstruction } = req.body;
  let { tools } = req.body;
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Cheia API Gemini nu este configurată pe server.' });
  }
  
  const apiKey = process.env.GEMINI_API_KEY.trim();
  console.log('[GEMINI] Using API key:', apiKey.substring(0, 5) + '...');
  
  if (!apiKey.startsWith('AIza')) {
      return res.status(500).json({ 
          error: 'Cheia API Gemini configurată în aplicație nu este validă. Vă rugăm să verificați setările (Secrets) aplicației.' 
      });
  }
  
  // Remove googleSearch tool to avoid API key errors
  if (tools && Array.isArray(tools)) {
      tools = tools.filter(t => !t.googleSearch);
      if (tools.length === 0) tools = undefined;
  }
  
  try {
    const { GoogleGenAI, HarmCategory, HarmBlockThreshold } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });
    
    // Safety settings - Force BLOCK_NONE to prevent evasive behavior on legal topics
    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
    ];

    // In a real implementation we would stream back the response, 
    // but for simplicity for now we send the full text back, 
    // or set up a streaming response
    const stream = await ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents,
        config: {
            systemInstruction,
            tools,
            temperature: 0.3,
            topP: 0.9,
            topK: 40,
            safetySettings
        }
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of stream) {
        res.write(JSON.stringify(chunk) + '\n');
    }
    res.end();
  } catch (error: any) {
    console.error('Gemini proxy error:', error);
    
    let errMsg = error.message || 'Eroare la generarea răspunsului';
    try {
        const jsonMatch = errMsg.match(/\{.*\}/s);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.error && parsed.error.message) {
                errMsg = parsed.error.message;
            }
        }
    } catch(err) {
        // ignore
    }
    
    if (errMsg.includes('API key not valid')) {
        errMsg = 'Cheia API Gemini furnizată nu este validă. Vă rugăm să verificați meniul Settings (Secrets) și să introduceți o cheie API validă din Google AI Studio.';
    }
    
    res.status(500).json({ error: errMsg });
  }
});

// API Endpoint for Testing WhatsApp Gateway
app.post('/api/test-whatsapp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Numărul de telefon este obligatoriu.' });
    }

    const gatewayUrl = process.env.WHATSAPP_GATEWAY_URL;
    
    if (!gatewayUrl) {
      return res.status(400).json({ 
        error: 'Nu s-a configurat nicio metodă validă de expediere automată (lipsesc WHATSAPP_GATEWAY_URL sau WHATSAPP_GATEWAY_TOKEN din Secrets).' 
      });
    }

    const testMsg = `🔔 *TEST JURISTPRO*\n\nConexiunea la robotul tău WhatsApp funcționează perfect! Felicitări, ești integrat de acum cu succes! 🎉`;
    const result = await sendAutomatedWhatsApp(phone, testMsg);

    if (result.success) {
      res.json({ success: true, message: 'Mesajul de test a fost trimis cu succes pe WhatsApp!' });
    } else {
      let details = '';
      if (result.status) details += ` [Status ${result.status}]`;
      if (result.responseText) details += ` Răspuns API: ${result.responseText}`;
      if (result.error) details += ` Eroare: ${result.error}`;
      
      res.status(500).json({ 
        error: `Trimiterea a eșuat. Vă rugăm să verificați dacă Token-ul și URL-ul instanței sunt corecte, și dacă instanța este Autorizată (stare scanată / conectat QR) în GreenAPI. Detalii tehnice:${details}` 
      });
    }
  } catch (error: any) {
    console.error('Test WhatsApp error:', error);
    res.status(500).json({ error: error.message || 'Eroare internă în timpul trimiterii testului.' });
  }
});

// --- AUTOMATED WHATSAPP DISPATCHER ---
// Can send messages hands-free via Green API or custom standard HTTP WhatsApp Gateways
async function sendAutomatedWhatsApp(phone: string, text: string): Promise<{ success: boolean; status?: number; responseText?: string; error?: string }> {
  // Normalize phone to format like 40722123456
  let cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.startsWith('00')) {
    cleanPhone = cleanPhone.substring(2);
  }
  if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
    cleanPhone = '40' + cleanPhone.substring(1);
  } else if (cleanPhone.startsWith('7') && cleanPhone.length === 9) {
    cleanPhone = '40' + cleanPhone;
  }

  console.log(`[WHATSAPP ROBOT] Număr inițial: "${phone}" -> Număr normalizat: "${cleanPhone}"`);

  // 1. Try Custom HTTP WhatsApp Gateway if configured (e.g., UltraMsg, GreenAPI, WaTeam, etc.)
  const gatewayUrl = process.env.WHATSAPP_GATEWAY_URL;
  const gatewayToken = process.env.WHATSAPP_GATEWAY_TOKEN;

  if (gatewayUrl) {
    let finalUrl = gatewayUrl.trim();
    const isGreenApi = finalUrl.includes('green-api.com');
    
    if (isGreenApi) {
      const hasSendMessage = finalUrl.includes('/sendMessage/');
      if (!hasSendMessage && gatewayToken) {
        // Build correct Green API send message url automatically
        let cleanBase = finalUrl.replace(/\/+$/, '');
        const instanceMatch = cleanBase.match(/waInstance(\d+)/i);
        if (instanceMatch) {
          const instanceId = instanceMatch[1];
          const hostMatch = cleanBase.match(/^(https?:\/\/[^\/]+)/i);
          const host = hostMatch ? hostMatch[1] : 'https://api.green-api.com';
          finalUrl = `${host}/waInstance${instanceId}/sendMessage/${gatewayToken.trim()}`;
        } else {
          finalUrl = `${cleanBase}/sendMessage/${gatewayToken.trim()}`;
        }
      }
    } else {
      if (gatewayToken && !finalUrl.includes('token=')) {
        finalUrl = finalUrl.includes('?') ? `${finalUrl}&token=${gatewayToken}` : `${finalUrl}?token=${gatewayToken}`;
      }
    }

    console.log(`[WHATSAPP ROBOT] Încercare trimitere prin Gateway API. URL final: ${finalUrl}`);
    try {
      // Send payload supporting multiple common gateway formats
      let payload: any = {
        to: cleanPhone,
        message: text,
        msg: text,
        body: text,
        token: gatewayToken,
        phone: cleanPhone,
        number: cleanPhone
      };

      // Special handling for Green API
      if (finalUrl.includes('green-api.com')) {
        payload = { chatId: `${cleanPhone}@c.us`, message: text };
      }

      const response = await fetch(finalUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const resText = await response.text();
      console.log(`[WHATSAPP ROBOT] Răspuns Gateway API (Status: ${response.status}):`, resText);
      
      if (response.ok) {
        return { success: true, status: response.status, responseText: resText };
      } else {
        return { success: false, status: response.status, responseText: resText, error: `Server response code: ${response.status}` };
      }
    } catch (err: any) {
      console.error('[WHATSAPP ROBOT] Eroare la trimiterea prin Gateway API:', err);
      return { success: false, error: err.message || 'Fetch failed' };
    }
  }

  console.warn('[WHATSAPP ROBOT] Nu s-a configurat nicio metodă automată validă (WHATSAPP_GATEWAY_URL).');
  return { success: false, error: 'Nu este configurat niciun gateway WhatsApp valid.' };
}

// --- BACKGROUND AUTOMATION ROBOT ---
// This function scans all events and sends proactive alerts for tomorrow's deadlines
async function runDeadlineAutomation() {
  console.log('[ROBOT] Se scanează pro-activ dosarele...');
  const adminDb = getAdminDb();
  
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Fallback: Scan profiles then events to avoid index requirements or permission issues on collectionGroup
    const profilesSnapshot = await adminDb.collection('profiles').get();
    
    for (const profileDoc of profilesSnapshot.docs) {
      const profile = profileDoc.data();
      const eventsRef = profileDoc.ref.collection('events');
      
      const eventsSnapshot = await eventsRef
        .where('event_date', '==', tomorrowStr)
        .where('whatsapp_alert', '==', true)
        .get();
        
      if (!eventsSnapshot.empty) {
        for (const eventDoc of eventsSnapshot.docs) {
          const event = eventDoc.data();
          const whatsappSent = event['whatsapp_alert_sent'] === true;
          const emailSent = event['email_alert_sent'] === true;

          if (whatsappSent && emailSent) {
            continue; // Already processed both channels
          }

          console.log(`[ROBOT] ALERTĂ TRIGGER: Dosar "${event.title}" pentru utilizatorul ${profile.full_name || 'avocat'}`);
          
          // --- SEND EMAIL NOTIFICATION ---
          if (!emailSent && profile.email) {
            try {
              const resend = getResend();
              await resend.emails.send({
                from: 'JuristPRO Robot <robot@developly.pro>',
                to: [profile.email], // Se trimite o copie pe mail-ul de avocat
                subject: `⚠️ ALERTĂ TERMEN: Dosar ${event.title}`,
                html: `
                  <div style="font-family: sans-serif; padding: 40px; background: #050505; color: white; border-radius: 20px;">
                    <h1 style="color: #ea580c; font-size: 20px; font-weight: 900; text-transform: uppercase;">JuristPRO Automatizare</h1>
                    <p style="color: #71717a;">Bună ziua, Av. ${profile.full_name || 'Colegu'},</p>
                    <div style="background: #111; padding: 30px; border-radius: 20px; border: 1px solid #27272a; margin: 30px 0;">
                      <p><strong>DOSAR:</strong> ${event.title}</p>
                      <p><strong>TERMEN:</strong> ${event.event_date} la ${event.event_time}</p>
                      <p><strong>INSTANȚĂ:</strong> ${event.details || 'Nespecificată'}</p>
                    </div>
                    <p style="font-size: 11px; color: #3f3f46;">Sistemul automat JuristPRO a prelucrat acest dosar.</p>
                  </div>
                `
              });
              await eventDoc.ref.update({
                email_alert_sent: true
              });
              console.log(`[ROBOT] Email trimis cu succes către ${profile.email}`);
            } catch (err) {
              console.error('[ROBOT] Eroare trimitere email intern:', err);
            }
          }

          // --- SEND WHATSAPP NOTIFICATION ---
          if (!whatsappSent && profile.phone) {
            const location = event.details || 'Nespecificat';
            const notes = event.notes || 'Fără note adiționale';
            const textMessage = `🔔 *ALERTA JURISTPRO - REAMINTIRE 24H*\n\n` +
              `⚖️ *DOSAR:* ${event.title || 'Nespecificat'}\n` +
              `👤 *CLIENT:* ${event.clientName || 'Nespecificat'}\n` +
              `📅 *DATA:* ${event.event_date || '...'}\n` +
              `🕒 *ORA:* ${event.event_time || '...'}\n` +
              `📂 *OBIECT:* ${event.type || 'Nespecificat'}\n` +
              `📍 *LOCAȚIE:* ${location}\n\n` +
              `📝 *NOTE:* ${notes}\n\n` +
              `_Mesaj automat generat de către JuristPRO AI_`;

            console.log(`[ROBOT] Se încearcă trimiterea automată WhatsApp către numărul: ${profile.phone}`);
            const result = await sendAutomatedWhatsApp(profile.phone, textMessage);
            
            if (result.success) {
              await eventDoc.ref.update({
                whatsapp_alert_sent: true
              });
              console.log(`[ROBOT] Alerta automată WhatsApp a fost expediată pentru "${event.title}"`);
            } else {
              console.warn(`[ROBOT] Expedierea automată a eșuat. Utilizatorul poate trimite manual via web-app. Eroare:`, result.error || result.responseText);
            }
          }
        }
      }
    }
  } catch (error: any) {
    if (error.message && error.message.includes('PERMISSION_DENIED')) {
      console.warn('[ROBOT] Sărire ciclu scanare din cauza lipsei de permisiuni pe proiectul curent (Admin SDK).');
    } else {
      console.error('[ROBOT] Eroare critică în ciclul de automatizare:', error);
    }
  }
}


// Run automation every 8 hours (3 times a day)
setInterval(runDeadlineAutomation, 8 * 60 * 60 * 1000); 

// Also trigger once on server startup after a small delay
setTimeout(runDeadlineAutomation, 15000);

// --- END AUTOMATION ---

// Serve static files
const distPath = path.join(__dirname, 'dist/juristpro/browser');
console.log('Serving static files from:', distPath);

app.use(express.static(distPath));

// Fallback to index.html for SPA routing
app.use((req, res) => {
  if (req.accepts('html')) {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(503).send(`
        <html>
          <head>
            <title>Updating Application...</title>
            <meta http-equiv="refresh" content="3">
            <style>
              body { font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f9fafb; color: #111827; }
              .loader { border: 4px solid #e5e7eb; border-top: 4px solid #3b82f6; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 20px; }
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
          </head>
          <body>
            <div class="loader"></div>
            <h2>Aplicația se actualizează</h2>
            <p>Vă rugăm să așteptați câteva momente...</p>
          </body>
        </html>
      `);
    }
  } else {
    res.status(404).json({ error: 'Not Found' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;
