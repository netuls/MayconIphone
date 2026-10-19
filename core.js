/* Núcleo compartilhado entre index.html e admin.html */
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BRL=n=>(+n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const R=n=>n>0?BRL(n):'A consultar';
const uid=()=>Math.random().toString(36).slice(2,9),digits=s=>String(s||'').replace(/\D/g,'');
const FB=!!(window.firebase&&typeof FIREBASE_CONFIG!=='undefined'&&FIREBASE_CONFIG.apiKey);
let fdb,auth;if(FB){firebase.initializeApp(FIREBASE_CONFIG);fdb=firebase.firestore();auth=firebase.auth()}
const ICON='<svg viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>';
const DS=[['Troca de Tela 1ª Linha',250],['Troca de Bateria',180],['Troca de Conector',180],['Troca de Vidro',200],['Troca de Carcaça',350],['Troca de Tampa',250],['Troca de Lente',180]];
const mkS=l=>l.map(([name,price])=>({id:uid(),name,price}));
const seed=()=>['iPhone 7','iPhone 7 Plus','iPhone 8','iPhone 8 Plus','iPhone X','iPhone XS','iPhone XR','iPhone XS Max','iPhone 11','iPhone 11 Pro','iPhone 11 Pro Max','iPhone 12 mini','iPhone 12','iPhone 12 Pro','iPhone 12 Pro Max','iPhone 13 mini','iPhone 13','iPhone 13 Pro','iPhone 13 Pro Max','iPhone 14','iPhone 14 Plus','iPhone 14 Pro','iPhone 14 Pro Max','iPhone 15','iPhone 15 Plus','iPhone 15 Pro','iPhone 15 Pro Max'].map(name=>({id:uid(),brand:'Apple',name,prazo:'1h a 5h',services:mkS(DS)}));
const DPAYS=[{id:'pix',name:'Pix',type:'pix'},{id:'cartao',name:'Cartão',type:'outro',link:'',info:'Pagamento na loja, na maquininha.'}];
const DCFG={shop:'Maycon iPhone',zap:'',pix:{key:'',name:'',city:''},pays:DPAYS};
const LS=k=>JSON.parse(localStorage.getItem(k)||'[]');
const store={
 async get(k,d){if(FB){const s=await fdb.doc('app/'+k).get();return s.exists?s.data().v:d}const v=localStorage.getItem('mi_'+k);return v?JSON.parse(v):d},
 async set(k,v){if(FB)return fdb.doc('app/'+k).set({v});localStorage.setItem('mi_'+k,JSON.stringify(v))},
 async addOrder(o){if(FB)return fdb.collection('orders').doc(o.id).set(o);const l=LS('mi_orders');l.unshift(o);localStorage.setItem('mi_orders',JSON.stringify(l))},
 async orders(){if(FB){const s=await fdb.collection('orders').orderBy('at','desc').limit(80).get();return s.docs.map(d=>d.data())}return LS('mi_orders')},
 async upOrder(id,p){if(FB)return fdb.collection('orders').doc(id).update(p);const l=LS('mi_orders');Object.assign(l.find(x=>x.id===id),p);localStorage.setItem('mi_orders',JSON.stringify(l))},
 /* Apaga uma lista de orçamentos do banco (ou do armazenamento local). */
 async delOrders(list){const ids=list.map(o=>o.id);if(FB){const b=fdb.batch();ids.forEach(i=>b.delete(fdb.collection('orders').doc(i)));await b.commit();return}localStorage.setItem('mi_orders',JSON.stringify(LS('mi_orders').filter(o=>!ids.includes(o.id))))},
 async getOrder(id){if(FB){const s=await fdb.collection('orders').doc(id).get();return s.exists?s.data():null}return LS('mi_orders').find(x=>x.id===id)||null},
 /* Clientes (chave = WhatsApp só com dígitos, sem o 55) */
 ck:t=>digits(t).replace(/^55/,''),
 async getCustomer(t){const k=store.ck(t);if(FB){const s=await fdb.collection('customers').doc(k).get();return s.exists?s.data():null}return LS('mi_customers').find(x=>x.id===k)||null},
 async saveCustomer(c,total){const k=store.ck(c.tel),n=Date.now();
  if(FB)return fdb.collection('customers').doc(k).set({id:k,nome:c.nome,sobrenome:c.sobrenome,tel:c.tel,lastAt:n,orders:firebase.firestore.FieldValue.increment(1),spent:firebase.firestore.FieldValue.increment(total||0)},{merge:true});
  const l=LS('mi_customers');let x=l.find(y=>y.id===k);if(!x){x={id:k,orders:0,spent:0};l.unshift(x)}
  Object.assign(x,{nome:c.nome,sobrenome:c.sobrenome,tel:c.tel,lastAt:n});x.orders++;x.spent+=total||0;localStorage.setItem('mi_customers',JSON.stringify(l))},
 async setCustomer(c){if(FB)return fdb.collection('customers').doc(c.id).set(c,{merge:true});const l=LS('mi_customers'),i=l.findIndex(y=>y.id===c.id);i<0?l.unshift(c):l[i]={...l[i],...c};localStorage.setItem('mi_customers',JSON.stringify(l))},
 async customers(){if(FB){const s=await fdb.collection('customers').orderBy('lastAt','desc').limit(500).get();return s.docs.map(d=>d.data())}return LS('mi_customers')},
 async delCustomer(id){if(FB)return fdb.collection('customers').doc(id).delete();localStorage.setItem('mi_customers',JSON.stringify(LS('mi_customers').filter(x=>x.id!==id)))}
};
let CAT=[],CFG=DCFG,SL=[];
async function loadData(){try{CAT=await store.get('catalog',null);if(!CAT){CAT=seed();if(!FB)await store.set('catalog',CAT)}CFG={...DCFG,...await store.get('config',{})};CFG.pix={...DCFG.pix,...CFG.pix};SL=await store.get('slides',[])||[]}catch(e){CAT=CAT||seed()}}
function toast(t){const e=document.createElement('div');e.className='toast';e.textContent=t;document.body.append(e);setTimeout(()=>e.remove(),2600)}
let deferred;addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;const b=$('#inst');if(b)b.hidden=false});
async function install(){if(deferred){deferred.prompt();deferred=null}else alert('No iPhone: toque em Compartilhar e depois em Adicionar à Tela de Início.')}
const head=(extra='')=>`<header class="top"><div class="wrap"><img src="logo.png" alt="${esc(CFG.shop)}"><div class="acts">${extra}<button id="inst" class="btn g s" onclick="install()" ${deferred?'':'hidden'}>Instalar app</button></div></div></header>`;
/* Pix (BR Code) */
function crc(s){let c=0xFFFF;for(let i=0;i<s.length;i++){c^=s.charCodeAt(i)<<8;for(let j=0;j<8;j++)c=c&0x8000?((c<<1)^0x1021)&0xFFFF:(c<<1)&0xFFFF}return c.toString(16).toUpperCase().padStart(4,'0')}
function pixCode(p,amt){const a=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,'').toUpperCase();
 const f=(i,v)=>i+String(v.length).padStart(2,'0')+v;
 const s=f('00','01')+f('26',f('00','br.gov.bcb.pix')+f('01',p.key.trim()))+f('52','0000')+f('53','986')+(amt>0?f('54',amt.toFixed(2)):'')+f('58','BR')+f('59',a(p.name).slice(0,25)||'LOJA')+f('60',a(p.city).slice(0,15)||'CIDADE')+f('62',f('05','***'))+'6304';
 return s+crc(s)}
