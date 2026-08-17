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
app.post("/api/revolut-webhook", async (req, res) => {
  const adminDb = getAdminDb();
  try {
    const payload = req.body;
    console.log("[REVOLUT WEBHOOK] Received payload:", JSON.stringify(payload));
    const eventName = (payload.event || "").toUpperCase();
    const order = payload.order || {};
    const orderId = order.id || payload.order_id || "";
    const metadata = order.metadata || {};
    const userId = metadata.userId;
    if (!userId) {
      console.warn("[REVOLUT WEBHOOK] No userId present in metadata.", metadata);
      return res.json({ received: true });
    }
    if (eventName === "ORDER_COMPLETED" || order.state === "COMPLETED") {
      const type = metadata.type;
      if (type === "subscription") {
        const plan = metadata.plan;
        const credits = plan === "expert" ? 150 : 500;
        const profileDoc = await adminDb.collection("profiles").doc(userId).get();
        const currentCredits = profileDoc.exists ? profileDoc.data()?.credits || 0 : 0;
        const userName = profileDoc.exists ? profileDoc.data()?.full_name || "User" : "User";
        const billingData = profileDoc.exists ? profileDoc.data()?.billing_data || null : null;
        await adminDb.collection("profiles").doc(userId).update({
          plan,
          status: "active",
          credits: currentCredits + credits,
          revolut_order_id: orderId
        });
        await adminDb.collection("transactions").add({
          user_id: userId,
          user_name: userName,
          billing_data: billingData,
          amount: order.amount ? order.amount / 100 : plan === "expert" ? 200 : 500,
          type: "subscription",
          description: `Abonament ${plan.toUpperCase()} (Revolut Pay)`,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        });
        console.log(`[REVOLUT WEBHOOK] Successfully upgraded subscription for user ${userId} to ${plan}`);
      } else if (type === "topup") {
        const amount = Number(metadata.amount || "0");
        const credits = Number(metadata.credits || "0");
        const profileDoc = await adminDb.collection("profiles").doc(userId).get();
        const currentCredits = profileDoc.exists ? profileDoc.data()?.credits || 0 : 0;
        const userName = profileDoc.exists ? profileDoc.data()?.full_name || "User" : "User";
        const billingData = profileDoc.exists ? profileDoc.data()?.billing_data || null : null;
        await adminDb.collection("profiles").doc(userId).update({
          credits: currentCredits + credits
        });
        await adminDb.collection("transactions").add({
          user_id: userId,
          user_name: userName,
          billing_data: billingData,
          amount,
          type: "top-up",
          description: `Top-Up ${credits} Credite (Revolut Pay)`,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        });
        console.log(`[REVOLUT WEBHOOK] Successfully processed top-up for user ${userId}`);
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
app.post("/api/create-revolut-order", async (req, res) => {
  try {
    const { type, plan, amount, credits, userId, email } = req.body;
    if (!userId) {
      res.status(400).json({ error: "User ID is required" });
      return;
    }
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
          const billingData = profileDoc.exists ? profileDoc.data()?.billing_data || null : null;
          await adminDb.collection("profiles").doc(userId).update({
            plan,
            status: "active",
            credits: currentCredits + creditsToAdd,
            revolut_order_id: "mock_revolut_order_" + Date.now()
          });
          await adminDb.collection("transactions").add({
            user_id: userId,
            user_name: userName,
            billing_data: billingData,
            amount: plan === "expert" ? 200 : 500,
            type: "subscription",
            description: `Abonament ${plan.toUpperCase()} (Test Revolut)`,
            created_at: (/* @__PURE__ */ new Date()).toISOString()
          });
        } else if (type === "topup") {
          const creditsToAdd = Number(credits) || 0;
          const profileDoc = await adminDb.collection("profiles").doc(userId).get();
          const currentCredits = profileDoc.exists ? profileDoc.data()?.credits || 0 : 0;
          const userName = profileDoc.exists ? profileDoc.data()?.full_name || "User" : "User";
          const billingData = profileDoc.exists ? profileDoc.data()?.billing_data || null : null;
          await adminDb.collection("profiles").doc(userId).update({
            credits: currentCredits + creditsToAdd
          });
          await adminDb.collection("transactions").add({
            user_id: userId,
            user_name: userName,
            billing_data: billingData,
            amount: Number(amount) || 0,
            type: "top-up",
            description: `Top-Up ${creditsToAdd} Credite (Test Revolut)`,
            created_at: (/* @__PURE__ */ new Date()).toISOString()
          });
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
        from: "JuristPRO Contact <onboarding@resend.dev>",
        to: ["office@developly.pro"],
        // Resend test domain only allows sending to the registered account email
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
app.get("/api/debug-key", (req, res) => res.json({ env: Object.keys(import_process.default.env).filter((k) => k.includes("GEMINI")).map((k) => `${k}=${import_process.default.env[k]}`) }));
app.post("/api/gemini", async (req, res) => {
  const { contents, systemInstruction } = req.body;
  let { tools } = req.body;
  if (!import_process.default.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "Cheia API Gemini nu este configurat\u0103 pe server." });
  }
  const apiKey = import_process.default.env.GEMINI_API_KEY.trim();
  console.log("[GEMINI] Using API key:", apiKey.substring(0, 5) + "...");
  if (!apiKey.startsWith("AIza")) {
    return res.status(500).json({
      error: "Cheia API Gemini configurat\u0103 \xEEn aplica\u021Bie nu este valid\u0103. V\u0103 rug\u0103m s\u0103 verifica\u021Bi set\u0103rile (Secrets) aplica\u021Biei."
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
    if (errMsg.includes("API key not valid")) {
      errMsg = "Cheia API Gemini furnizat\u0103 nu este valid\u0103. V\u0103 rug\u0103m s\u0103 verifica\u021Bi meniul Settings (Secrets) \u0219i s\u0103 introduce\u021Bi o cheie API valid\u0103 din Google AI Studio.";
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
                from: "JuristPRO Robot <robot@developly.pro>",
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
