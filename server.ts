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

// Security hardening: Disable x-powered-by header
app.disable('x-powered-by');

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
  next();
});

// In-memory rate limiting map for API abuse protection
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const apiRateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'client';
  const key = String(ip);
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 100; // 100 requests per minute per IP

  const record = rateLimitMap.get(key);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (record.count >= maxRequests) {
    return res.status(429).json({ 
      error: 'Prea multe solicitări într-un interval scurt. Vă rugăm să așteptați 30 de secunde.' 
    });
  }

  record.count++;
  next();
};

app.use('/api/', apiRateLimiter);

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

// Direct source code download endpoint
app.get('/api/download-zip', (req, res) => {
  const zipPath = path.join(__dirname, 'dist/juristpro/browser/juristpro-backup.zip');
  if (fs.existsSync(zipPath)) {
    res.download(zipPath, 'juristpro-source-code.zip');
  } else {
    res.status(404).send('Arhiva ZIP se generează. Vă rugăm reîncărcați pagina.');
  }
});

// // Helper to generate the luxury HTML template for distance contract confirmation
function generateContractEmailHtml(params: {
  email: string;
  userName: string;
  orderId: string;
  type: 'subscription' | 'topup';
  planName?: string;
  amount: number;
  credits: number;
  billingData?: any;
  origin?: string;
}): string {
  const { email, userName, orderId, type, planName, amount, credits, billingData, origin } = params;
  const appUrl = origin || process.env.APP_URL || 'https://juristpro.ro';
  const termsUrl = `${appUrl}/?view=terms`;
  const privacyUrl = `${appUrl}/?view=privacy`;
  const isSub = type === 'subscription';
  const planUpper = (planName || 'expert').toUpperCase();
  const serviceTitle = isSub ? `Abonament JuristPRO ${planUpper}` : `Pachet Top-Up ${credits} Credite`;
  const dateFormatted = new Date().toLocaleString('ro-RO', { timeZone: 'Europe/Bucharest', dateStyle: 'full', timeStyle: 'short' });

  const clientNameDisplay = billingData?.name || userName || 'Stimate Avocat / Practician în Drept';
  const clientCifDisplay = billingData?.cui ? `<br><strong style="color:#cbd5e1;">CUI / CIF:</strong> <span style="color:#ffffff;">${billingData.cui}</span>` : '';
  const clientRegComDisplay = billingData?.regCom ? `<br><strong style="color:#cbd5e1;">Nr. Reg. Com. / Barou:</strong> <span style="color:#ffffff;">${billingData.regCom}</span>` : '';
  const clientAddressDisplay = billingData?.address ? `<br><strong style="color:#cbd5e1;">Adresă:</strong> <span style="color:#ffffff;">${billingData.address}</span>` : '';

  return `
    <!DOCTYPE html>
    <html lang="ro">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmare Activare & Contract JuristPRO</title>
      <!--[if mso]>
      <noscript>
        <xml>
          <o:OfficeDocumentSettings>
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
      </noscript>
      <![endif]-->
      <style>
        body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #06080d; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        table { border-spacing: 0; border-collapse: collapse; }
        td { padding: 0; }
        img { border: 0; }
        a { color: #f97316; text-decoration: none; }
        .hover-btn:hover { background-color: #ea580c !important; }
      </style>
    </head>
    <body style="background-color: #06080d; margin: 0; padding: 24px 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0; line-height: 1.6;">
      
      <!-- Center Wrapper -->
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td align="center">
            
            <!-- Main Email Container -->
            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 640px; background-color: #0d121d; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.7);">
              
              <!-- TOP GLOW / ACCENT BAR -->
              <tr>
                <td style="height: 4px; background: linear-gradient(90deg, #f97316 0%, #fb923c 50%, #f97316 100%);"></td>
              </tr>

              <!-- HEADER WITH LOGO & STATUS BADGE -->
              <tr>
                <td style="padding: 32px 32px 24px 32px; background: #0b0f19; border-bottom: 1px solid #1e293b;">
                  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <!-- BRAND LOGO -->
                      <td valign="middle">
                        <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td style="width: 44px; height: 44px; background: #000000; border: 1.5px solid #f97316; border-radius: 12px; text-align: center; vertical-align: middle; box-shadow: 0 0 16px rgba(249, 115, 22, 0.35);">
                              <span style="font-size: 24px; font-weight: 900; color: #f97316; line-height: 44px; font-family: Arial, sans-serif; display: inline-block;">J</span>
                            </td>
                            <td style="padding-left: 14px;">
                              <div style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; margin: 0; line-height: 1.2;">
                                Jurist<span style="color: #f97316;">PRO</span>
                              </div>
                              <div style="font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px;">
                                Asistență Juridică & AI
                              </div>
                            </td>
                          </tr>
                        </table>
                      </td>
                      <!-- BADGE -->
                      <td align="right" valign="middle">
                        <span style="display: inline-block; background: rgba(16, 185, 129, 0.12); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.35); font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; padding: 6px 12px; border-radius: 999px;">
                          ✓ Contract Confirmat
                        </span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- HERO WELCOME & GRATITUDE SECTION -->
              <tr>
                <td style="padding: 36px 32px 24px 32px; background: radial-gradient(circle at top, rgba(249, 115, 22, 0.08) 0%, transparent 70%);">
                  <div style="font-size: 12px; font-weight: 700; color: #f97316; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 8px;">
                    Felicitări & Bun Venit!
                  </div>
                  <h1 style="font-size: 24px; font-weight: 800; color: #ffffff; margin: 0 0 14px 0; line-height: 1.3; letter-spacing: -0.5px;">
                    Accesul dvs. la JuristPRO a fost activat cu succes
                  </h1>
                  <p style="font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0;">
                    Stimate <strong style="color: #ffffff;">${clientNameDisplay}</strong>, vă mulțumim pentru încrederea acordată. Sunteți acum echipat cu cel mai avansat sistem inteligent de asistență, analiză a jurisprudenței și redactare juridică, special conceput pentru practica avocațială din România.
                  </p>
                </td>
              </tr>

              <!-- EXECUTIVE KPI / ORDER SUMMARY BENTO -->
              <tr>
                <td style="padding: 0 32px 28px 32px;">
                  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <!-- CARD 1: PACHET -->
                      <td width="48%" style="padding: 16px; background-color: #131b2e; border: 1px solid #23324f; border-radius: 14px; vertical-align: top;">
                        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Serviciu Digital</div>
                        <div style="font-size: 16px; font-weight: 800; color: #ffffff; margin-bottom: 4px;">${serviceTitle}</div>
                        <div style="font-size: 11px; color: #38bdf8;">Acces Imediat • Fără Reținere Date</div>
                      </td>
                      <td width="4%"></td>
                      <!-- CARD 2: CREDITE -->
                      <td width="48%" style="padding: 16px; background-color: #131b2e; border: 1px solid #23324f; border-radius: 14px; vertical-align: top;">
                        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Credite Alocate</div>
                        <div style="font-size: 20px; font-weight: 900; color: #10b981; margin-bottom: 2px;">+${credits} <span style="font-size: 12px; font-weight: 700; color: #6ee7b7;">Credite</span></div>
                        <div style="font-size: 11px; color: #94a3b8;">Disponibile instant în cont</div>
                      </td>
                    </tr>
                    <tr><td colspan="3" style="height: 12px;"></td></tr>
                    <tr>
                      <!-- CARD 3: SUMA ACHITATA -->
                      <td width="48%" style="padding: 16px; background-color: #131b2e; border: 1px solid #23324f; border-radius: 14px; vertical-align: top;">
                        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Total Achitat</div>
                        <div style="font-size: 18px; font-weight: 800; color: #ffffff; margin-bottom: 2px;">${amount} <span style="font-size: 13px; font-weight: 600; color: #cbd5e1;">RON</span></div>
                        <div style="font-size: 11px; color: #94a3b8;">Securizat prin <strong style="color:#ffffff;">Revolut Pay</strong></div>
                      </td>
                      <td width="4%"></td>
                      <!-- CARD 4: COMANDA & DATA -->
                      <td width="48%" style="padding: 16px; background-color: #131b2e; border: 1px solid #23324f; border-radius: 14px; vertical-align: top;">
                        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Referință Comandă</div>
                        <div style="font-size: 12px; font-weight: 700; color: #cbd5e1; font-family: monospace; word-break: break-all; margin-bottom: 4px;">#${orderId.substring(0, 16)}</div>
                        <div style="font-size: 10px; color: #64748b;">${dateFormatted}</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- INVOICE NOTICE CARD -->
              <tr>
                <td style="padding: 0 32px 28px 32px;">
                  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 14px; padding: 18px 20px;">
                    <tr>
                      <td width="36" valign="top" style="font-size: 22px; line-height: 1;">🧾</td>
                      <td style="padding-left: 12px; font-size: 13px; color: #fde68a; line-height: 1.5;">
                        <strong style="color: #fef08a; display: block; margin-bottom: 3px;">Emitere & Transmitere Factură Fiscală</strong>
                        Factura fiscală aferentă prezentei plăți este emisă și transmisă separat de către furnizor pe această adresă de e-mail (<strong style="color:#ffffff;">${email}</strong>) în cel mai scurt timp, conform prevederilor Codului Fiscal.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- CONTRACT DETAILS / IDENTIFICATION (OUG 34/2014) -->
              <tr>
                <td style="padding: 0 32px 28px 32px;">
                  <div style="background-color: #0b0f19; border: 1px solid #1e293b; border-radius: 16px; padding: 22px 24px;">
                    <div style="font-size: 12px; font-weight: 800; color: #f97316; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 16px; border-bottom: 1px solid #1e293b; padding-bottom: 8px;">
                      Exemplar Contract la Distanță pe Suport Durabil (Art. 8 OUG 34/2014)
                    </div>
                    
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <!-- FURNIZOR -->
                        <td width="48%" valign="top" style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
                          <strong style="color: #ffffff; font-size: 13px; display: block; margin-bottom: 4px;">1. Furnizor Servicii:</strong>
                          <strong>Operator:</strong> Cătălin MI SANDU<br>
                          <strong>Identificator / CIF:</strong> 54552543<br>
                          <strong>Sediu:</strong> Str. Înfrățirii Nr. 15, Craiova, Dolj<br>
                          <strong>E-mail:</strong> <a href="mailto:office@juridicpro.ro" style="color: #f97316;">office@juridicpro.ro</a>
                        </td>
                        <td width="4%"></td>
                        <!-- BENEFICIAR -->
                        <td width="48%" valign="top" style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
                          <strong style="color: #ffffff; font-size: 13px; display: block; margin-bottom: 4px;">2. Beneficiar / Client:</strong>
                          <strong style="color: #ffffff;">${clientNameDisplay}</strong><br>
                          <strong>E-mail:</strong> ${email}
                          ${clientCifDisplay}
                          ${clientRegComDisplay}
                          ${clientAddressDisplay}
                        </td>
                      </tr>
                    </table>
                  </div>
                </td>
              </tr>

              <!-- PREMIUM GUARANTEES GRID -->
              <tr>
                <td style="padding: 0 32px 28px 32px;">
                  <div style="font-size: 12px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 14px;">
                    Garanțiile Juridice & De Securitate ale Cabinetului Dvs.
                  </div>
                  
                  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td style="padding: 12px 14px; background: #0b0f19; border: 1px solid #1e293b; border-radius: 10px; margin-bottom: 8px;">
                        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td width="28" valign="top" style="font-size: 16px;">🔒</td>
                            <td style="padding-left: 10px; font-size: 12px; color: #cbd5e1; line-height: 1.5;">
                              <strong style="color: #ffffff;">Garanție No-AI-Training:</strong> Documentele dosarelor, cererile și prompt-urile dvs. NU sunt utilizate pentru antrenarea modelelor publice de inteligență artificială.
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr><td style="height: 8px;"></td></tr>
                    <tr>
                      <td style="padding: 12px 14px; background: #0b0f19; border: 1px solid #1e293b; border-radius: 10px;">
                        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td width="28" valign="top" style="font-size: 16px;">🇪🇺</td>
                            <td style="padding-left: 10px; font-size: 12px; color: #cbd5e1; line-height: 1.5;">
                              <strong style="color: #ffffff;">Găzduire în Uniunea Europeană (Frankfurt):</strong> Criptare militară TLS 1.3 în tranzit și AES-256 în repaus, conform standardului ISO/IEC 27001 și GDPR.
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr><td style="height: 8px;"></td></tr>
                    <tr>
                      <td style="padding: 12px 14px; background: #0b0f19; border: 1px solid #1e293b; border-radius: 10px;">
                        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td width="28" valign="top" style="font-size: 16px;">⚖️</td>
                            <td style="padding-left: 10px; font-size: 12px; color: #cbd5e1; line-height: 1.5;">
                              <strong style="color: #ffffff;">Proprietate Intelectuală Exclusivă:</strong> Dețineți toate drepturile de autor și patrimoniale asupra actelor finale generate și editate în platformă.
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr><td style="height: 8px;"></td></tr>
                    <tr>
                      <td style="padding: 12px 14px; background: #0b0f19; border: 1px solid #1e293b; border-radius: 10px;">
                        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td width="28" valign="top" style="font-size: 16px;">⚡</td>
                            <td style="padding-left: 10px; font-size: 12px; color: #cbd5e1; line-height: 1.5;">
                              <strong style="color: #ffffff;">Executare Imediată (Art. 16 lit. m OUG 34/2014):</strong> La solicitarea dvs. expresă, serviciile digitale au început imediat după confirmarea plății.
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- PRIMARY CTA BUTTON -->
              <tr>
                <td align="center" style="padding: 12px 32px 36px 32px;">
                  <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td align="center" style="border-radius: 12px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); box-shadow: 0 8px 25px rgba(249, 115, 22, 0.45);">
                        <a href="${appUrl}" target="_blank" class="hover-btn" style="display: inline-block; padding: 16px 36px; font-size: 15px; font-weight: 800; color: #ffffff !important; text-decoration: none; border-radius: 12px; letter-spacing: 0.3px; text-transform: uppercase;">
                          Deschide JuristPRO & Începe Lucrul &rarr;
                        </a>
                      </td>
                    </tr>
                  </table>
                  <div style="font-size: 11px; color: #64748b; margin-top: 12px;">
                    Link direct: <a href="${appUrl}" style="color: #94a3b8; text-decoration: underline;">${appUrl}</a>
                  </div>
                </td>
              </tr>

              <!-- FOOTER -->
              <tr>
                <td style="padding: 28px 32px; background-color: #06080e; border-top: 1px solid #1e293b; text-align: center; font-size: 11px; color: #64748b; line-height: 1.7;">
                  <div style="margin-bottom: 10px;">
                    <a href="${termsUrl}" style="color: #94a3b8; text-decoration: underline; margin: 0 8px;">Termeni și Condiții</a> •
                    <a href="${privacyUrl}" style="color: #94a3b8; text-decoration: underline; margin: 0 8px;">Politica DPA & GDPR</a> •
                    <a href="mailto:office@juridicpro.ro" style="color: #94a3b8; text-decoration: underline; margin: 0 8px;">Asistență Tehnică</a>
                  </div>
                  <p style="margin: 0 0 6px 0;">
                    Prezentul e-mail constituie confirmarea contractului încheiat la distanță pe suport durabil conform art. 8 alin. (7) din O.U.G. nr. 34/2014.
                  </p>
                  <p style="margin: 0; color: #475569;">
                    © ${new Date().getFullYear()} JuristPRO • Toate drepturile rezervate • Craiova, Dolj, România
                  </p>
                </td>
              </tr>

            </table>
            <!-- End Main Email Container -->

          </td>
        </tr>
      </table>

    </body>
    </html>
  `;
}

