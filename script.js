const $=s=>document.querySelector(s);
let players=[],results={},scores={},ft=1,uid=1,hist=[];
const load=()=>{try{const s=JSON.parse(localStorage.getItem('t7bracket'));if(s){players=s.players||[];results=s.results||{};scores=s.scores||{};ft=s.ft||1;uid=s.uid||1}}catch(e){}};let admin=false;load();
const save=()=>{if(!admin)return;try{localStorage.setItem('t7bracket',JSON.stringify({players,results,scores,ft,uid}))}catch(e){}};
const snap=()=>{hist.push(JSON.stringify({players,results,scores,ft,uid}));if(hist.length>100)hist.shift()};
const esc=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const seedOrder=n=>{let a=[1];while(a.length<n){const m=a.length*2+1;a=a.flatMap(x=>[x,m-x])}return a};

function build(){
 const n=players.length;if(n<2)return null;
 const k=Math.max(2,Math.ceil(Math.log2(n))),size=2**k,M={};
 const mk=(b,r,i)=>M[b+r+'-'+i]={id:b+r+'-'+i,b,r,i,s:[null,null],w:null,l:null,done:false,skip:false,win:null,lose:null};
 for(let r=1;r<=k;r++)for(let i=0;i<size/2**r;i++)mk('W',r,i);
 for(let j=1;j<k;j++)for(let i=0;i<size/2**(j+1);i++){mk('L',2*j-1,i);mk('L',2*j,i)}
 mk('G',1,0);mk('G',2,0);
 const id=(b,r,i)=>b+r+'-'+i;
 for(let r=1;r<=k;r++)for(let i=0;i<size/2**r;i++){
  const m=M[id('W',r,i)];
  m.win=r<k?[id('W',r+1,i>>1),i%2]:[id('G',1,0),0];
  if(r===1)m.lose=[id('L',1,i>>1),i%2];
  else{const c=size/2**r;m.lose=[id('L',2*(r-1),c-1-i),1]}
 }
 for(let j=1;j<k;j++){const c=size/2**(j+1);
  for(let i=0;i<c;i++){
   M[id('L',2*j-1,i)].win=[id('L',2*j,i),0];
   M[id('L',2*j,i)].win=j<k-1?[id('L',2*j+1,i>>1),i%2]:[id('G',1,0),1];
  }}
 const B=x=>({id:'bye'+x,bye:true,name:'BYE'});
 seedOrder(size).forEach((seed,x)=>{M[id('W',1,x>>1)].s[x%2]=seed<=n?players[seed-1]:B(x)});
 let ch=true;
 while(ch){ch=false;for(const m of Object.values(M)){
  if(m.done||m.skip)continue;
  const[a,b]=m.s;if(!a||!b)continue;
  let w=null;
  if(a.bye||b.bye)w=a.bye?b:a;
  else if(results[m.id]===a.id)w=a;else if(results[m.id]===b.id)w=b;
  if(!w)continue;
  m.done=true;m.w=w;m.l=w===a?b:a;ch=true;
  if(m.b==='G'){if(m.r===1){if(w===b)M['G2-0'].s=[a,b];else M['G2-0'].skip=true}continue}
  M[m.win[0]].s[m.win[1]]=w;if(m.lose)M[m.lose[0]].s[m.lose[1]]=m.l;
 }}
 for(const key of Object.keys(results)){const m=M[key];if(!m||!m.w||m.w.id!==results[key])delete results[key]}
 for(const key of Object.keys(scores)){const m=M[key],c=scores[key];if(!m||!m.s[0]||!m.s[1]||m.s[0].id!==c.ids[0]||m.s[1].id!==c.ids[1])delete scores[key]}
 return{M,k};
}

function card(m){
 const live=m.s[0]&&m.s[1]&&!m.done&&!m.s[0].bye&&!m.s[1].bye;
 const row=p=>{
  if(!p)return'<div class="row empty">TBD</div>';
  if(p.bye)return'<div class="row bye">BYE</div>';
  const cls=['row'];
  if(m.done&&!(m.s[0].bye||m.s[1].bye))cls.push(m.w===p?'win':'lose');
  if(m.s[0]&&m.s[1]&&!m.s[0].bye&&!m.s[1].bye)cls.push('pick');
  const both=m.s[0]&&m.s[1]&&!m.s[0].bye&&!m.s[1].bye,c=scores[m.id],sc=ft>1&&both?'<span class="sc">'+(c?c.v[m.s[0]===p?0:1]:0)+'</span>':'';
  return`<div class="${cls.join(' ')}" data-m="${m.id}" data-p="${p.id}"><span>${esc(p.name)}${p.ch?' <small style="color:var(--dim);font-weight:500">('+esc(p.ch)+')</small>':''}</span>${sc}</div>`;
 };
 return`<div class="m${live?' live':''}${m.skip?' skip':''}">${row(m.s[0])}${row(m.s[1])}</div>`;
}

