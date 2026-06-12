window.Calc = (() => {
  function sim(pv, taxa, n) { const i=taxa/100; return i===0?pv/n:pv*(i*Math.pow(1+i,n))/(Math.pow(1+i,n)-1); }

  function runCDC() {
    const val=parseFloat(document.getElementById('cdc-val')?.value)||80000;
    const ent=parseFloat(document.getElementById('cdc-ent')?.value)||20000;
    const n=parseInt(document.getElementById('cdc-n')?.value)||48;
    const pv=val-ent;
    const adj=0;
    const banks=[{n:'Banco do Brasil',t:1.49},{n:'Caixa Econômica',t:1.55},{n:'Itaú',t:1.62},{n:'BV Financeira',t:1.65},{n:'Bradesco',t:1.71},{n:'Santander',t:1.79}];
    const rows=banks.map((b,i)=>{const p=sim(pv,b.t,n);const tot=p*n+ent;const j=tot-val;return`<tr ${i===0?'style="background:rgba(16,185,129,.07)"':''}><td style="padding:7px 10px;border:1px solid var(--border)">${i===0?'⭐ ':''}${b.n}</td><td style="padding:7px 10px;border:1px solid var(--border);text-align:center;color:var(--muted)">${b.t}%</td><td style="padding:7px 10px;border:1px solid var(--border);text-align:center;color:var(--q4);font-weight:600">R$${Math.round(p).toLocaleString('pt-BR')}</td><td style="padding:7px 10px;border:1px solid var(--border);text-align:center">R$${Math.round(tot).toLocaleString('pt-BR')}</td><td style="padding:7px 10px;border:1px solid var(--border);text-align:center;color:var(--red)">R$${Math.round(j).toLocaleString('pt-BR')}</td></tr>`;}).join('');
    const el=document.getElementById('cdc-result');
    if(el) el.innerHTML=`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.79rem;min-width:460px"><tr style="background:rgba(124,58,237,.15)"><th style="padding:8px 10px;text-align:left;border:1px solid var(--border);color:var(--q4)">Banco</th><th style="padding:8px 10px;border:1px solid var(--border);color:var(--q4)">Taxa/mês</th><th style="padding:8px 10px;border:1px solid var(--border);color:var(--q4)">Parcela ${n}x</th><th style="padding:8px 10px;border:1px solid var(--border);color:var(--q4)">Total Pago</th><th style="padding:8px 10px;border:1px solid var(--border);color:var(--q4)">Juros</th></tr>${rows}</table></div><div class="callout warn" style="margin-top:10px;font-size:.73rem">⚠️ Simulação estimada. CET real inclui IOF e tarifas.</div>`;
  }

  function runFipe() {
    const m=document.getElementById('fipe-modelo')?.value?.trim();
    const a=parseInt(document.getElementById('fipe-ano')?.value)||2020;
    const k=parseInt(document.getElementById('fipe-km')?.value)||60000;
    const p=parseFloat(document.getElementById('fipe-preco')?.value)||0;
    const base=parseFloat(document.getElementById('fipe-base')?.value)||70000;
    if(!m){alert('Informe o modelo.');return;}
    const anos=2025-a;
    const fipe=base*Math.pow(0.925,anos);
    const jMin=Math.max(fipe*.87,fipe-(Math.max(0,k-15000*anos)*.4));
    const jMax=fipe*1.04;
    const oferta=jMin*.93;
    let v='',vc='';
    if(p>0){if(p<jMin*.82){v='🚨 SUSPEITO — muito abaixo da FIPE. Risco de fraude!';vc='error';}else if(p>jMax*1.18){v='⚠️ ACIMA DO MERCADO — negocie para baixo';vc='warn';}else{v='✅ PREÇO ADEQUADO — dentro da faixa justa';vc='ok';}}
    const el=document.getElementById('fipe-result');
    if(el) el.innerHTML=`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px">
      <div style="background:var(--s3);border:1px solid var(--border);border-radius:8px;padding:12px;text-align:center"><div style="font-family:'JetBrains Mono',monospace;font-size:.58rem;color:var(--muted);margin-bottom:4px">FIPE EST.</div><div style="font-family:'Bebas Neue',sans-serif;font-size:1.3rem;color:var(--q4)">R$${Math.round(fipe).toLocaleString('pt-BR')}</div></div>
      <div style="background:var(--s3);border:1px solid rgba(16,185,129,.4);border-radius:8px;padding:12px;text-align:center"><div style="font-family:'JetBrains Mono',monospace;font-size:.58rem;color:var(--muted);margin-bottom:4px">FAIXA JUSTA</div><div style="font-family:'Bebas Neue',sans-serif;font-size:.95rem;color:var(--green)">R$${Math.round(jMin).toLocaleString('pt-BR')}<br>R$${Math.round(jMax).toLocaleString('pt-BR')}</div></div>
      <div style="background:var(--s3);border:1px solid rgba(251,191,36,.35);border-radius:8px;padding:12px;text-align:center"><div style="font-family:'JetBrains Mono',monospace;font-size:.58rem;color:var(--muted);margin-bottom:4px">OFERTA IDEAL</div><div style="font-family:'Bebas Neue',sans-serif;font-size:1.3rem;color:var(--gold)">R$${Math.round(oferta).toLocaleString('pt-BR')}</div></div>
    </div>${v?`<div class="callout ${vc}" style="font-size:.81rem">${v}</div>`:''}<div style="font-size:.7rem;color:var(--muted);font-family:'JetBrains Mono',monospace">⚠️ Estimativa. Confirme em fipe.org.br</div>`;
  }

  function runTCO() {
    const val=parseFloat(document.getElementById('tco-val')?.value)||80000;
    const km=parseInt(document.getElementById('tco-km')?.value)||1500;
    const cons=parseFloat(document.getElementById('tco-cons')?.value)||12;
    const gas=parseFloat(document.getElementById('tco-gas')?.value)||6.2;
    const seg=parseFloat(document.getElementById('tco-seg')?.value)||250;
    const parc=parseFloat(document.getElementById('tco-parc')?.value)||0;
    const ipva=val*.04/12;
    const comb=(km/cons)*gas;
    const manut=val>100000?3500/12:1800/12;
    const total=ipva+comb+manut+seg+parc;
    const pkm=total/km;
    const items=[['🛢️ Combustível',comb],['🛡️ Seguro',seg],['📋 IPVA',ipva],['🔧 Manutenção',manut]];
    if(parc>0) items.push(['💰 Parcela',parc]);
    const bars=items.map(([l,v])=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px"><span style="font-size:.79rem;min-width:130px">${l}</span><div style="flex:1;background:var(--s3);border-radius:3px;height:5px;overflow:hidden"><div style="width:${Math.min(100,v/total*100).toFixed(0)}%;height:100%;background:linear-gradient(90deg,var(--q1),var(--q3))"></div></div><span style="font-family:'JetBrains Mono',monospace;font-size:.73rem;color:var(--q4);width:70px;text-align:right">R$${Math.round(v).toLocaleString('pt-BR')}</span></div>`).join('');
    const el=document.getElementById('tco-result');
    if(el) el.innerHTML=`<div style="margin-bottom:14px">${bars}</div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px"><div style="background:linear-gradient(135deg,rgba(124,58,237,.12),rgba(0,245,255,.04));border:1px solid var(--border2);border-radius:10px;padding:12px;text-align:center"><div style="font-family:'JetBrains Mono',monospace;font-size:.58rem;color:var(--muted)">CUSTO/MÊS</div><div style="font-family:'Bebas Neue',sans-serif;font-size:1.8rem;background:linear-gradient(135deg,var(--q4),var(--neon));-webkit-background-clip:text;-webkit-text-fill-color:transparent">R$${Math.round(total).toLocaleString('pt-BR')}</div></div><div style="background:var(--s3);border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center"><div style="font-family:'JetBrains Mono',monospace;font-size:.58rem;color:var(--muted)">CUSTO/KM</div><div style="font-family:'Bebas Neue',sans-serif;font-size:1.5rem;color:var(--gold)">R$${pkm.toFixed(2).replace('.',',')}</div></div><div style="background:var(--s3);border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center"><div style="font-family:'JetBrains Mono',monospace;font-size:.58rem;color:var(--muted)">CUSTO/ANO</div><div style="font-family:'Bebas Neue',sans-serif;font-size:1.5rem;color:var(--text2)">R$${Math.round(total*12).toLocaleString('pt-BR')}</div></div></div>`;
  }

  return { runCDC, runFipe, runTCO };
})();
