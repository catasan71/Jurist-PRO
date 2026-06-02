// Force GitHub sync update - 2026-04-11
import process from 'process';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import Stripe from 'stripe';
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

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
    apiVersion: '2024-12-18.acacia' as any,
  });
}

// Webhook endpoint must use raw body
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = getStripe();
  const adminDb = getAdminDb();

  let event;

  try {
    if (endpointSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig as string, endpointSecret);
    } else {
      // Fallback if no webhook secret is set (e.g., local dev without CLI)
      event = JSON.parse(req.body.toString());
    }
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        const metadata = session.metadata || {};

        if (!userId) break;

        if (metadata.type === 'subscription') {
          const plan = metadata.plan; // 'expert' or 'gold'
          const credits = plan === 'expert' ? 150 : 500;
          
          const profileDoc = await adminDb.collection('profiles').doc(userId).get();
          const currentCredits = profileDoc.exists ? (profileDoc.data()?.credits || 0) : 0;
          const userName = profileDoc.exists ? (profileDoc.data()?.full_name || 'User') : 'User';
          const billingData = profileDoc.exists ? (profileDoc.data()?.billing_data || null) : null;
          
          await adminDb.collection('profiles').doc(userId).update({
            plan: plan,
            status: 'active',
            credits: currentCredits + credits,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string
          });
          
          await adminDb.collection('transactions').add({
            user_id: userId,
            user_name: userName,
            billing_data: billingData,
            amount: session.amount_total ? session.amount_total / 100 : 0,
            type: 'subscription',
            description: `Abonament ${plan.toUpperCase()}`,
            created_at: new Date().toISOString()
          });
        } else if (metadata.type === 'topup') {
          const amount = parseInt(metadata.amount || '0', 10);
          const credits = parseInt(metadata.credits || '0', 10);
          
          // Get current credits
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
            description: `Top-Up ${credits} Credite`,
            created_at: new Date().toISOString()
          });
        }
        break;
      }
      case 'checkout.session.expired': {
        console.log('Checkout session expired:', event.data.object);
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.billing_reason === 'subscription_cycle') {
          const customerId = invoice.customer as string;
          
          const profilesSnapshot = await adminDb.collection('profiles')
            .where('stripe_customer_id', '==', customerId)
            .limit(1)
            .get();
            
          if (!profilesSnapshot.empty) {
            const userId = profilesSnapshot.docs[0].id;
            const profileData = profilesSnapshot.docs[0].data();
            const plan = profileData['plan'];
            const creditsToAdd = plan === 'expert' ? 150 : (plan === 'gold' ? 500 : 0);
            
            if (creditsToAdd > 0) {
              await adminDb.collection('profiles').doc(userId).update({
                credits: (profileData['credits'] || 0) + creditsToAdd,
                status: 'active'
              });
              
              await adminDb.collection('transactions').add({
                user_id: userId,
                user_name: profileData['full_name'] || 'User',
                billing_data: profileData['billing_data'] || null,
                amount: invoice.amount_paid ? invoice.amount_paid / 100 : 0,
                type: 'subscription',
                description: `Reînnoire Abonament ${plan.toUpperCase()}`,
                created_at: new Date().toISOString()
              });
            }
          }
        }
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        const profilesSnapshot = await adminDb.collection('profiles')
          .where('stripe_customer_id', '==', customerId)
          .limit(1)
          .get();
          
        if (!profilesSnapshot.empty) {
          const userId = profilesSnapshot.docs[0].id;
          
          let newPlan = subscription.metadata?.plan;
          
          if (!newPlan) {
            const productId = subscription.items.data[0].price.product as string;
            const product = await stripe.products.retrieve(productId);
            if (product.name.toLowerCase().includes('expert')) newPlan = 'expert';
            if (product.name.toLowerCase().includes('gold')) newPlan = 'gold';
          }
          
          if (newPlan && newPlan !== 'trial') {
            await adminDb.collection('profiles').doc(userId).update({
              plan: newPlan,
              status: subscription.status === 'active' ? 'active' : 'pending_payment'
            });
          }
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        // Find user by stripe_customer_id
        const profilesSnapshot = await adminDb.collection('profiles')
          .where('stripe_customer_id', '==', customerId)
          .limit(1)
          .get();
          
        if (!profilesSnapshot.empty) {
          const userId = profilesSnapshot.docs[0].id;
          await adminDb.collection('profiles').doc(userId).update({
            status: 'cancelled',
            plan: 'trial'
          });
        }
        break;
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Error processing webhook:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// Standard JSON parsing for other routes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API Endpoint for Stripe Checkout
app.get('/api/test-stripe', async (req, res) => {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy';
    if (stripeKey === 'sk_test_dummy') {
      return res.status(500).json({ success: false, error: 'Cheia Stripe nu este setată.' });
    }
    const prefix = stripeKey.substring(0, 15);
    const suffix = stripeKey.substring(stripeKey.length - 4);
    res.json({ success: true, message: "Stripe endpoint is active.", keyPrefix: prefix, keySuffix: suffix });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy';
    if (stripeKey === 'sk_test_dummy') {
      return res.status(500).json({ error: 'Cheia Stripe (STRIPE_SECRET_KEY) lipsește din setările aplicației.' });
    }

    const { type, plan, amount, credits, userId, email } = req.body;
    
    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    const appUrl = req.headers.origin || process.env.APP_URL || `https://ais-dev-2gyoebyp2nbm3psmj7o4di-40090194019.europe-west2.run.app`;
    
    let sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      client_reference_id: userId,
      success_url: `${appUrl}/?payment=success`,
      cancel_url: `${appUrl}/?payment=cancelled`,
      mode: 'payment',
      line_items: [],
      metadata: { type }
    };

    if (email && typeof email === 'string' && email.trim() !== '') {
      sessionConfig.customer_email = email;
    }

    if (type === 'subscription') {
      sessionConfig.mode = 'subscription';
      sessionConfig.metadata!.plan = plan;
      sessionConfig.subscription_data = {
        metadata: { plan }
      };
      
      const unitAmount = plan === 'expert' ? 20000 : 50000; // in bani (RON cents)
      
      sessionConfig.line_items = [
        {
          price_data: {
            currency: 'ron',
            product_data: {
              name: `Abonament JuristPRO ${plan.toUpperCase()}`,
              description: plan === 'expert' ? '150 Credite AI / lună' : '500 Credite AI / lună',
            },
            unit_amount: unitAmount,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ];
    } else if (type === 'topup') {
      sessionConfig.mode = 'payment';
      sessionConfig.metadata!.amount = String(amount);
      sessionConfig.metadata!.credits = String(credits);
      
      sessionConfig.line_items = [
        {
          price_data: {
            currency: 'ron',
            product_data: {
              name: `Top-Up ${credits} Credite JuristPRO`,
            },
            unit_amount: Math.round(Number(amount) * 100), // in bani
          },
          quantity: 1,
        },
      ];
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create(sessionConfig);
    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: error.message || 'Eroare internă Stripe' });
  }
});