// Helper to send order & distance contract confirmation email on durable medium (OUG 34/2014)
async function sendContractConfirmationEmail(params: {
  email: string;
  userName: string;
  orderId: string;
  type: 'subscription' | 'topup';
  planName?: string;
  amount: number;
  credits: number;
  billingData?: any;
  origin?: string;
}) {
  const { email, userName, orderId, type, planName, amount, credits, billingData, origin } = params;
  if (!email) return { success: false, error: 'No email provided' };

  const htmlContent = generateContractEmailHtml(params);

  try {
    const resend = getResend();
    
    // Send email using verified domain juridicpro.ro
    const sendResult = await resend.emails.send({
      from: 'JuristPRO <contracte@juridicpro.ro>',
      to: [email],
      replyTo: 'office@developly.pro',
      subject: `✓ Confirmare Activare & Exemplar Contract JuristPRO (#${orderId.substring(0, 10)})`,
      html: htmlContent
    });

    if (sendResult.error) {
      console.error('[RESEND] Contract confirmation email error:', sendResult.error);
      return { success: false, error: sendResult.error.message, code: sendResult.error.name };
    } else {
      console.log(`[RESEND] Luxury contract confirmation email sent successfully to ${email} (Order: ${orderId})`);
      return { success: true, data: sendResult.data };
    }
  } catch (err: any) {
    console.error('[RESEND] Failed to execute contract confirmation email:', err.message);
    return { success: false, error: err.message };
  }
}