/* Status dos pedidos */
const FLOW=['analise','reparo','pronto','entregue'];
const stKey=o=>o.status==='novo'?'analise':o.status;
/* Garantia (somente painel admin): tela = 3 meses, bateria = 6 meses */
const GAR={tela:{n:'Garantia de tela',m:3},bateria:{n:'Garantia de bateria',m:6}};
const garAte=(t,from=Date.now())=>{const d=new Date(from);d.setMonth(d.getMonth()+GAR[t].m);return d};
const garMsg=(o,t,ate)=>`Olá, ${o.nome}! Tudo bem? 😊

Informamos que o seu ${o.brand} ${o.model} está com a *${GAR[t].n.toLowerCase()}* ativa na ${CFG.shop}.

📌 *Cobertura:* ${t==='tela'?'tela substituída':'bateria substituída'}
📅 *Prazo:* ${GAR[t].m} meses, válida até *${ate.toLocaleDateString('pt-BR')}*

A garantia cobre defeitos de peça e de serviço. Ela não cobre danos por queda, contato com líquidos, mau uso ou abertura do aparelho por terceiros.

Se notar qualquer problema, é só nos chamar por aqui. Agradecemos pela confiança!`;
const ST={
 aguardando_pagamento:{n:'Aguardando pagamento'},
 analise:{n:'Em análise'},
 reparo:{n:'Em reparo',msg:o=>`Olá, ${o.nome}! Tudo bem? 😊\n\nPassando para avisar que o seu ${o.brand} ${o.model} já está *em reparo* aqui na ${CFG.shop}. Nossa equipe está cuidando dele com todo o carinho e atenção.\n\nAssim que estiver pronto, entraremos em contato. Qualquer dúvida, é só nos chamar por aqui.`},
 pronto:{n:'Pronto para retirada',msg:o=>`Olá, ${o.nome}! Boas notícias! 🎉\n\nO seu ${o.brand} ${o.model} está *pronto para retirada* na ${CFG.shop}. Sabemos que ficar sem o aparelho não é fácil, então agradecemos muito a sua paciência.\n\nEstamos aguardando você. Se precisar combinar um horário, é só responder esta mensagem.`},
 entregue:{n:'Entregue',msg:o=>`Olá, ${o.nome}! O seu ${o.brand} ${o.model} foi *entregue*. 😊\n\nAgradecemos de coração pela confiança na ${CFG.shop}. Se notar qualquer coisa diferente ou precisar de ajuda, conte com a gente.\n\nFoi um prazer atender você!`},
 garantia:{n:'Garantia'},
 feito:{n:'Atendido'}
};
/* Carrossel (fotos cadastradas no painel admin).
   Visual integrado ao fundo escuro azul do site: sem moldura preta, sem caixa,
   bordas esmaecidas em todos os lados e brilho azul atrás da foto.
   Use PNG sem fundo para o melhor efeito. */