function section(M,b,rounds,title,cls,label){
 let h=`<h2 class="${cls}">${title}</h2><div class="scroll"><div class="rounds">`;
 rounds.forEach((r,idx)=>{
  const ms=Object.values(M).filter(m=>m.b===b&&m.r===r).sort((x,y)=>x.i-y.i);
  if(!ms.length||ms.every(m=>m.skip))return;
  h+=`<div class="round"><div class="rl">${label(r,idx,rounds.length)}</div><div class="col">${ms.map(card).join('')}</div></div>`;
 });
 return h+'</div></div>';
}

function render(){
 $('#chips').innerHTML=players.map((p,i)=>`<div class="chip"><i>#${i+1}</i>${esc(p.name)}<em data-ed="${p.id}" title="Set character">${p.ch?esc(p.ch):'+char'}</em><b data-rm="${p.id}" title="Remove">✕</b></div>`).join('');
 const B=build(),out=$('#out');
 if(!B){out.innerHTML='<div class="panel"><span class="ko">NO CHALLENGERS</span> — add at least 2 fighters to generate the bracket.</div>';save();return}
 const{M,k}=B;
 const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
 const real=Object.values(M).filter(m=>!(m.s[0]&&m.s[0].bye)&&!(m.s[1]&&m.s[1].bye)&&!m.skip&&m.b!=='G'||m.b==='G'&&m.r===1);
 const total=real.length,done=real.filter(m=>m.done).length;
 const losses={};players.forEach(p=>losses[p.id]=0);
 Object.values(M).forEach(m=>{if(m.done&&m.l&&!m.l.bye&&!m.s[0].bye&&!m.s[1].bye&&!(m.b==='G'&&m.r===2&&0))losses[m.l.id]++});
 const out2=players.filter(p=>losses[p.id]>=2).map(p=>p.name);
 let h=`<div class="stats"><span>MATCHES <b>${done}/${total}</b></span><span>FIGHTERS <b>${players.length}</b></span><span>ELIMINATED <b>${out2.length?esc(out2.join(', ')):'none'}</b></span></div><br>`;
 const g1=M['G1-0'],g2=M['G2-0'];
 let champ=null;
 if(g1.done){if(g1.w===g1.s[0])champ=g1.w;else if(g2.done)champ=g2.w}
 if(champ)h+=`<div class="champ"><small>WINNER</small><div>${esc(champ.name)}</div></div>`;
 h+=section(M,'W',range(1,k),'WINNERS BRACKET','',(r)=>r===k?'WINNERS FINAL':'ROUND '+r);
 h+=section(M,'L',range(1,2*(k-1)),'LOSERS BRACKET','l',(r,i,t)=>r===t?'LOSERS FINAL':'ROUND '+r);
 const gm=[g1];if(!g2.skip)gm.push(g2);
 h+=`<h2 class="g">GRAND FINAL</h2><div class="scroll"><div class="rounds">`+
  gm.map((m,i)=>`<div class="round"><div class="rl">${i?'BRACKET RESET':'GRAND FINAL'}</div>${card(m)}</div>`).join('')+'</div></div>';
 out.innerHTML=h;save();
}

