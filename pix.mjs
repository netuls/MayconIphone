/* Confirmação por e-mail para trocar a chave Pix (Resend, sem dependências).
   Variáveis na Netlify: RESEND_API_KEY, PIX_EMAIL_TO, ADMIN_EMAIL, FIREBASE_API_KEY, CODE_SECRET
   Opcional: ALLOWED_ORIGIN (ex.: https://netuls.github.io) */
import { createHmac, timingSafeEqual } from 'node:crypto';

const cors = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin'
};
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
const WIN = 5 * 60 * 1000;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function quem(req) {
  const t = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!t) return null;
  const r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + process.env.FIREBASE_API_KEY, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: t })
  });
  if (!r.ok) return null;
  const u = ((await r.json()).users || [])[0];
  return u ? { uid: u.localId, email: String(u.email || '').toLowerCase() } : null;
}

const limpa = p => ({
  key: String(p?.key || '').trim().slice(0, 120),
  name: String(p?.name || '').trim().slice(0, 25),
  city: String(p?.city || '').trim().slice(0, 15)
});

const gerar = (uid, pix, w) => {
  const h = createHmac('sha256', process.env.CODE_SECRET).update([uid, pix.key, pix.name, pix.city, w].join('|')).digest();
  return String(h.readUInt32BE(0) % 1000000).padStart(6, '0');
};
const igual = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json({ erro: 'Método não permitido.' }, 405);

  const need = ['RESEND_API_KEY', 'PIX_EMAIL_TO', 'ADMIN_EMAIL', 'FIREBASE_API_KEY', 'CODE_SECRET'].filter(k => !process.env[k]);
  if (need.length) { console.error('Variáveis faltando:', need.join(', ')); return json({ erro: 'Servidor sem configuração. Veja as variáveis na Netlify.' }, 500); }

  let b; try { b = await req.json(); } catch { return json({ erro: 'Pedido inválido.' }, 400); }

  let me; try { me = await quem(req); } catch (e) { console.error('Auth:', e); }
  if (!me || me.email !== process.env.ADMIN_EMAIL.toLowerCase()) return json({ erro: 'Sessão inválida. Entre no painel de novo.' }, 401);

  const pix = limpa(b.pix);
  if (!pix.key) return json({ erro: 'Informe a chave Pix.' }, 400);
  const w = Math.floor(Date.now() / WIN);

  if (b.action === 'request') {
    const code = gerar(me.uid, pix, w);
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Painel ' + String(b.shop || 'Loja').slice(0, 40).replace(/[<>"]/g, '') + ' <onboarding@resend.dev>',
          to: [process.env.PIX_EMAIL_TO],
          subject: 'Código para trocar a chave Pix',
          html: '<p>Alguém pediu para trocar a chave Pix da loja.</p>' +
            '<p><b>Nova chave:</b> ' + esc(pix.key) + '<br><b>Recebedor:</b> ' + esc(pix.name) + '<br><b>Cidade:</b> ' + esc(pix.city) + '</p>' +
            '<p>Seu código é <b style="font-size:24px;letter-spacing:3px">' + code + '</b></p>' +
            '<p>Vale por poucos minutos. Se não foi você, ignore este e-mail e troque a senha do painel.</p>'
        })
      });
      if (!r.ok) { console.error('Resend:', r.status, await r.text()); throw new Error('resend'); }
    } catch (e) {
      return json({ erro: 'Não consegui enviar o e-mail. Tente de novo em instantes.' }, 502);
    }
    return json({ ok: true });
  }

  if (b.action === 'confirm') {
    const c = String(b.code || '').replace(/\D/g, '');
    if (c.length !== 6) return json({ erro: 'Digite os 6 dígitos.' }, 400);
    if (igual(c, gerar(me.uid, pix, w)) || igual(c, gerar(me.uid, pix, w - 1))) return json({ ok: true });
    return json({ erro: 'Código incorreto ou vencido.' }, 400);
  }

  return json({ erro: 'Ação inválida.' }, 400);
};

export const config = { path: '/api/pix' };