document.head.insertAdjacentHTML('beforeend',`<style>
.car{position:relative;aspect-ratio:3/2;border-radius:0;overflow:hidden;background:transparent;box-shadow:none;touch-action:pan-y;
 -webkit-mask-image:linear-gradient(to right,transparent,#000 10%,#000 90%,transparent),linear-gradient(to bottom,transparent,#000 8%,#000 92%,transparent);
 -webkit-mask-composite:source-in;
 mask-image:linear-gradient(to right,transparent,#000 10%,#000 90%,transparent),linear-gradient(to bottom,transparent,#000 8%,#000 92%,transparent);
 mask-composite:intersect}
.car::before{content:"";position:absolute;inset:8% 10%;z-index:0;background:radial-gradient(closest-side,rgba(30,107,255,.38),transparent 75%);filter:blur(24px);pointer-events:none}
.car .sl{position:absolute;inset:0;opacity:0;transition:opacity 1.2s ease}
.car .sl.on{opacity:1;z-index:1}
.car .sl img{width:100%;height:100%;object-fit:contain;display:block;transform:scale(1.08);transition:transform 6.5s ease-out;filter:drop-shadow(0 10px 30px rgba(30,107,255,.45))}
.car .sl.on img{transform:scale(1)}
.car .cap{position:absolute;left:0;right:0;bottom:0;padding:48px 20px 34px;background:linear-gradient(transparent,rgba(5,8,26,.85));color:#fff;font-weight:700;font-size:18px;line-height:1.3;text-align:center;transform:translateY(18px);opacity:0;transition:transform .8s .5s,opacity .8s .5s}
.car .sl.on .cap{transform:none;opacity:1}
.car .dots{position:absolute;z-index:2;bottom:12px;left:0;right:0;display:flex;justify-content:center;gap:6px}
.car .dots button{width:8px;height:8px;border-radius:8px;border:0;padding:0;background:rgba(255,255,255,.4);transition:all .35s;cursor:pointer}
.car .dots button.on{width:24px;background:var(--p3,#7cc4ff)}
.car .bar{display:none}
@media (prefers-reduced-motion:reduce){.car .sl img,.car .sl.on img{transform:none;transition:none}}
</style>`);
function carHTML(){if(!SL.length)return '';const l=SL;
 return `<div class="car" id="car">${l.map((s,i)=>`<div class="sl ${i?'':'on'}"><img src="${esc(s.img)}" alt="${esc(s.txt||CFG.shop)}">${s.txt?`<div class="cap">${esc(s.txt)}</div>`:''}</div>`).join('')}${l.length>1?`<div class="dots">${l.map((_,i)=>`<button aria-label="Foto ${i+1}" class="${i?'':'on'}" onclick="carGo(${i})"></button>`).join('')}</div><div class="bar"></div>`:''}</div>`}
let CI=0,CT;
function carGo(i){const c=$('#car');clearInterval(CT);if(!c)return;const s=c.querySelectorAll('.sl');if(s.length<2)return;
 CI=(i+s.length)%s.length;s.forEach((e,j)=>e.classList.toggle('on',j===CI));c.querySelectorAll('.dots button').forEach((e,j)=>e.classList.toggle('on',j===CI));
 CT=setInterval(()=>carGo(CI+1),5000)}
function carStart(){const c=$('#car');if(!c)return;let x=0;c.addEventListener('touchstart',e=>{x=e.touches[0].clientX},{passive:true});
 c.addEventListener('touchend',e=>{const d=e.changedTouches[0].clientX-x;if(Math.abs(d)>40)carGo(CI+(d<0?1:-1))});carGo(0)}