function setNote(t){$('#note').textContent=t}
function add(){
 const v=$('#name').value.trim();if(!v)return;
 if(players.some(p=>p.name.toLowerCase()===v.toLowerCase())){setNote('That fighter is already in the roster.');return}
 snap();players.push({id:'p'+uid++,name:v});$('#name').value='';
 results={};scores={};setNote('Fighter added. Bracket regenerated and results reset.');render();
}
$('#add').onclick=add;
$('#name').onkeydown=e=>{if(e.key==='Enter')add()};
$('#shuf').onclick=()=>{snap();for(let i=players.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[players[i],players[j]]=[players[j],players[i]]}results={};scores={};setNote('Seeds shuffled.');render()};
$('#rst').onclick=()=>{snap();results={};scores={};setNote('Results reset.');render()};
$('#clr').onclick=()=>{snap();players=[];results={};scores={};setNote('Roster cleared.');render()};
document.addEventListener('click',e=>{
 if(!admin)return;
 const ed=e.target.closest('[data-ed]');
 if(ed){openChar(ed.dataset.ed);return}
 const rm=e.target.closest('[data-rm]');
 if(rm){snap();players=players.filter(p=>p.id!==rm.dataset.rm);results={};scores={};setNote('Fighter removed. Bracket regenerated and results reset.');render();return}
 const r=e.target.closest('.row.pick');
 if(r){const m=r.dataset.m,p=r.dataset.p;snap();
  if(ft<=1){if(results[m]===p)delete results[m];else results[m]=p}
  else if(results[m]){delete results[m];delete scores[m]}
  else{const mm=build().M[m],c=scores[m]||(scores[m]={ids:[mm.s[0].id,mm.s[1].id],v:[0,0]}),i=mm.s[0].id===p?0:1;c.v[i]++;if(c.v[i]>=ft)results[m]=p}
  render()}
});
$('#bulk').onclick=()=>{
 const box=$('#bulkbox');
 if(box.style.display==='none'){box.style.display='block';box.focus();return}
 const names=box.value.split('\n').map(x=>x.trim()).filter(Boolean);
 let added=0;snap();
 names.forEach(v=>{if(!players.some(p=>p.name.toLowerCase()===v.toLowerCase())){players.push({id:'p'+uid++,name:v.slice(0,24)});added++}});
 box.value='';box.style.display='none';results={};scores={};setNote(added+' fighter(s) added. Results reset.');render();
};
$('#exp').onclick=()=>{
 const B=build();if(!B){setNote('Nothing to copy yet.');return}
 const lines=Object.values(B.M).filter(m=>m.done&&!m.s[0].bye&&!m.s[1].bye).map(m=>m.id+': '+m.s[0].name+' vs '+m.s[1].name+' -> '+m.w.name+(scores[m.id]?' ('+scores[m.id].v.join('-')+')':''));
 const txt='TEKKEN 7 RESULTS\n'+lines.join('\n');
 (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(()=>setNote('Results copied to clipboard.'),()=>{$('#bulkbox').style.display='block';$('#bulkbox').value=txt;setNote('Copy the text below.')});
};
$('#ft').value=ft;
$('#ft').onchange=e=>{snap();ft=+e.target.value;results={};scores={};setNote('Match format changed. Results reset.');render()};
$('#undo').onclick=()=>{const t=hist.pop();if(!t){setNote('Nothing to undo.');return}const o=JSON.parse(t);players=o.players;results=o.results;scores=o.scores;ft=o.ft;uid=o.uid;$('#ft').value=ft;setNote('Undone.');render()};
let editId=null;
function openChar(id){const p=players.find(x=>x.id===id);if(!p)return;editId=id;$('#mtitle').textContent='CHARACTER FOR '+p.name.toUpperCase();$('#minput').value=p.ch||'';$('#modal').hidden=false;$('#minput').focus()}
function saveChar(v){const p=players.find(x=>x.id===editId);$('#modal').hidden=true;if(!p)return;snap();p.ch=v.trim().slice(0,16);render()}
$('#msave').onclick=()=>saveChar($('#minput').value);
$('#mclear').onclick=()=>saveChar('');
$('#mcancel').onclick=()=>{$('#modal').hidden=true};
$('#modal').onclick=e=>{if(e.target.id==='modal')$('#modal').hidden=true};
$('#minput').onkeydown=e=>{if(e.key==='Enter')saveChar(e.target.value);if(e.key==='Escape')$('#modal').hidden=true};
const PW='192208';
const setMode=a=>{admin=a;document.body.classList.toggle('view',!a);document.body.classList.toggle('edit',a);$('#tview').classList.toggle('alt',a);$('#tedit').classList.toggle('alt',!a)};
let unlocked=false;try{unlocked=sessionStorage.getItem('t7admin')==='1'}catch(e){}
$('#tview').onclick=()=>{setMode(false);load();render()};
const enter=()=>{load();hist=[];$('#ft').value=ft;setMode(true);render()};
$('#tedit').onclick=()=>{if(admin)return;if(unlocked){enter();return}$('#pwerr').textContent='';$('#pwin').value='';$('#pw').hidden=false;$('#pwin').focus()};
const tryPw=()=>{if($('#pwin').value===PW){unlocked=true;try{sessionStorage.setItem('t7admin','1')}catch(e){}$('#pw').hidden=true;enter()}else{$('#pwerr').textContent='Wrong password.';$('#pwin').select()}};
$('#pwok').onclick=tryPw;$('#pwcancel').onclick=()=>{$('#pw').hidden=true};
$('#pw').onclick=e=>{if(e.target.id==='pw')$('#pw').hidden=true};
$('#pwin').onkeydown=e=>{if(e.key==='Enter')tryPw();if(e.key==='Escape')$('#pw').hidden=true};
window.addEventListener('storage',e=>{if(!admin&&(e.key==='t7bracket'||e.key===null)){load();render()}});
setMode(false);
render();