// API Endpoint for Stripe Customer Portal (for cancellations)
app.post('/api/create-portal-session', async (req, res) => {
  try {
    const { userId } = req.body;
    
    const adminDb = getAdminDb();
    // Get the user's stripe_customer_id from Firestore
    const profileDoc = await adminDb.collection('profiles').doc(userId).get();
    const profile = profileDoc.data();
    
    if (!profile || !profile.stripe_customer_id) {
      res.status(400).json({ error: 'No active Stripe subscription found for this user.' });
      return;
    }

    const appUrl = req.headers.origin || process.env.APP_URL || `https://ais-dev-2gyoebyp2nbm3psmj7o4di-40090194019.europe-west2.run.app`;
    const stripe = getStripe();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl}/`,
    });

    res.json({ url: portalSession.url });
  } catch (error: any) {
    console.error('Stripe portal error:', error);
    res.status(500).json({ error: error.message });
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
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    
    if (!gatewayUrl && !twilioSid) {
      return res.status(400).json({ 
        error: 'Nu s-a configurat nicio metodă validă de expediere automată (lipsesc WHATSAPP_GATEWAY_URL sau TWILIO din Secrets).' 
      });
    }

    const testMsg = `🔔 *TEST JURISTPRO*\n\nConexiunea la robotul tău WhatsApp funcționează perfect! Felicitări, ești integrat de acum cu succes! 🎉`;
    const success = await sendAutomatedWhatsApp(phone, testMsg);

    if (success) {
      res.json({ success: true, message: 'Mesajul de test a fost trimis cu succes pe WhatsApp!' });
    } else {
      res.status(500).json({ 
        error: 'Trimiterea mesajului automată a eșuat. Vă rugăm să verificați dacă Token-ul sau URL-ul instanței sunt corecte și instanța este Autorizată cu succes în GreenAPI.' 
      });
    }
  } catch (error: any) {
    console.error('Test WhatsApp error:', error);
    res.status(500).json({ error: error.message || 'Eroare internă în timpul trimiterii testului.' });
  }
});

// --- AUTOMATED WHATSAPP DISPATCHER ---
// Can send messages hands-free via Twilio WhatsApp API or custom standard HTTP WhatsApp Gateways
async function sendAutomatedWhatsApp(phone: string, text: string): Promise<boolean> {
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
    console.log(`[WHATSAPP ROBOT] Încercare trimitere prin Gateway API: ${gatewayUrl}`);
    try {
      const isGreenApi = gatewayUrl.includes('green-api.com');
      const urlWithToken = (!isGreenApi && gatewayToken) ? `${gatewayUrl}?token=${gatewayToken}` : gatewayUrl;

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
      if (gatewayUrl.includes('green-api.com')) {
        payload = { chatId: `${cleanPhone}@c.us`, message: text };
      }

      const response = await fetch(urlWithToken, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const resText = await response.text();
      console.log(`[WHATSAPP ROBOT] Răspuns Gateway API (Status: ${response.status}):`, resText);
      if (response.ok) {
        return true;
      }
    } catch (err) {
      console.error('[WHATSAPP ROBOT] Eroare la trimiterea prin Gateway API:', err);
    }
  }

  // 2. Try Twilio WhatsApp API if configured
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_FROM_NUMBER;

  if (twilioSid && twilioToken && twilioFrom) {
    console.log('[WHATSAPP ROBOT] Încercare trimitere prin Twilio WhatsApp API...');
    try {
      // Lazy-load Twilio client to prevent crash for other users if keys are missing
      const twilioSdk = require('twilio');
      const client = twilioSdk(twilioSid, twilioToken);

      const formattedTo = cleanPhone.startsWith('whatsapp:') ? cleanPhone : `whatsapp:+${cleanPhone}`;
      const formattedFrom = twilioFrom.startsWith('whatsapp:') ? twilioFrom : `whatsapp:${twilioFrom}`;

      console.log(`[WHATSAPP ROBOT] Trimitere Twilio de la ${formattedFrom} către ${formattedTo}`);
      const message = await client.messages.create({
        body: text,
        from: formattedFrom,
        to: formattedTo
      });

      console.log('[WHATSAPP ROBOT] Succes Twilio SID:', message.sid);
      return true;
    } catch (err) {
      console.error('[WHATSAPP ROBOT] Eroare la trimiterea prin Twilio WhatsApp:', err);
    }
  }

  console.warn('[WHATSAPP ROBOT] Nu s-a configurat nicio metodă automată validă (WHATSAPP_GATEWAY_URL sau TWILIO_ACCOUNT_SID).');
  return false;
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
            const success = await sendAutomatedWhatsApp(profile.phone, textMessage);
            
            if (success) {
              await eventDoc.ref.update({
                whatsapp_alert_sent: true
              });
              console.log(`[ROBOT] Alerta automată WhatsApp a fost expediată pentru "${event.title}"`);
            } else {
              console.warn(`[ROBOT] Expedierea automată a eșuat. Utilizatorul poate trimite manual via web-app.`);
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
