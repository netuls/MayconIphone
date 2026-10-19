const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
admin.initializeApp();

// Dica: use a mesma região do seu Firestore (ex.: region: 'southamerica-east1')
exports.novoOrcamento = onDocumentCreated('orders/{id}', async (event) => {
  const o = event.data.data();
  const db = admin.firestore();
  const snap = await db.collection('adminTokens').get();
  const tokens = snap.docs.map(d => d.id);
  if (!tokens.length) return;

  const total = Number(o.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const res = await admin.messaging().sendEachForMulticast({
    tokens,
    data: {
      title: 'Novo orçamento',
      body: `${o.nome} ${o.sobrenome} · ${o.brand} ${o.model} · ${total}`,
      url: 'admin.html'
    },
    webpush: { headers: { Urgency: 'high' } }
  });

  // remove aparelhos que não recebem mais
  const bad = [];
  res.responses.forEach((r, i) => {
    if (!r.success && ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(r.error && r.error.code)) bad.push(tokens[i]);
  });
  await Promise.all(bad.map(t => db.collection('adminTokens').doc(t).delete()));
});