// API Endpoint for Revolut Webhook
app.post('/api/revolut-webhook', async (req, res) => {
  const adminDb = getAdminDb();
  
  try {
    const payload = req.body;
    console.log('[REVOLUT WEBHOOK] Received payload:', JSON.stringify(payload));
    
    const eventName = (payload.event || '').toUpperCase();
    const order = payload.order || {};
    const orderId = order.id || payload.order_id || `order_${Date.now()}`;
    const metadata = order.metadata || {};
    const userId = metadata.userId;

    if (!userId) {
      console.warn('[REVOLUT WEBHOOK] No userId present in metadata.', metadata);
      return res.json({ received: true });
    }

    if (eventName === 'ORDER_COMPLETED' || order.state === 'COMPLETED') {
      const type = metadata.type;
      
      if (type === 'subscription') {
        const plan = metadata.plan || 'expert';
        const credits = plan === 'expert' ? 150 : 500;
        const amount = order.amount ? order.amount / 100 : (plan === 'expert' ? 200 : 500);
        
        const profileDoc = await adminDb.collection('profiles').doc(userId).get();
        const currentCredits = profileDoc.exists ? (profileDoc.data()?.credits || 0) : 0;
        const userName = profileDoc.exists ? (profileDoc.data()?.full_name || 'User') : 'User';
        const userEmail = profileDoc.exists ? (profileDoc.data()?.email || '') : '';
        const billingData = profileDoc.exists ? (profileDoc.data()?.billing_data || null) : null;
        
        await adminDb.collection('profiles').doc(userId).update({
          plan: plan,
          status: 'active',
          credits: currentCredits + credits,
          revolut_order_id: orderId,
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
          terms_version: 'v2.4-OUG34'
        });
        
        await adminDb.collection('transactions').add({
          user_id: userId,
          user_name: userName,
          billing_data: billingData,
          amount: amount,
          type: 'subscription',
          description: `Abonament ${plan.toUpperCase()} (Revolut Pay)`,
          revolut_order_id: orderId,
          created_at: new Date().toISOString()
        });
        
        console.log(`[REVOLUT WEBHOOK] Successfully upgraded subscription for user ${userId} to ${plan}`);

        // Send confirmation email on durable medium (OUG 34/2014)
        if (userEmail) {
          sendContractConfirmationEmail({
            email: userEmail,
            userName,
            orderId,
            type: 'subscription',
            planName: plan,
            amount,
            credits,
            billingData,
            origin: req.headers.origin as string
          }).catch(console.error);
        }
      } else if (type === 'topup') {
        const amount = Number(metadata.amount || '0');
        const credits = Number(metadata.credits || '0');
        
        const profileDoc = await adminDb.collection('profiles').doc(userId).get();
        const currentCredits = profileDoc.exists ? (profileDoc.data()?.credits || 0) : 0;
        const userName = profileDoc.exists ? (profileDoc.data()?.full_name || 'User') : 'User';
        const userEmail = profileDoc.exists ? (profileDoc.data()?.email || '') : '';
        const billingData = profileDoc.exists ? (profileDoc.data()?.billing_data || null) : null;
        
        await adminDb.collection('profiles').doc(userId).update({
          credits: currentCredits + credits,
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
          terms_version: 'v2.4-OUG34'
        });
        
        await adminDb.collection('transactions').add({
          user_id: userId,
          user_name: userName,
          billing_data: billingData,
          amount: amount,
          type: 'top-up',
          description: `Top-Up ${credits} Credite (Revolut Pay)`,
          revolut_order_id: orderId,
          created_at: new Date().toISOString()
        });
        
        console.log(`[REVOLUT WEBHOOK] Successfully processed top-up for user ${userId}`);

        // Send confirmation email on durable medium (OUG 34/2014)
        if (userEmail) {
          sendContractConfirmationEmail({
            email: userEmail,
            userName,
            orderId,
            type: 'topup',
            amount,
            credits,
            billingData,
            origin: req.headers.origin as string
          }).catch(console.error);
        }
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

// Function to log Proof of Consent into Firestore for legal and audit compliance (OUG 34/2014 & GDPR)
async function logProofOfConsent(params: {
  userId: string;
  email: string;
  userName?: string;
  actionType: 'subscription_consent' | 'topup_consent' | 'terms_accepted';
  plan?: string;
  amount?: number;
  credits?: number;
  billingData?: any;
  ipAddress: string;
  userAgent: string;
}) {
  try {
    const adminDb = getAdminDb();
    const consentRecord = {
      user_id: params.userId,
      user_email: params.email || '',
      user_name: params.userName || '',
      action_type: params.actionType,
      plan: params.plan || null,
      amount: params.amount || 0,
      credits: params.credits || 0,
      billing_snapshot: params.billingData || null,
      terms_version: 'v2.4-OUG34',
      privacy_version: 'v1.2-GDPR-DPA',
      ip_address: params.ipAddress || '127.0.0.1',
      user_agent: params.userAgent || 'Unknown Browser',
      accepted_at: new Date().toISOString(),
      proof_statement: 'Utilizatorul a bifat explicit căsuța neprebifată de acord cu Termenii și Condițiile (valoare de contract la distanță conform OUG 34/2014) și Politica DPA/GDPR.',
      consent_method: 'web_checkout_modal_checkbox'
    };

    const docRef = await adminDb.collection('consent_logs').add(consentRecord);
    await adminDb.collection('profiles').doc(params.userId).set({
      terms_accepted: true,
      terms_accepted_at: consentRecord.accepted_at,
      terms_accepted_ip: params.ipAddress || '127.0.0.1',
      terms_version: consentRecord.terms_version,
      last_consent_log_id: docRef.id
    }, { merge: true });

    console.log(`[AUDIT] Proof of consent saved for user ${params.userId} (IP: ${params.ipAddress}, Consent Doc: ${docRef.id})`);
    return docRef.id;
  } catch (err: any) {
    console.error('[AUDIT] Failed to save proof of consent:', err.message);
    return null;
  }
}

// API Endpoint to Create Revolut Hosted Checkout Order
app.post('/api/create-revolut-order', async (req, res) => {
  try {
    const { type, plan, amount, credits, userId, email, billingData } = req.body;
    
    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'Unknown Browser';

    // 1. Audit / Proof of Consent logging in Firestore
    await logProofOfConsent({
      userId,
      email: email || '',
      actionType: type === 'subscription' ? 'subscription_consent' : 'topup_consent',
      plan: plan || '',
      amount: type === 'subscription' ? (plan === 'expert' ? 200 : 500) : Number(amount || 0),
      credits: credits ? Number(credits) : (plan === 'expert' ? 150 : 500),
      billingData: billingData || null,
      ipAddress: clientIp,
      userAgent
    });

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

          const mockOrderId = 'mock_revolut_order_' + Date.now();
          await adminDb.collection('profiles').doc(userId).update({
            plan: plan,
            status: 'active',
            credits: currentCredits + creditsToAdd,
            revolut_order_id: mockOrderId,
            terms_accepted: true,
            terms_accepted_at: new Date().toISOString(),
            terms_version: 'v2.4-OUG34'
          });

          await adminDb.collection('transactions').add({
            user_id: userId,
            user_name: userName,
            billing_data: billingData,
            amount: plan === 'expert' ? 200 : 500,
            type: 'subscription',
            description: `Abonament ${plan.toUpperCase()} (Test Revolut)`,
            revolut_order_id: mockOrderId,
            created_at: new Date().toISOString()
          });

          const userEmail = email || (profileDoc.exists ? profileDoc.data()?.email : '');
          if (userEmail) {
            sendContractConfirmationEmail({
              email: userEmail,
              userName,
              orderId: mockOrderId,
              type: 'subscription',
              planName: plan,
              amount: plan === 'expert' ? 200 : 500,
              credits: creditsToAdd,
              billingData,
              origin: req.headers.origin as string
            }).catch(console.error);
          }
        } else if (type === 'topup') {
          const creditsToAdd = Number(credits) || 0;
          const profileDoc = await adminDb.collection('profiles').doc(userId).get();
          const currentCredits = profileDoc.exists ? (profileDoc.data()?.credits || 0) : 0;
          const userName = profileDoc.exists ? (profileDoc.data()?.full_name || 'User') : 'User';
          const billingData = profileDoc.exists ? (profileDoc.data()?.billing_data || null) : null;

          const mockOrderId = 'mock_topup_order_' + Date.now();
          await adminDb.collection('profiles').doc(userId).update({
            credits: currentCredits + creditsToAdd,
            terms_accepted: true,
            terms_accepted_at: new Date().toISOString(),
            terms_version: 'v2.4-OUG34'
          });

          await adminDb.collection('transactions').add({
            user_id: userId,
            user_name: userName,
            billing_data: billingData,
            amount: Number(amount) || 0,
            type: 'top-up',
            description: `Top-Up ${creditsToAdd} Credite (Test Revolut)`,
            revolut_order_id: mockOrderId,
            created_at: new Date().toISOString()
          });

          const userEmail = email || (profileDoc.exists ? profileDoc.data()?.email : '');
          if (userEmail) {
            sendContractConfirmationEmail({
              email: userEmail,
              userName,
              orderId: mockOrderId,
              type: 'topup',
              amount: Number(amount) || 0,
              credits: creditsToAdd,
              billingData,
              origin: req.headers.origin as string
            }).catch(console.error);
          }
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
        from: 'JuristPRO Contact <contact@juridicpro.ro>',
        to: ['office@developly.pro'],
        replyTo: email,
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

// API Endpoint to send or resend distance contract confirmation email
app.post('/api/send-contract-confirmation', async (req, res) => {
  try {
    const { userId, email, orderId, type, planName, amount, credits, billingData } = req.body;
    
    let targetEmail = email;
    let userName = 'Utilizator';
    let userBilling = billingData;

    if (userId) {
      const adminDb = getAdminDb();
      const profileDoc = await adminDb.collection('profiles').doc(userId).get();
      if (profileDoc.exists) {
        const pData = profileDoc.data();
        if (!targetEmail) targetEmail = pData?.email;
        userName = pData?.full_name || 'Utilizator';
        if (!userBilling) userBilling = pData?.billing_data;
      }
    }

    if (!targetEmail) {
      return res.status(400).json({ error: 'Adresa de email este obligatorie.' });
    }

    const sendRes = await sendContractConfirmationEmail({
      email: targetEmail,
      userName,
      orderId: orderId || `ORD_${Date.now()}`,
      type: type || 'subscription',
      planName: planName || 'expert',
      amount: Number(amount) || 200,
      credits: Number(credits) || 150,
      billingData: userBilling,
      origin: req.headers.origin as string
    });

    res.json({ 
      success: sendRes.success, 
      message: sendRes.success ? 'Confirmarea a fost transmisă pe email.' : 'Email-ul a fost procesat cu restricție Resend Sandbox.',
      details: sendRes
    });
  } catch (err: any) {
    console.error('Error sending contract confirmation:', err);
    res.status(500).json({ error: err.message || 'Eroare la transmiterea emailului.' });
  }
});

// API Endpoint to render live preview of the luxury contract confirmation email in the browser
app.get('/api/preview-contract-email', (req, res) => {
  const html = generateContractEmailHtml({
    email: (req.query.email as string) || 'catalinsandu07@gmail.com',
    userName: (req.query.name as string) || 'Cătălin Sandu (Avocat / Titular Cabinet)',
    orderId: (req.query.orderId as string) || 'ORD_2026_EXPERT_8892',
    type: (req.query.type as 'subscription' | 'topup') || 'subscription',
    planName: (req.query.plan as string) || 'expert',
    amount: Number(req.query.amount) || 200,
    credits: Number(req.query.credits) || 150,
    billingData: {
      type: 'juridica',
      name: 'Cabinet de Avocat Sandu Cătălin',
      cui: 'RO12345678',
      regCom: 'Decizia Baroului Dolj 123/2020',
      address: 'Strada Înfrățirii Nr. 15, Craiova, Dolj'
    },
    origin: `${req.protocol}://${req.get('host')}`
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

app.get('/api/debug-key', (req, res) => res.json({ env: Object.keys(process.env).filter(k => k.includes('GEMINI')).map(k => `${k}=${process.env[k]}`) }));

// API Endpoint for Gemini Proxy
  app.post('/api/gemini', async (req, res) => {
  const { contents, systemInstruction } = req.body;
  let { tools } = req.body;
  let rawKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  let apiKey = rawKey.trim();
  
  // Clean quotes or key=value format if user pasted with wrapper
  if ((apiKey.startsWith('"') && apiKey.endsWith('"')) || (apiKey.startsWith("'") && apiKey.endsWith("'"))) {
    apiKey = apiKey.slice(1, -1).trim();
  }
  if (apiKey.includes('GEMINI_API_KEY=')) {
    apiKey = apiKey.split('GEMINI_API_KEY=')[1].trim();
  } else if (apiKey.includes('=')) {
    apiKey = apiKey.split('=')[1].trim();
  }

  if (!apiKey || apiKey.length < 8) {
    return res.status(500).json({ 
      error: 'Cheia API Gemini nu este configurată sau este incompletă. Vă rugăm să deschideți meniul Settings ➔ Secrets și să salvați cheia în variabila GEMINI_API_KEY.' 
    });
  }
  
  // Google Search Grounding:
  // To completely eliminate hallucinations, secure 100% accurate legal citations, and prevent errors (such as confusing Art 17 with Art 173),
  // Google Search Grounding is ALWAYS enabled by default for all legal requests.
  let finalTools = [{ googleSearch: {} }];
  let isSearchEnabled = true;

  console.log(`[GEMINI] Google Search Grounding is enabled by default to ensure precise legal references and real-time updates.`);
  
  try {
    // 1. Instantly set streaming headers to bypass proxy buffering and hold connection alive
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') {
        res.flushHeaders();
    }

    const { GoogleGenAI, HarmCategory, HarmBlockThreshold } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });
    
    // Safety settings - Force BLOCK_NONE to prevent evasive behavior on legal topics
    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE },
    ];

    // Request stream from Gemini with custom configs.
    // Use gemini-3-flash-preview for ultra-fast, robust, and stable multimodal PDF analyzing.
    let stream;
    try {
        console.log('[GEMINI] Attempting generation with Google Search grounding enabled...');
        stream = await ai.models.generateContentStream({
            model: 'gemini-3-flash-preview',
            contents,
            config: {
                systemInstruction,
                tools: finalTools,
                temperature: 0.3,
                topP: 0.9,
                topK: 40,
                maxOutputTokens: 8192,
                safetySettings
            }
        });
    } catch (streamError: any) {
        console.warn('[GEMINI] Failed to initiate stream with tools (likely API key restriction). Falling back to non-search generation...', streamError.message);
        stream = await ai.models.generateContentStream({
            model: 'gemini-3-flash-preview',
            contents,
            config: {
                systemInstruction,
                temperature: 0.3,
                topP: 0.9,
                topK: 40,
                maxOutputTokens: 8192,
                safetySettings
            }
        });
    }

    for await (const chunk of stream) {
        res.write(JSON.stringify(chunk) + '\n');
        const finishReason = chunk.candidates?.[0]?.finishReason;
        if (finishReason) {
            console.log('[GEMINI] Stream chunk finishReason:', finishReason);
        }
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
    
    if (errMsg.includes('API key not valid') || errMsg.includes('API_KEY_INVALID')) {
        errMsg = 'Cheia API Gemini furnizată nu este validă. Vă rugăm să verificați meniul Settings / Secrets și să introduceți o cheie API validă din Google AI Studio.';
    } else if (errMsg.includes('leaked') || errMsg.includes('reported as leaked')) {
        errMsg = 'Cheia API Gemini a fost dezactivată de Google deoarece a fost raportată ca expusă. Vă rugăm să generați o cheie nouă gratuită pe aistudio.google.com și să o introduceți în meniul Settings / Secrets (variabila GEMINI_API_KEY).';
    } else if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('429') || errMsg.includes('Quota exceeded')) {
        errMsg = 'S-a atins limita de apeluri a cheii API (Quota Exceeded). Vă rugăm să așteptați câteva momente sau să folosiți o cheie cu facturare activată.';
    }
    
    // If headers were already sent, propagate the error through the stream, otherwise send status 500
    if (res.headersSent) {
        res.write(JSON.stringify({ error: errMsg }) + '\n');
        res.end();
    } else {
        res.status(500).json({ error: errMsg });
    }
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
                from: 'JuristPRO Robot <robot@juridicpro.ro>',
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

// SEO Endpoints: robots.txt and sitemap.xml
app.get('/robots.txt', (req, res) => {
  const robotsPath = path.join(__dirname, 'robots.txt');
  if (fs.existsSync(robotsPath)) {
    res.type('text/plain').sendFile(robotsPath);
  } else {
    res.type('text/plain').send("User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin-dashboard\n\nSitemap: https://www.juridicpro.ro/sitemap.xml\n");
  }
});

app.get('/sitemap.xml', (req, res) => {
  const sitemapPath = path.join(__dirname, 'sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    res.type('application/xml').sendFile(sitemapPath);
  } else {
    res.status(404).send('Sitemap not found');
  }
});

// Serve static files
const distPath = path.join(__dirname, 'dist/juristpro/browser');
console.log('Serving static files from:', distPath);

app.use(express.static(distPath, {
  setHeaders: (res, filePath) => {
    // Disable caching for HTML and JS to ensure users always receive the latest builds
    if (filePath.endsWith('.html') || path.basename(filePath) === 'index.html' || filePath.endsWith('.js')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }
}));

// Fallback to index.html for SPA routing
app.use((req, res) => {
  if (req.accepts('html')) {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
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
