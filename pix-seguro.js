/* Troca de chave Pix com código no WhatsApp. Carregar no admin.html depois do script principal. */
(function(){
const API=(typeof PIX_API!=='undefined'?String(PIX_API).replace(/\/$/,''):'')+'/api/pix';
const same=(a,b)=>['key','name','city'].every(k=>(a[k]||'')===(b[k]||''));
async function call(body){
 const t=await auth.currentUser.getIdToken();
 const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+t},body:JSON.stringify(body)});
 const d=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(d.erro||'Erro '+r.status);
 return d}
function modal(html){const m=document.createElement('div');
 m.style.cssText='position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px';
 m.innerHTML='<div class="card" style="max-width:380px;width:100%;margin:0">'+html+'</div>';document.body.append(m);return m}
async function pedirCodigo(np){
 try{await call({action:'request',pix:np,shop:CFG.shop})}catch(e){toast(e.message);return false}
 return new Promise(res=>{
  const m=modal('<h2>Confirmar nova chave Pix</h2><p class="mut">Enviamos um código de 6 dígitos para o e-mail cadastrado (olhe também o spam). Ele vale por 5 minutos.</p><input id="pxc" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="000000" aria-label="Código"><div class="err" id="pxe"></div><div class="bar2"><button class="btn" id="pxok">Confirmar</button><button class="btn g" id="pxre">Reenviar código</button><button class="btn g" id="pxno">Cancelar</button></div>');
  const inp=m.querySelector('#pxc'),er=m.querySelector('#pxe'),close=v=>{m.remove();res(v)};
  inp.focus();
  m.querySelector('#pxno').onclick=()=>close(false);
  m.querySelector('#pxre').onclick=async()=>{er.textContent='';try{await call({action:'request',pix:np,shop:CFG.shop});toast('Novo código enviado')}catch(e){er.textContent=e.message}};
  m.querySelector('#pxok').onclick=async()=>{er.textContent='';const c=inp.value.replace(/\D/g,'');if(c.length!==6){er.textContent='Digite os 6 dígitos.';return}
   try{await call({action:'confirm',code:c});close(true)}catch(e){er.textContent=e.message}}
 })}
saveCfg=async function(){readCfg();
 const bad=CFG.pays.find(p=>p.type!=='pix'&&(p.link||'').trim()&&!/^https?:\/\//i.test(p.link.trim()));
 if(bad)return toast('O link de "'+(bad.name||'pagamento')+'" precisa começar com https://');
 CFG.pays=CFG.pays.filter(p=>(p.name||'').trim()).map(p=>({...p,name:p.name.trim(),link:(p.link||'').trim(),info:(p.info||'').trim()}));
 PAYS=CFG.pays;
 if(!FB){await store.set('config',CFG);toast('Configurações salvas');return cfgTab(true)}
 const np={key:'',name:'',city:'',...CFG.pix};
 let sp;
 try{const s=await fdb.doc('app/config').get();sp=s.exists&&s.data().v?s.data().v.pix:undefined}
 catch(_){return toast('Não deu para ler as configurações. Tente de novo.')}
 const w={...CFG};if(sp)w.pix=sp;else delete w.pix;
 try{await store.set('config',w)}catch(_){return toast('Erro ao salvar as configurações')}
 const old={key:'',name:'',city:'',...(sp||{})};
 if(same(np,old)){toast('Configurações salvas');return cfgTab(true)}
 const ok=await pedirCodigo(np);
 if(ok){CFG.pix=np;toast('Chave Pix alterada')}
 else{CFG.pix=old;toast('Chave Pix não alterada. O resto foi salvo.')}
 cfgTab(true)};
})();
