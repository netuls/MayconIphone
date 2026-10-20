/* Vercel Function: api/pix.js
   Troca da chave Pix com código de 6 dígitos enviado por e-mail (Gmail com senha de app, grátis).
   Variáveis de ambiente na Vercel:
   FIREBASE_SERVICE_ACCOUNT  JSON completo da conta de serviço do Firebase
   ADMIN_EMAIL               e-mail do login do painel admin
   GMAIL_USER                Gmail que envia o código, ex.: fulano@gmail.com
   GMAIL_APP_PASSWORD        senha de app de 16 letras gerada nesse Gmail
   EMAIL_TO                  (opcional) e-mail que recebe o código; sem isso, manda para o próprio GMAIL_USER
   ALLOWED_ORIGIN            origem do site, ex.: https://netuls.github.io */
const admin = require('firebase-admin');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
}
const db = admin.firestore();
const TTL = 5 * 60 * 1000, GAP = 60 * 1000, MAX_TRIES = 5;

const hash = (code, salt) => crypto.createHash('sha256').update(salt + code).digest('hex');
const safeEq = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const mask = k => k.length <= 6 ? k.slice(0, 2) + '***' : k.slice(0, 3) + '***' + k.slice(-3);

function cors(req, res) {
  const o = process.env.ALLOWED_ORIGIN;
  if (o && req.headers.origin === o) {
    res.setHeader('Access-Control-Allow-Origin', o);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

async function pedir(b, ref, res) {
  const p = b.pix || {};
  const pix = {
    key: String(p.key || '').trim().slice(0, 100),
    name: String(p.name || '').trim().slice(0, 25),
    city: String(p.city || '').trim().slice(0, 15)
  };
  if (!pix.key) return res.status(400).json({ erro: 'Informe a chave Pix.' });
  const s = await ref.get();
  if (s.exists && Date.now() - s.data().at < GAP) {
    return res.status(429).json({ erro: 'Aguarde 1 minuto para pedir outro código.' });
  }
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const salt = crypto.randomBytes(8).toString('hex');
  await ref.set({ hash: hash(code, salt), salt, pix, at: Date.now(), exp: Date.now() + TTL, tries: 0 });

  const shop = String(b.shop || '').replace(/[\r\n"<>]/g, '').slice(0, 40) || 'a loja';
  const text = `Código para trocar a chave Pix de ${shop}: ${code}\nNova chave: ${mask(pix.key)}\nVale por 5 minutos. Se não foi você, ignore esta mensagem.`;
  let ok = false;
  try {
    const tr = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
    });
    await tr.sendMail({
      from: `"${shop}" <${process.env.GMAIL_USER}>`,
      to: process.env.EMAIL_TO || process.env.GMAIL_USER,
      subject: `Código para trocar a chave Pix: ${code}`,
      text
    });
    ok = true;
  } catch (e) { console.error(e); }
  if (!ok) {
    await ref.delete();
    return res.status(502).json({ erro: 'Não consegui enviar o e-mail. Tente de novo em instantes. Tente de novo em instantes.' });
  }
  res.json({ ok: true });
}

async function confirmar(b, ref, res) {
  const code = String(b.code || '').replace(/\D/g, '');
  const out = await db.runTransaction(async t => {
    const s = await t.get(ref);
    if (!s.exists) return { st: 400, erro: 'Peça um código primeiro.' };
    const d = s.data();
    if (Date.now() > d.exp) { t.delete(ref); return { st: 400, erro: 'Código expirado. Peça outro.' }; }
    if (d.tries >= MAX_TRIES) { t.delete(ref); return { st: 429, erro: 'Muitas tentativas. Peça outro código.' }; }
    if (code.length !== 6 || !safeEq(hash(code, d.salt), d.hash)) {
      t.update(ref, { tries: d.tries + 1 });
      return { st: 400, erro: 'Código incorreto.' };
    }
    t.set(db.doc('app/config'), { v: { pix: d.pix } }, { merge: true });
    t.delete(ref);
    return { st: 200 };
  });
  if (out.st !== 200) return res.status(out.st).json({ erro: out.erro });
  res.json({ ok: true });
}

module.exports = async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido.' });
  try {
    const tok = (req.headers.authorization || '').replace(/^Bearer /, '');
    const u = await admin.auth().verifyIdToken(tok).catch(() => null);
    const adm = String(process.env.ADMIN_EMAIL || '').toLowerCase();
    if (!u || !u.email || !adm || u.email.toLowerCase() !== adm) {
      return res.status(401).json({ erro: 'Sem permissão.' });
    }
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const ref = db.doc('pixcodes/' + u.uid);
    if (b.action === 'request') return await pedir(b, ref, res);
    if (b.action === 'confirm') return await confirmar(b, ref, res);
    res.status(400).json({ erro: 'Ação inválida.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro no servidor.' });
  }
};
