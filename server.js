"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_process = __toESM(require("process"));
var import_express = __toESM(require("express"));
var import_path = __toESM(require("path"));
var import_fs = __toESM(require("fs"));
var import_dotenv = __toESM(require("dotenv"));
var import_firebase_admin = __toESM(require("firebase-admin"));
var import_firestore = require("firebase-admin/firestore");
var import_resend = require("resend");
var __dirname = import_process.default.cwd();
import_dotenv.default.config();
var resendInstance = null;
function getResend() {
  if (!resendInstance) {
    resendInstance = new import_resend.Resend(import_process.default.env.RESEND_SECRET_KEY || import_process.default.env.RESEND_API_KEY);
  }
  return resendInstance;
}
var app = (0, import_express.default)();
var port = 3e3;
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()");
  next();
});
var rateLimitMap = /* @__PURE__ */ new Map();
var apiRateLimiter = (req, res, next) => {
  const ip = req.ip || req.headers["x-forwarded-for"] || "client";
  const key = String(ip);
  const now = Date.now();
  const windowMs = 60 * 1e3;
  const maxRequests = 100;
  const record = rateLimitMap.get(key);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return next();
  }
  if (record.count >= maxRequests) {
    return res.status(429).json({
      error: "Prea multe solicit\u0103ri \xEEntr-un interval scurt. V\u0103 rug\u0103m s\u0103 a\u0219tepta\u021Bi 30 de secunde."
    });
  }
  record.count++;
  next();
};
app.use("/api/", apiRateLimiter);
var adminDbInstance = null;
function getAdminDb() {
  if (!adminDbInstance) {
    let projectId = import_process.default.env.FIREBASE_PROJECT_ID;
    let databaseId = "(default)";
    try {
      const configPath = import_path.default.join(__dirname, "firebase-applet-config.json");
      if (import_fs.default.existsSync(configPath)) {
        const config = JSON.parse(import_fs.default.readFileSync(configPath, "utf8"));
        if (config.projectId) {
          projectId = config.projectId;
        }
        if (config.firestoreDatabaseId) {
          databaseId = config.firestoreDatabaseId;
        }
      }
    } catch (e) {
      console.error("Failed to read config:", e);
    }
    if (!import_firebase_admin.default.apps.length) {
      const finalProjectId = projectId || "juristpro-d79ee";
      console.log(`[FIREBASE] Initializing Admin SDK with projectId: ${finalProjectId}`);
      try {
        import_firebase_admin.default.initializeApp({
          projectId: finalProjectId
        });
      } catch (initErr) {
        console.error("[FIREBASE] Initialization error:", initErr);
      }
    }
    const app2 = import_firebase_admin.default.app();
    adminDbInstance = (0, import_firestore.getFirestore)(app2, databaseId === "(default)" || !databaseId ? void 0 : databaseId);
    adminDbInstance.listCollections().then(() => {
      console.log("[FIREBASE] Admin SDK connection successful");
    }).catch((err) => {
      console.warn("[FIREBASE] Admin SDK connection warned (expected if external project without service account):", err.message);
    });
  }
  return adminDbInstance;
}
function getRevolutConfig() {
  const apiKey = (import_process.default.env.REVOLUT_API_KEY || import_process.default.env.REVOLUT_MERCHANT_API_KEY || "").trim();
  const envSandbox = import_process.default.env.REVOLUT_SANDBOX === "true" || import_process.default.env.REVOLUT_MODE === "sandbox" || import_process.default.env.REVOLUT_ENV === "sandbox";
  const isSandbox = !apiKey || apiKey === "dummy_revolut_key_for_testing" || apiKey.startsWith("sand_") || apiKey.includes("sandbox") || envSandbox;
  const baseUrl = isSandbox ? "https://sandbox-merchant.revolut.com/api/1.0" : "https://merchant.revolut.com/api/1.0";
  return {
    apiKey: apiKey || "dummy_revolut_key_for_testing",
    baseUrl,
    isSandbox
  };
}
app.use(import_express.default.json({ limit: "50mb" }));
app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
app.get("/api/download-zip", (req, res) => {
  const zipPath = import_path.default.join(__dirname, "dist/juristpro/browser/juristpro-backup.zip");
  if (import_fs.default.existsSync(zipPath)) {
    res.download(zipPath, "juristpro-source-code.zip");
  } else {
    res.status(404).send("Arhiva ZIP se genereaz\u0103. V\u0103 rug\u0103m re\xEEnc\u0103rca\u021Bi pagina.");
  }
});
function generateContractEmailHtml(params) {
  const { email, userName, orderId, type, planName, amount, credits, billingData, origin } = params;
  const appUrl = origin || import_process.default.env.APP_URL || "https://juristpro.ro";
  const termsUrl = `${appUrl}/?view=terms`;
  const privacyUrl = `${appUrl}/?view=privacy`;
  const isSub = type === "subscription";
  const planUpper = (planName || "expert").toUpperCase();
  const serviceTitle = isSub ? `Abonament JuristPRO ${planUpper}` : `Pachet Top-Up ${credits} Credite`;
  const dateFormatted = (/* @__PURE__ */ new Date()).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest", dateStyle: "full", timeStyle: "short" });
  const clientNameDisplay = billingData?.name || userName || "Stimate Avocat / Practician \xEEn Drept";
  const clientCifDisplay = billingData?.cui ? `<br><strong style="color:#cbd5e1;">CUI / CIF:</strong> <span style="color:#ffffff;">${billingData.cui}</span>` : "";
  const clientRegComDisplay = billingData?.regCom ? `<br><strong style="color:#cbd5e1;">Nr. Reg. Com. / Barou:</strong> <span style="color:#ffffff;">${billingData.regCom}</span>` : "";
  const clientAddressDisplay = billingData?.address ? `<br><strong style="color:#cbd5e1;">Adres\u0103:</strong> <span style="color:#ffffff;">${billingData.address}</span>` : "";
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
                                Asisten\u021B\u0103 Juridic\u0103 & AI
                              </div>
                            </td>
                          </tr>
                        </table>
                      </td>
                      <!-- BADGE -->
                      <td align="right" valign="middle">
                        <span style="display: inline-block; background: rgba(16, 185, 129, 0.12); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.35); font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; padding: 6px 12px; border-radius: 999px;">
                          \u2713 Contract Confirmat
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
                    Felicit\u0103ri & Bun Venit!
                  </div>
                  <h1 style="font-size: 24px; font-weight: 800; color: #ffffff; margin: 0 0 14px 0; line-height: 1.3; letter-spacing: -0.5px;">
                    Accesul dvs. la JuristPRO a fost activat cu succes
                  </h1>
                  <p style="font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0;">
                    Stimate <strong style="color: #ffffff;">${clientNameDisplay}</strong>, v\u0103 mul\u021Bumim pentru \xEEncrederea acordat\u0103. Sunte\u021Bi acum echipat cu cel mai avansat sistem inteligent de asisten\u021B\u0103, analiz\u0103 a jurispruden\u021Bei \u0219i redactare juridic\u0103, special conceput pentru practica avoca\u021Bial\u0103 din Rom\xE2nia.
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
                        <div style="font-size: 11px; color: #38bdf8;">Acces Imediat \u2022 F\u0103r\u0103 Re\u021Binere Date</div>
                      </td>
                      <td width="4%"></td>
                      <!-- CARD 2: CREDITE -->
                      <td width="48%" style="padding: 16px; background-color: #131b2e; border: 1px solid #23324f; border-radius: 14px; vertical-align: top;">
                        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Credite Alocate</div>
                        <div style="font-size: 20px; font-weight: 900; color: #10b981; margin-bottom: 2px;">+${credits} <span style="font-size: 12px; font-weight: 700; color: #6ee7b7;">Credite</span></div>
                        <div style="font-size: 11px; color: #94a3b8;">Disponibile instant \xEEn cont</div>
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
                        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Referin\u021B\u0103 Comand\u0103</div>
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
                      <td width="36" valign="top" style="font-size: 22px; line-height: 1;">\u{1F9FE}</td>
                      <td style="padding-left: 12px; font-size: 13px; color: #fde68a; line-height: 1.5;">
                        <strong style="color: #fef08a; display: block; margin-bottom: 3px;">Emitere & Transmitere Factur\u0103 Fiscal\u0103</strong>
                        Factura fiscal\u0103 aferent\u0103 prezentei pl\u0103\u021Bi este emis\u0103 \u0219i transmis\u0103 separat de c\u0103tre furnizor pe aceast\u0103 adres\u0103 de e-mail (<strong style="color:#ffffff;">${email}</strong>) \xEEn cel mai scurt timp, conform prevederilor Codului Fiscal.
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
                      Exemplar Contract la Distan\u021B\u0103 pe Suport Durabil (Art. 8 OUG 34/2014)
                    </div>
                    
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <!-- FURNIZOR -->
                        <td width="48%" valign="top" style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
                          <strong style="color: #ffffff; font-size: 13px; display: block; margin-bottom: 4px;">1. Furnizor Servicii:</strong>
                          <strong>Operator:</strong> C\u0103t\u0103lin MI SANDU<br>
                          <strong>Identificator / CIF:</strong> 54552543<br>
                          <strong>Sediu:</strong> Str. \xCEnfr\u0103\u021Birii Nr. 15, Craiova, Dolj<br>
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
                    Garan\u021Biile Juridice & De Securitate ale Cabinetului Dvs.
                  </div>
                  
                  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td style="padding: 12px 14px; background: #0b0f19; border: 1px solid #1e293b; border-radius: 10px; margin-bottom: 8px;">
                        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td width="28" valign="top" style="font-size: 16px;">\u{1F512}</td>
                            <td style="padding-left: 10px; font-size: 12px; color: #cbd5e1; line-height: 1.5;">
                              <strong style="color: #ffffff;">Garan\u021Bie No-AI-Training:</strong> Documentele dosarelor, cererile \u0219i prompt-urile dvs. NU sunt utilizate pentru antrenarea modelelor publice de inteligen\u021B\u0103 artificial\u0103.
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
                            <td width="28" valign="top" style="font-size: 16px;">\u{1F1EA}\u{1F1FA}</td>
                            <td style="padding-left: 10px; font-size: 12px; color: #cbd5e1; line-height: 1.5;">
                              <strong style="color: #ffffff;">G\u0103zduire \xEEn Uniunea European\u0103 (Frankfurt):</strong> Criptare militar\u0103 TLS 1.3 \xEEn tranzit \u0219i AES-256 \xEEn repaus, conform standardului ISO/IEC 27001 \u0219i GDPR.
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
                            <td width="28" valign="top" style="font-size: 16px;">\u2696\uFE0F</td>
                            <td style="padding-left: 10px; font-size: 12px; color: #cbd5e1; line-height: 1.5;">
                              <strong style="color: #ffffff;">Proprietate Intelectual\u0103 Exclusiv\u0103:</strong> De\u021Bine\u021Bi toate drepturile de autor \u0219i patrimoniale asupra actelor finale generate \u0219i editate \xEEn platform\u0103.
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
                            <td width="28" valign="top" style="font-size: 16px;">\u26A1</td>
                            <td style="padding-left: 10px; font-size: 12px; color: #cbd5e1; line-height: 1.5;">
                              <strong style="color: #ffffff;">Executare Imediat\u0103 (Art. 16 lit. m OUG 34/2014):</strong> La solicitarea dvs. expres\u0103, serviciile digitale au \xEEnceput imediat dup\u0103 confirmarea pl\u0103\u021Bii.
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
                          Deschide JuristPRO & \xCEncepe Lucrul &rarr;
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
                    <a href="${termsUrl}" style="color: #94a3b8; text-decoration: underline; margin: 0 8px;">Termeni \u0219i Condi\u021Bii</a> \u2022
                    <a href="${privacyUrl}" style="color: #94a3b8; text-decoration: underline; margin: 0 8px;">Politica DPA & GDPR</a> \u2022
                    <a href="mailto:office@juridicpro.ro" style="color: #94a3b8; text-decoration: underline; margin: 0 8px;">Asisten\u021B\u0103 Tehnic\u0103</a>
                  </div>
                  <p style="margin: 0 0 6px 0;">
                    Prezentul e-mail constituie confirmarea contractului \xEEncheiat la distan\u021B\u0103 pe suport durabil conform art. 8 alin. (7) din O.U.G. nr. 34/2014.
                  </p>
                  <p style="margin: 0; color: #475569;">
                    \xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} JuristPRO \u2022 Toate drepturile rezervate \u2022 Craiova, Dolj, Rom\xE2nia
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
async function sendContractConfirmationEmail(params) {
  const { email, userName, orderId, type, planName, amount, credits, billingData, origin } = params;
  if (!email) return { success: false, error: "No email provided" };
  const htmlContent = generateContractEmailHtml(params);
  try {
    const resend = getResend();
    const sendResult = await resend.emails.send({
      from: "JuristPRO <contracte@juridicpro.ro>",
      to: [email],
      replyTo: "office@developly.pro",
      subject: `\u2713 Confirmare Activare & Exemplar Contract JuristPRO (#${orderId.substring(0, 10)})`,
      html: htmlContent
    });
    if (sendResult.error) {
      console.error("[RESEND] Contract confirmation email error:", sendResult.error);
      return { success: false, error: sendResult.error.message, code: sendResult.error.name };
    } else {
      console.log(`[RESEND] Luxury contract confirmation email sent successfully to ${email} (Order: ${orderId})`);
      return { success: true, data: sendResult.data };
    }
  } catch (err) {
    console.error("[RESEND] Failed to execute contract confirmation email:", err.message);
    return { success: false, error: err.message };
  }
}
app.post("/api/revolut-webhook", async (req, res) => {
  const adminDb = getAdminDb();
  try {
    const payload = req.body;
    console.log("[REVOLUT WEBHOOK] Received payload:", JSON.stringify(payload));
    const eventName = (payload.event || "").toUpperCase();
    const order = payload.order || {};
    const orderId = order.id || payload.order_id || `order_${Date.now()}`;
    const metadata = order.metadata || {};
    const userId = metadata.userId;
    if (!userId) {
      console.warn("[REVOLUT WEBHOOK] No userId present in metadata.", metadata);
      return res.json({ received: true });
    }
    if (eventName === "ORDER_COMPLETED" || order.state === "COMPLETED") {
      const type = metadata.type;
      if (type === "subscription") {
        const plan = metadata.plan || "expert";
        const credits = plan === "expert" ? 150 : 500;
        const amount = order.amount ? order.amount / 100 : plan === "expert" ? 200 : 500;
        const profileDoc = await adminDb.collection("profiles").doc(userId).get();
        const currentCredits = profileDoc.exists ? profileDoc.data()?.credits || 0 : 0;
        const userName = profileDoc.exists ? profileDoc.data()?.full_name || "User" : "User";
        const userEmail = profileDoc.exists ? profileDoc.data()?.email || "" : "";
        const billingData = profileDoc.exists ? profileDoc.data()?.billing_data || null : null;
        await adminDb.collection("profiles").doc(userId).update({
          plan,
          status: "active",
          credits: currentCredits + credits,
          revolut_order_id: orderId,
          terms_accepted: true,
          terms_accepted_at: (/* @__PURE__ */ new Date()).toISOString(),
          terms_version: "v2.4-OUG34"
        });
        await adminDb.collection("transactions").add({
          user_id: userId,
          user_name: userName,
          billing_data: billingData,
          amount,
          type: "subscription",
          description: `Abonament ${plan.toUpperCase()} (Revolut Pay)`,
          revolut_order_id: orderId,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        });
        console.log(`[REVOLUT WEBHOOK] Successfully upgraded subscription for user ${userId} to ${plan}`);
        if (userEmail) {
          sendContractConfirmationEmail({
            email: userEmail,
            userName,
            orderId,
            type: "subscription",
            planName: plan,
            amount,
            credits,
            billingData,
            origin: req.headers.origin
          }).catch(console.error);
        }
      } else if (type === "topup") {
        const amount = Number(metadata.amount || "0");
        const credits = Number(metadata.credits || "0");
        const profileDoc = await adminDb.collection("profiles").doc(userId).get();
        const currentCredits = profileDoc.exists ? profileDoc.data()?.credits || 0 : 0;
        const userName = profileDoc.exists ? profileDoc.data()?.full_name || "User" : "User";
        const userEmail = profileDoc.exists ? profileDoc.data()?.email || "" : "";
        const billingData = profileDoc.exists ? profileDoc.data()?.billing_data || null : null;
        await adminDb.collection("profiles").doc(userId).update({
          credits: currentCredits + credits,
          terms_accepted: true,
          terms_accepted_at: (/* @__PURE__ */ new Date()).toISOString(),
          terms_version: "v2.4-OUG34"
        });
        await adminDb.collection("transactions").add({
          user_id: userId,
          user_name: userName,
          billing_data: billingData,
          amount,
          type: "top-up",
          description: `Top-Up ${credits} Credite (Revolut Pay)`,
          revolut_order_id: orderId,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        });
        console.log(`[REVOLUT WEBHOOK] Successfully processed top-up for user ${userId}`);
        if (userEmail) {
          sendContractConfirmationEmail({
            email: userEmail,
            userName,
            orderId,
            type: "topup",
            amount,
            credits,
            billingData,
            origin: req.headers.origin
          }).catch(console.error);
        }
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error("Error processing Revolut webhook:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});
app.get("/api/test-revolut", async (req, res) => {
  try {
    const { apiKey, baseUrl, isSandbox } = getRevolutConfig();
    const configured = apiKey !== "dummy_revolut_key_for_testing";
    const keyPrefix = apiKey === "dummy_revolut_key_for_testing" ? "none" : apiKey.substring(0, Math.min(8, apiKey.length));
    const keySuffix = apiKey === "dummy_revolut_key_for_testing" ? "none" : apiKey.substring(Math.max(0, apiKey.length - 4));
    const isPublicKey = apiKey.startsWith("pk_");
    const isSecretKey = apiKey.startsWith("sk_") || apiKey.startsWith("oa_");
    let advice = "";
    if (!configured) {
      advice = "Revolut nu este configurat \xEEn Secrets. Se folose\u0219te modul demo/mock (plata se simuleaz\u0103 automat la checkout). Ad\u0103uga\u021Bi REVOLUT_API_KEY \xEEn Secrets pentru a activa pl\u0103\u021Bile reale.";
    } else if (isPublicKey) {
      advice = "CRITICAL: A\u021Bi utilizat 'Public Key' (\xEEncepe cu pk_). Revolut Merchant API are nevoie de 'Secret Key' (\xEEncepe cu sk_ sau oa_). Genera\u021Bi o cheie nou\u0103 tip 'Secret Key' din Revolut Business -> Merchant -> Online Payments -> APIs.";
    } else if (isSandbox) {
      advice = "INFO: SANDBOX MODE. Aplica\u021Bia utilizeaz\u0103 sandbox-merchant.revolut.com. Asigura\u021Bi-v\u0103 c\u0103 acest API key provine din portalul Revolut Sandbox (sandbox-business.revolut.com) \u0219i nu cel de produc\u021Bie, altfel ve\u021Bi primi 401 Unauthorized.";
    } else {
      advice = "INFO: LIVE MODE. Aplica\u021Bia face apeluri directe c\u0103tre serverul Live Revolut (merchant.revolut.com). Asigura\u021Bi-v\u0103 c\u0103 folosi\u021Bi o cheie SECRET\u0102 de Live (\xEEncepe cu sk_ sau oa_). Dac\u0103 cheia dvs. este de Sandbox, \xEEn mod obligatoriu ad\u0103uga\u021Bi REVOLUT_SANDBOX=true \xEEn variabilele de mediu.";
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
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
async function logProofOfConsent(params) {
  try {
    const adminDb = getAdminDb();
    const consentRecord = {
      user_id: params.userId,
      user_email: params.email || "",
      user_name: params.userName || "",
      action_type: params.actionType,
      plan: params.plan || null,
      amount: params.amount || 0,
      credits: params.credits || 0,
      billing_snapshot: params.billingData || null,
      terms_version: "v2.4-OUG34",
      privacy_version: "v1.2-GDPR-DPA",
      ip_address: params.ipAddress || "127.0.0.1",
      user_agent: params.userAgent || "Unknown Browser",
      accepted_at: (/* @__PURE__ */ new Date()).toISOString(),
      proof_statement: "Utilizatorul a bifat explicit c\u0103su\u021Ba neprebifat\u0103 de acord cu Termenii \u0219i Condi\u021Biile (valoare de contract la distan\u021B\u0103 conform OUG 34/2014) \u0219i Politica DPA/GDPR.",
      consent_method: "web_checkout_modal_checkbox"
    };
    const docRef = await adminDb.collection("consent_logs").add(consentRecord);
    await adminDb.collection("profiles").doc(params.userId).set({
      terms_accepted: true,
      terms_accepted_at: consentRecord.accepted_at,
      terms_accepted_ip: params.ipAddress || "127.0.0.1",
      terms_version: consentRecord.terms_version,
      last_consent_log_id: docRef.id
    }, { merge: true });
    console.log(`[AUDIT] Proof of consent saved for user ${params.userId} (IP: ${params.ipAddress}, Consent Doc: ${docRef.id})`);
    return docRef.id;
  } catch (err) {
    console.error("[AUDIT] Failed to save proof of consent:", err.message);
    return null;
  }
}
app.post("/api/create-revolut-order", async (req, res) => {
  try {
    const { type, plan, amount, credits, userId, email, billingData } = req.body;
    if (!userId) {
      res.status(400).json({ error: "User ID is required" });
      return;
    }
    const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "Unknown Browser";
    await logProofOfConsent({
      userId,
      email: email || "",
      actionType: type === "subscription" ? "subscription_consent" : "topup_consent",
      plan: plan || "",
      amount: type === "subscription" ? plan === "expert" ? 200 : 500 : Number(amount || 0),
      credits: credits ? Number(credits) : plan === "expert" ? 150 : 500,
      billingData: billingData || null,
      ipAddress: clientIp,
      userAgent
    });
    const { apiKey, baseUrl, isSandbox } = getRevolutConfig();
    const appUrl = req.headers.origin || import_process.default.env.APP_URL || `https://juristpro.ro`;
    const amountVal = type === "subscription" ? plan === "expert" ? 2e4 : 5e4 : Math.round(Number(amount) * 100);
    if (apiKey === "dummy_revolut_key_for_testing" || apiKey.startsWith("dummy_")) {
      console.log(`[REVOLUT] Mock Order generated. Auto-crediting user profile: ${userId}`);
      const adminDb = getAdminDb();
      try {
        if (type === "subscription") {
          const creditsToAdd = plan === "expert" ? 150 : 500;
          const profileDoc = await adminDb.collection("profiles").doc(userId).get();
          const currentCredits = profileDoc.exists ? profileDoc.data()?.credits || 0 : 0;
          const userName = profileDoc.exists ? profileDoc.data()?.full_name || "User" : "User";
          const billingData2 = profileDoc.exists ? profileDoc.data()?.billing_data || null : null;
          const mockOrderId = "mock_revolut_order_" + Date.now();
          await adminDb.collection("profiles").doc(userId).update({
            plan,
            status: "active",
            credits: currentCredits + creditsToAdd,
            revolut_order_id: mockOrderId,
            terms_accepted: true,
            terms_accepted_at: (/* @__PURE__ */ new Date()).toISOString(),
            terms_version: "v2.4-OUG34"
          });
          await adminDb.collection("transactions").add({
            user_id: userId,
            user_name: userName,
            billing_data: billingData2,
            amount: plan === "expert" ? 200 : 500,
            type: "subscription",
            description: `Abonament ${plan.toUpperCase()} (Test Revolut)`,
            revolut_order_id: mockOrderId,
            created_at: (/* @__PURE__ */ new Date()).toISOString()
          });
          const userEmail = email || (profileDoc.exists ? profileDoc.data()?.email : "");
          if (userEmail) {
            sendContractConfirmationEmail({
              email: userEmail,
              userName,
              orderId: mockOrderId,
              type: "subscription",
              planName: plan,
              amount: plan === "expert" ? 200 : 500,
              credits: creditsToAdd,
              billingData: billingData2,
              origin: req.headers.origin
            }).catch(console.error);
          }
        } else if (type === "topup") {
          const creditsToAdd = Number(credits) || 0;
          const profileDoc = await adminDb.collection("profiles").doc(userId).get();
          const currentCredits = profileDoc.exists ? profileDoc.data()?.credits || 0 : 0;
          const userName = profileDoc.exists ? profileDoc.data()?.full_name || "User" : "User";
          const billingData2 = profileDoc.exists ? profileDoc.data()?.billing_data || null : null;
          const mockOrderId = "mock_topup_order_" + Date.now();
          await adminDb.collection("profiles").doc(userId).update({
            credits: currentCredits + creditsToAdd,
            terms_accepted: true,
            terms_accepted_at: (/* @__PURE__ */ new Date()).toISOString(),
            terms_version: "v2.4-OUG34"
          });
          await adminDb.collection("transactions").add({
            user_id: userId,
            user_name: userName,
            billing_data: billingData2,
            amount: Number(amount) || 0,
            type: "top-up",
            description: `Top-Up ${creditsToAdd} Credite (Test Revolut)`,
            revolut_order_id: mockOrderId,
            created_at: (/* @__PURE__ */ new Date()).toISOString()
          });
          const userEmail = email || (profileDoc.exists ? profileDoc.data()?.email : "");
          if (userEmail) {
            sendContractConfirmationEmail({
              email: userEmail,
              userName,
              orderId: mockOrderId,
              type: "topup",
              amount: Number(amount) || 0,
              credits: creditsToAdd,
              billingData: billingData2,
              origin: req.headers.origin
            }).catch(console.error);
          }
        }
      } catch (err) {
        console.error("[REVOLUT] Mock auto-crediting failed:", err);
      }
      const successMockUrl = `${appUrl}/?payment=success&mock=true`;
      res.json({ url: successMockUrl });
      return;
    }
    const keyLogStr = apiKey === "dummy_revolut_key_for_testing" ? "DUMMY KEY" : `${apiKey.substring(0, Math.min(6, apiKey.length))}...${apiKey.substring(Math.max(0, apiKey.length - 4))}`;
    console.log(`[REVOLUT] Creating order. Endpoint: ${baseUrl}, Sandbox: ${isSandbox}, Key: ${keyLogStr} (Length: ${apiKey.length})`);
    const fetchResponse = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Revolut-Api-Version": "2023-09-01"
      },
      body: JSON.stringify({
        amount: amountVal,
        currency: "RON",
        customer: {
          email: email || "checkout@juristpro.ro"
        },
        metadata: {
          app_name: "JuristPRO",
          user_id: userId,
          userId,
          type,
          plan: plan || "",
          credits: credits ? String(credits) : "",
          amount: type === "subscription" ? String(amountVal / 100) : String(amount)
        }
      })
    });
    if (!fetchResponse.ok) {
      const errorText = await fetchResponse.text();
      console.error("[REVOLUT] Error response from Revolut API:", errorText);
      if (fetchResponse.status === 401) {
        throw new Error(`Revolut API returned 401 Unauthorized. Verifica\u021Bi dac\u0103 a\u021Bi configurat cheia corespunz\u0103toare \xEEn Secrets: dac\u0103 folosi\u021Bi cheia Sandbox, asigura\u021Bi-v\u0103 c\u0103 ave\u021Bi REVOLUT_SANDBOX=true \xEEn Secrets (variabile de mediu). De asemenea, asigura\u021Bi-v\u0103 c\u0103 folosi\u021Bi Secret Key (sk_* sau oa_*), NU Public Key (pk_*).`);
      }
      throw new Error(`Revolut API returned status ${fetchResponse.status}: ${errorText}`);
    }
    const orderData = await fetchResponse.json();
    console.log("[REVOLUT] Order created successfully:", orderData.id);
    const checkoutUrl = orderData.checkout_url || `https://checkout.revolut.com/payment?token=${orderData.public_id}`;
    res.json({ url: checkoutUrl });
  } catch (error) {
    console.error("Revolut checkout error:", error);
    res.status(500).json({ error: error.message || "Eroare intern\u0103 Revolut Pay" });
  }
});
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: "Toate c\xE2mpurile sunt obligatorii." });
    }
    try {
      const resend = getResend();
      const { data, error } = await resend.emails.send({
        from: "JuristPRO Contact <contact@juridicpro.ro>",
        to: ["office@developly.pro"],
        replyTo: email,
        subject: `Mesaj nou de la ${name} (Contact JuristPRO)`,
        html: `
          <h2>Mesaj nou de contact</h2>
          <p><strong>Nume:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Mesaj:</strong></p>
          <blockquote style="border-left: 4px solid #ccc; padding-left: 10px; margin-left: 0;">
            ${message.replace(/\n/g, "<br>")}
          </blockquote>
        `
      });
      if (error) {
        console.error("Resend API error:", error);
      }
    } catch (resendError) {
      console.error("Resend execution error (likely missing API key):", resendError);
    }
    res.json({ success: true, message: "Mesajul a fost salvat cu succes." });
  } catch (error) {
    console.error("Contact form error:", error);
    res.status(500).json({ error: "Eroare la procesarea mesajului." });
  }
});
app.post("/api/send-contract-confirmation", async (req, res) => {
  try {
    const { userId, email, orderId, type, planName, amount, credits, billingData } = req.body;
    let targetEmail = email;
    let userName = "Utilizator";
    let userBilling = billingData;
    if (userId) {
      const adminDb = getAdminDb();
      const profileDoc = await adminDb.collection("profiles").doc(userId).get();
      if (profileDoc.exists) {
        const pData = profileDoc.data();
        if (!targetEmail) targetEmail = pData?.email;
        userName = pData?.full_name || "Utilizator";
        if (!userBilling) userBilling = pData?.billing_data;
      }
    }
    if (!targetEmail) {
      return res.status(400).json({ error: "Adresa de email este obligatorie." });
    }
    const sendRes = await sendContractConfirmationEmail({
      email: targetEmail,
      userName,
      orderId: orderId || `ORD_${Date.now()}`,
      type: type || "subscription",
      planName: planName || "expert",
      amount: Number(amount) || 200,
      credits: Number(credits) || 150,
      billingData: userBilling,
      origin: req.headers.origin
    });
    res.json({
      success: sendRes.success,
      message: sendRes.success ? "Confirmarea a fost transmis\u0103 pe email." : "Email-ul a fost procesat cu restric\u021Bie Resend Sandbox.",
      details: sendRes
    });
  } catch (err) {
    console.error("Error sending contract confirmation:", err);
    res.status(500).json({ error: err.message || "Eroare la transmiterea emailului." });
  }
});
app.get("/api/preview-contract-email", (req, res) => {
  const html = generateContractEmailHtml({
    email: req.query.email || "catalinsandu07@gmail.com",
    userName: req.query.name || "C\u0103t\u0103lin Sandu (Avocat / Titular Cabinet)",
    orderId: req.query.orderId || "ORD_2026_EXPERT_8892",
    type: req.query.type || "subscription",
    planName: req.query.plan || "expert",
    amount: Number(req.query.amount) || 200,
    credits: Number(req.query.credits) || 150,
    billingData: {
      type: "juridica",
      name: "Cabinet de Avocat Sandu C\u0103t\u0103lin",
      cui: "RO12345678",
      regCom: "Decizia Baroului Dolj 123/2020",
      address: "Strada \xCEnfr\u0103\u021Birii Nr. 15, Craiova, Dolj"
    },
    origin: `${req.protocol}://${req.get("host")}`
  });
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});
app.get("/api/debug-key", (req, res) => res.json({ env: Object.keys(import_process.default.env).filter((k) => k.includes("GEMINI")).map((k) => `${k}=${import_process.default.env[k]}`) }));
app.post("/api/gemini", async (req, res) => {
  const { contents, systemInstruction } = req.body;
  let { tools } = req.body;
  let rawKey = import_process.default.env.GEMINI_API_KEY || import_process.default.env.API_KEY || "";
  let apiKey = rawKey.trim();
  if (apiKey.startsWith('"') && apiKey.endsWith('"') || apiKey.startsWith("'") && apiKey.endsWith("'")) {
    apiKey = apiKey.slice(1, -1).trim();
  }
  if (apiKey.includes("GEMINI_API_KEY=")) {
    apiKey = apiKey.split("GEMINI_API_KEY=")[1].trim();
  } else if (apiKey.includes("=")) {
    apiKey = apiKey.split("=")[1].trim();
  }
  if (!apiKey || apiKey.length < 8) {
    return res.status(500).json({
      error: "Cheia API Gemini nu este configurat\u0103 sau este incomplet\u0103. V\u0103 rug\u0103m s\u0103 deschide\u021Bi meniul Settings \u2794 Secrets \u0219i s\u0103 salva\u021Bi cheia \xEEn variabila GEMINI_API_KEY."
    });
  }
  let finalTools = [{ googleSearch: {} }];
  let isSearchEnabled = true;
  console.log(`[GEMINI] Google Search Grounding is enabled by default to ensure precise legal references and real-time updates.`);
  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof res.flushHeaders === "function") {
      res.flushHeaders();
    }
    const { GoogleGenAI, HarmCategory, HarmBlockThreshold } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });
    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE }
    ];
    let stream;
    try {
      console.log("[GEMINI] Attempting generation with Google Search grounding enabled...");
      stream = await ai.models.generateContentStream({
        model: "gemini-3-flash-preview",
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
    } catch (streamError) {
      console.warn("[GEMINI] Failed to initiate stream with tools (likely API key restriction). Falling back to non-search generation...", streamError.message);
      stream = await ai.models.generateContentStream({
        model: "gemini-3-flash-preview",
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
      res.write(JSON.stringify(chunk) + "\n");
      const finishReason = chunk.candidates?.[0]?.finishReason;
      if (finishReason) {
        console.log("[GEMINI] Stream chunk finishReason:", finishReason);
      }
    }
    res.end();
  } catch (error) {
    console.error("Gemini proxy error:", error);
    let errMsg = error.message || "Eroare la generarea r\u0103spunsului";
    try {
      const jsonMatch = errMsg.match(/\{.*\}/s);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.error && parsed.error.message) {
          errMsg = parsed.error.message;
        }
      }
    } catch (err) {
    }
    if (errMsg.includes("API key not valid") || errMsg.includes("API_KEY_INVALID")) {
      errMsg = "Cheia API Gemini furnizat\u0103 nu este valid\u0103. V\u0103 rug\u0103m s\u0103 verifica\u021Bi meniul Settings / Secrets \u0219i s\u0103 introduce\u021Bi o cheie API valid\u0103 din Google AI Studio.";
    } else if (errMsg.includes("leaked") || errMsg.includes("reported as leaked")) {
      errMsg = "Cheia API Gemini a fost dezactivat\u0103 de Google deoarece a fost raportat\u0103 ca expus\u0103. V\u0103 rug\u0103m s\u0103 genera\u021Bi o cheie nou\u0103 gratuit\u0103 pe aistudio.google.com \u0219i s\u0103 o introduce\u021Bi \xEEn meniul Settings / Secrets (variabila GEMINI_API_KEY).";
    } else if (errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("429") || errMsg.includes("Quota exceeded")) {
      errMsg = "S-a atins limita de apeluri a cheii API (Quota Exceeded). V\u0103 rug\u0103m s\u0103 a\u0219tepta\u021Bi c\xE2teva momente sau s\u0103 folosi\u021Bi o cheie cu facturare activat\u0103.";
    }
    if (res.headersSent) {
      res.write(JSON.stringify({ error: errMsg }) + "\n");
      res.end();
    } else {
      res.status(500).json({ error: errMsg });
    }
  }
});
app.post("/api/test-whatsapp", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: "Num\u0103rul de telefon este obligatoriu." });
    }
    const gatewayUrl = import_process.default.env.WHATSAPP_GATEWAY_URL;
    if (!gatewayUrl) {
      return res.status(400).json({
        error: "Nu s-a configurat nicio metod\u0103 valid\u0103 de expediere automat\u0103 (lipsesc WHATSAPP_GATEWAY_URL sau WHATSAPP_GATEWAY_TOKEN din Secrets)."
      });
    }
    const testMsg = `\u{1F514} *TEST JURISTPRO*

Conexiunea la robotul t\u0103u WhatsApp func\u021Bioneaz\u0103 perfect! Felicit\u0103ri, e\u0219ti integrat de acum cu succes! \u{1F389}`;
    const result = await sendAutomatedWhatsApp(phone, testMsg);
    if (result.success) {
      res.json({ success: true, message: "Mesajul de test a fost trimis cu succes pe WhatsApp!" });
    } else {
      let details = "";
      if (result.status) details += ` [Status ${result.status}]`;
      if (result.responseText) details += ` R\u0103spuns API: ${result.responseText}`;
      if (result.error) details += ` Eroare: ${result.error}`;
      res.status(500).json({
        error: `Trimiterea a e\u0219uat. V\u0103 rug\u0103m s\u0103 verifica\u021Bi dac\u0103 Token-ul \u0219i URL-ul instan\u021Bei sunt corecte, \u0219i dac\u0103 instan\u021Ba este Autorizat\u0103 (stare scanat\u0103 / conectat QR) \xEEn GreenAPI. Detalii tehnice:${details}`
      });
    }
  } catch (error) {
    console.error("Test WhatsApp error:", error);
    res.status(500).json({ error: error.message || "Eroare intern\u0103 \xEEn timpul trimiterii testului." });
  }
});
async function sendAutomatedWhatsApp(phone, text) {
  let cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.startsWith("00")) {
    cleanPhone = cleanPhone.substring(2);
  }
  if (cleanPhone.startsWith("0") && cleanPhone.length === 10) {
    cleanPhone = "40" + cleanPhone.substring(1);
  } else if (cleanPhone.startsWith("7") && cleanPhone.length === 9) {
    cleanPhone = "40" + cleanPhone;
  }
  console.log(`[WHATSAPP ROBOT] Num\u0103r ini\u021Bial: "${phone}" -> Num\u0103r normalizat: "${cleanPhone}"`);
  const gatewayUrl = import_process.default.env.WHATSAPP_GATEWAY_URL;
  const gatewayToken = import_process.default.env.WHATSAPP_GATEWAY_TOKEN;
  if (gatewayUrl) {
    let finalUrl = gatewayUrl.trim();
    const isGreenApi = finalUrl.includes("green-api.com");
    if (isGreenApi) {
      const hasSendMessage = finalUrl.includes("/sendMessage/");
      if (!hasSendMessage && gatewayToken) {
        let cleanBase = finalUrl.replace(/\/+$/, "");
        const instanceMatch = cleanBase.match(/waInstance(\d+)/i);
        if (instanceMatch) {
          const instanceId = instanceMatch[1];
          const hostMatch = cleanBase.match(/^(https?:\/\/[^\/]+)/i);
          const host = hostMatch ? hostMatch[1] : "https://api.green-api.com";
          finalUrl = `${host}/waInstance${instanceId}/sendMessage/${gatewayToken.trim()}`;
        } else {
          finalUrl = `${cleanBase}/sendMessage/${gatewayToken.trim()}`;
        }
      }
    } else {
      if (gatewayToken && !finalUrl.includes("token=")) {
        finalUrl = finalUrl.includes("?") ? `${finalUrl}&token=${gatewayToken}` : `${finalUrl}?token=${gatewayToken}`;
      }
    }
    console.log(`[WHATSAPP ROBOT] \xCEncercare trimitere prin Gateway API. URL final: ${finalUrl}`);
    try {
      let payload = {
        to: cleanPhone,
        message: text,
        msg: text,
        body: text,
        token: gatewayToken,
        phone: cleanPhone,
        number: cleanPhone
      };
      if (finalUrl.includes("green-api.com")) {
        payload = { chatId: `${cleanPhone}@c.us`, message: text };
      }
      const response = await fetch(finalUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const resText = await response.text();
      console.log(`[WHATSAPP ROBOT] R\u0103spuns Gateway API (Status: ${response.status}):`, resText);
      if (response.ok) {
        return { success: true, status: response.status, responseText: resText };
      } else {
        return { success: false, status: response.status, responseText: resText, error: `Server response code: ${response.status}` };
      }
    } catch (err) {
      console.error("[WHATSAPP ROBOT] Eroare la trimiterea prin Gateway API:", err);
      return { success: false, error: err.message || "Fetch failed" };
    }
  }
  console.warn("[WHATSAPP ROBOT] Nu s-a configurat nicio metod\u0103 automat\u0103 valid\u0103 (WHATSAPP_GATEWAY_URL).");
  return { success: false, error: "Nu este configurat niciun gateway WhatsApp valid." };
}
async function runDeadlineAutomation() {
  console.log("[ROBOT] Se scaneaz\u0103 pro-activ dosarele...");
  const adminDb = getAdminDb();
  try {
    const tomorrow = /* @__PURE__ */ new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    const profilesSnapshot = await adminDb.collection("profiles").get();
    for (const profileDoc of profilesSnapshot.docs) {
      const profile = profileDoc.data();
      const eventsRef = profileDoc.ref.collection("events");
      const eventsSnapshot = await eventsRef.where("event_date", "==", tomorrowStr).where("whatsapp_alert", "==", true).get();
      if (!eventsSnapshot.empty) {
        for (const eventDoc of eventsSnapshot.docs) {
          const event = eventDoc.data();
          const whatsappSent = event["whatsapp_alert_sent"] === true;
          const emailSent = event["email_alert_sent"] === true;
          if (whatsappSent && emailSent) {
            continue;
          }
          console.log(`[ROBOT] ALERT\u0102 TRIGGER: Dosar "${event.title}" pentru utilizatorul ${profile.full_name || "avocat"}`);
          if (!emailSent && profile.email) {
            try {
              const resend = getResend();
              await resend.emails.send({
                from: "JuristPRO Robot <robot@juridicpro.ro>",
                to: [profile.email],
                // Se trimite o copie pe mail-ul de avocat
                subject: `\u26A0\uFE0F ALERT\u0102 TERMEN: Dosar ${event.title}`,
                html: `
                  <div style="font-family: sans-serif; padding: 40px; background: #050505; color: white; border-radius: 20px;">
                    <h1 style="color: #ea580c; font-size: 20px; font-weight: 900; text-transform: uppercase;">JuristPRO Automatizare</h1>
                    <p style="color: #71717a;">Bun\u0103 ziua, Av. ${profile.full_name || "Colegu"},</p>
                    <div style="background: #111; padding: 30px; border-radius: 20px; border: 1px solid #27272a; margin: 30px 0;">
                      <p><strong>DOSAR:</strong> ${event.title}</p>
                      <p><strong>TERMEN:</strong> ${event.event_date} la ${event.event_time}</p>
                      <p><strong>INSTAN\u021A\u0102:</strong> ${event.details || "Nespecificat\u0103"}</p>
                    </div>
                    <p style="font-size: 11px; color: #3f3f46;">Sistemul automat JuristPRO a prelucrat acest dosar.</p>
                  </div>
                `
              });
              await eventDoc.ref.update({
                email_alert_sent: true
              });
              console.log(`[ROBOT] Email trimis cu succes c\u0103tre ${profile.email}`);
            } catch (err) {
              console.error("[ROBOT] Eroare trimitere email intern:", err);
            }
          }
          if (!whatsappSent && profile.phone) {
            const location = event.details || "Nespecificat";
            const notes = event.notes || "F\u0103r\u0103 note adi\u021Bionale";
            const textMessage = `\u{1F514} *ALERTA JURISTPRO - REAMINTIRE 24H*

\u2696\uFE0F *DOSAR:* ${event.title || "Nespecificat"}
\u{1F464} *CLIENT:* ${event.clientName || "Nespecificat"}
\u{1F4C5} *DATA:* ${event.event_date || "..."}
\u{1F552} *ORA:* ${event.event_time || "..."}
\u{1F4C2} *OBIECT:* ${event.type || "Nespecificat"}
\u{1F4CD} *LOCA\u021AIE:* ${location}

\u{1F4DD} *NOTE:* ${notes}

_Mesaj automat generat de c\u0103tre JuristPRO AI_`;
            console.log(`[ROBOT] Se \xEEncearc\u0103 trimiterea automat\u0103 WhatsApp c\u0103tre num\u0103rul: ${profile.phone}`);
            const result = await sendAutomatedWhatsApp(profile.phone, textMessage);
            if (result.success) {
              await eventDoc.ref.update({
                whatsapp_alert_sent: true
              });
              console.log(`[ROBOT] Alerta automat\u0103 WhatsApp a fost expediat\u0103 pentru "${event.title}"`);
            } else {
              console.warn(`[ROBOT] Expedierea automat\u0103 a e\u0219uat. Utilizatorul poate trimite manual via web-app. Eroare:`, result.error || result.responseText);
            }
          }
        }
      }
    }
  } catch (error) {
    if (error.message && error.message.includes("PERMISSION_DENIED")) {
      console.warn("[ROBOT] S\u0103rire ciclu scanare din cauza lipsei de permisiuni pe proiectul curent (Admin SDK).");
    } else {
      console.error("[ROBOT] Eroare critic\u0103 \xEEn ciclul de automatizare:", error);
    }
  }
}
setInterval(runDeadlineAutomation, 8 * 60 * 60 * 1e3);
setTimeout(runDeadlineAutomation, 15e3);
app.get("/robots.txt", (req, res) => {
  const robotsPath = import_path.default.join(__dirname, "robots.txt");
  if (import_fs.default.existsSync(robotsPath)) {
    res.type("text/plain").sendFile(robotsPath);
  } else {
    res.type("text/plain").send("User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin-dashboard\n\nSitemap: https://www.juridicpro.ro/sitemap.xml\n");
  }
});
app.get("/sitemap.xml", (req, res) => {
  const sitemapPath = import_path.default.join(__dirname, "sitemap.xml");
  if (import_fs.default.existsSync(sitemapPath)) {
    res.type("application/xml").sendFile(sitemapPath);
  } else {
    res.status(404).send("Sitemap not found");
  }
});
var distPath = import_path.default.join(__dirname, "dist/juristpro/browser");
console.log("Serving static files from:", distPath);
app.use(import_express.default.static(distPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".html") || import_path.default.basename(filePath) === "index.html" || filePath.endsWith(".js")) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    } else {
      res.setHeader("Cache-Control", "public, max-age=3600");
    }
  }
}));
app.use((req, res) => {
  if (req.accepts("html")) {
    const indexPath = import_path.default.join(distPath, "index.html");
    if (import_fs.default.existsSync(indexPath)) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
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
            <h2>Aplica\u021Bia se actualizeaz\u0103</h2>
            <p>V\u0103 rug\u0103m s\u0103 a\u0219tepta\u021Bi c\xE2teva momente...</p>
          </body>
        </html>
      `);
    }
  } else {
    res.status(404).json({ error: "Not Found" });
  }
});
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
module.exports = app;
