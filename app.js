const STORAGE_KEY='saber_itsplay_election_v3';
const PREVIOUS_STORAGE_KEY='saber_itsplay_election_v2';
const OLD_STORAGE_KEY='saber_itsplay_election_v1';
const EMAIL_DESTINATION='itsplayoficial@gmail.com';
const classes=['1º ano','2º ano','3º ano','4º ano','5º ano'];
const shiftLabel={manha:'Manhã',tarde:'Tarde'};
const initialState={pin:null,candidates:[],votes:[],createdAt:new Date().toISOString()};
let state=loadState(), adminUnlocked=false, resultsUnlocked=false, activeBallot=null, typedNumber='', selectedCandidate=null, successTimer=null;
const $=id=>document.getElementById(id);
function clone(x){return JSON.parse(JSON.stringify(x))}
function loadState(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY)||localStorage.getItem(PREVIOUS_STORAGE_KEY)||localStorage.getItem(OLD_STORAGE_KEY);
    const saved=JSON.parse(raw);
    if(!(saved&&Array.isArray(saved.candidates)&&Array.isArray(saved.votes))) return clone(initialState);
    // Migração da versão anterior: candidatos antigos não tinham turma.
    // Como a versão anterior exibia os mesmos nomes em todas as turmas, eles passam a pertencer ao 1º ano.
    let changed=false;
    saved.candidates=saved.candidates.map(c=>{
      if(!c.className){changed=true;return {...c,className:'1º ano'}}
      return c;
    });
    if(changed) localStorage.setItem(STORAGE_KEY,JSON.stringify(saved));
    return saved;
  }catch{return clone(initialState)}
}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function uid(){return crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`}
function encodePin(pin){return btoa(`saber+|${pin}|itsplay`)}
function isPinValid(pin){return state.pin&&encodePin(pin)===state.pin}
function escapeHtml(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function populateClasses(){
  ['voteClass','resultClass','candidateClass'].forEach(id=>{
    const el=$(id);if(!el)return;
    const prefix=id==='resultClass'?'<option value="todos">Todas</option>':'';
    el.innerHTML=prefix+classes.map(c=>`<option value="${c}">${c}</option>`).join('');
  })
}
function setupTabs(){document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===btn));document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));$(`view-${btn.dataset.view}`).classList.add('active');if(btn.dataset.view==='resultados'&&resultsUnlocked)renderResults()}))}
function setupEvents(){
 $('loadBallot').addEventListener('click',openBallot);$('closeBallot').addEventListener('click',closeBallot);
 document.querySelectorAll('[data-key]').forEach(b=>b.addEventListener('click',()=>enterDigit(b.dataset.key)));
 $('clearVote').addEventListener('click',resetBallotScreen);$('confirmVote').addEventListener('click',commitVote);
 $('unlockAdmin').addEventListener('click',unlockAdmin);$('lockAdmin').addEventListener('click',()=>{$('adminArea').classList.add('hidden');$('adminLocked').classList.remove('hidden');adminUnlocked=false});
 $('candidateForm').addEventListener('submit',addCandidate);$('candidatePhoto').addEventListener('change',handlePhotoSelection);$('clearCandidatePhoto').addEventListener('click',clearPhotoSelection);$('changePin').addEventListener('click',changePin);$('resetElection').addEventListener('click',resetElection);
 $('unlockResults').addEventListener('click',unlockResults);$('resultShift').addEventListener('change',renderResults);$('resultClass').addEventListener('change',renderResults);$('exportCsv').addEventListener('click',exportCSV);$('sendEmail').addEventListener('click',sendEmailReport);
 document.addEventListener('keydown',e=>{if(!$('ballotArea').classList.contains('hidden')){if(/^\d$/.test(e.key))enterDigit(e.key);if(e.key==='Backspace'||e.key==='Escape')resetBallotScreen();if(e.key==='Enter'&&!$('confirmVote').disabled)commitVote()}})
}
function initPin(){if(!state.pin){state.pin=encodePin('1234');saveState();$('pinHint').textContent='Primeiro acesso: PIN 1234. Depois, altere-o na área das professoras.'}else $('pinHint').textContent='Use o PIN definido pela escola.'}
function initialize(){populateClasses();setupTabs();setupEvents();initPin();renderAdminCandidates();renderResults()}
function unlockAdmin(){const pin=$('adminPin').value.trim();if(!isPinValid(pin))return alert('PIN incorreto.');adminUnlocked=true;$('adminLocked').classList.add('hidden');$('adminArea').classList.remove('hidden');$('adminPin').value='';renderAdminCandidates()}
function unlockResults(){const pin=$('resultsPin').value.trim();if(!isPinValid(pin))return alert('PIN incorreto.');resultsUnlocked=true;$('resultsLocked').classList.add('hidden');$('resultsArea').classList.remove('hidden');$('resultsPin').value='';renderResults()}
function changePin(){const pin=$('newPin').value.trim();if(!/^\d{4,6}$/.test(pin))return alert('Use um PIN com 4 a 6 números.');state.pin=encodePin(pin);saveState();$('newPin').value='';alert('PIN alterado com sucesso.')}
function fileToDataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)})}
function formatFileSize(bytes){if(bytes<1024)return `${bytes} B`;if(bytes<1024*1024)return `${(bytes/1024).toFixed(0)} KB`;return `${(bytes/1024/1024).toFixed(1)} MB`}
function clearPhotoSelection(){const input=$('candidatePhoto');input.value='';$('photoPreview').removeAttribute('src');$('photoFileName').textContent='Foto selecionada';$('photoFileInfo').textContent='';$('photoSelection').classList.add('hidden')}
function handlePhotoSelection(){const file=$('candidatePhoto').files&&$('candidatePhoto').files[0];if(!file){clearPhotoSelection();return}if(!file.type.startsWith('image/')&&!/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)){clearPhotoSelection();return alert('Selecione um arquivo de imagem.')}if(file.size>20*1024*1024){clearPhotoSelection();return alert('A foto é muito grande. Escolha uma imagem de até 20 MB.')}const url=URL.createObjectURL(file);$('photoPreview').src=url;$('photoPreview').onload=()=>URL.revokeObjectURL(url);$('photoFileName').textContent=file.name||'Foto selecionada';$('photoFileInfo').textContent=`${formatFileSize(file.size)} • será otimizada ao cadastrar`;$('photoSelection').classList.remove('hidden')}
function loadImageFromFile(file){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Não foi possível abrir esta imagem.'))};img.src=url})}
async function optimizePhoto(file){
  const img=await loadImageFromFile(file);
  const maxSide=560;
  const scale=Math.min(1,maxSide/Math.max(img.naturalWidth||img.width,img.naturalHeight||img.height));
  const w=Math.max(1,Math.round((img.naturalWidth||img.width)*scale)),h=Math.max(1,Math.round((img.naturalHeight||img.height)*scale));
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);
  let quality=.82,data=canvas.toDataURL('image/jpeg',quality);
  const targetChars=130000;
  while(data.length>targetChars&&quality>.48){quality-=.08;data=canvas.toDataURL('image/jpeg',quality)}
  return data;
}
function safeSaveState(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));return true}catch(err){console.error(err);alert('O armazenamento deste navegador está cheio. As fotos já são compactadas, mas pode ser necessário excluir candidatos antigos ou usar outro dispositivo.');return false}}
async function addCandidate(e){
  e.preventDefault();
  const shift=$('candidateShift').value,className=$('candidateClass').value,name=$('candidateName').value.trim(),number=String(Number($('candidateNumber').value)),file=$('candidatePhoto').files[0];
  if(!name||!number||!file||!className)return;
  const list=state.candidates.filter(c=>c.shift===shift&&c.className===className);
  if(list.length>=3)return alert(`Já existem 3 candidatos para ${className} no turno da ${shiftLabel[shift]}.`);
  if(list.some(c=>String(c.number)===number))return alert('Esse número já está sendo usado nesta turma e turno.');
  if(file.size>20*1024*1024)return alert('Use uma foto com até 20 MB.');
  const saveButton=$('saveCandidateButton');const originalLabel=saveButton.textContent;saveButton.disabled=true;saveButton.textContent='Otimizando foto...';
  try{
    const photo=await optimizePhoto(file);
    const candidate={id:uid(),shift,className,name,number,photo,createdAt:new Date().toISOString()};
    state.candidates.push(candidate);
    if(!safeSaveState()){state.candidates=state.candidates.filter(c=>c.id!==candidate.id);return}
    const keepShift=shift,keepClass=className;
    e.target.reset();clearPhotoSelection();
    $('candidateShift').value=keepShift;$('candidateClass').value=keepClass;
    renderAdminCandidates();
  }catch(err){console.error(err);alert('Não foi possível processar essa foto. Tente escolher uma imagem JPG, PNG ou WEBP da galeria/arquivos.')}
  finally{saveButton.disabled=false;saveButton.textContent=originalLabel}
}
function renderAdminCandidates(){
  const box=$('adminCandidates');
  box.innerHTML=classes.map(className=>{
    const sections=['manha','tarde'].map(shift=>{
      const items=state.candidates.filter(c=>c.shift===shift&&c.className===className).sort((a,b)=>Number(a.number)-Number(b.number));
      const rows=items.length?items.map(c=>`<div class="admin-candidate-row"><img src="${c.photo}" alt="Foto de ${escapeHtml(c.name)}"><div><strong>${escapeHtml(c.name)}</strong><br><small>${className} • ${shiftLabel[shift]} • Nº ${escapeHtml(c.number)}</small></div><button class="icon-btn" data-remove="${c.id}">Excluir</button></div>`).join(''):'<p class="hint">Nenhum candidato cadastrado.</p>';
      return `<div class="admin-shift"><h4>${shiftLabel[shift]} <small>(${items.length}/3)</small></h4>${rows}</div>`;
    }).join('');
    return `<div class="candidate-class-group"><h3>${className}</h3>${sections}</div>`;
  }).join('');
  box.querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>removeCandidate(b.dataset.remove)))
}
function removeCandidate(id){const c=state.candidates.find(x=>x.id===id);if(!c)return;const has=state.votes.some(v=>v.candidateId===id);if(!confirm(has?'Este candidato já tem votos. Excluir também apagará os votos dele. Continuar?':'Excluir este candidato?'))return;state.candidates=state.candidates.filter(x=>x.id!==id);state.votes=state.votes.filter(v=>v.candidateId!==id);saveState();renderAdminCandidates();renderResults()}
function openBallot(){const shift=$('voteShift').value,className=$('voteClass').value,candidates=state.candidates.filter(c=>c.shift===shift&&c.className===className);if(candidates.length!==3)return alert(`Cadastre exatamente 3 candidatos para ${className} no turno da ${shiftLabel[shift]} antes de iniciar.`);activeBallot={shift,className};$('ballotContext').textContent=`${className} • ${shiftLabel[shift]}`;$('candidateMiniList').innerHTML=candidates.sort((a,b)=>Number(a.number)-Number(b.number)).map(c=>`<div class="mini-candidate"><img src="${c.photo}" alt=""><strong>${escapeHtml(c.name)}</strong><b>${escapeHtml(c.number)}</b></div>`).join('');$('stationSetup').classList.add('hidden');$('ballotArea').classList.remove('hidden');resetBallotScreen();window.scrollTo({top:0,behavior:'smooth'})}
function closeBallot(){if(!confirm('Encerrar a votação desta turma?'))return;activeBallot=null;$('ballotArea').classList.add('hidden');$('stationSetup').classList.remove('hidden');resetBallotScreen()}
function showScreen(id){['screenIdle','screenCandidate','screenInvalid','screenSuccess'].forEach(x=>$(x).classList.toggle('active',x===id))}
function enterDigit(d){if(!activeBallot||$('screenSuccess').classList.contains('active'))return;if(typedNumber.length>=3)return;typedNumber+=d;updateDigits();matchCandidate()}
function updateDigits(){const ds=typedNumber.split('');$('digit1').textContent=ds[0]||'_';$('digit2').textContent=ds[1]||'_';$('digit3').textContent=ds[2]||'_';$('digit3').classList.toggle('optional-digit',!ds[2])}
function matchCandidate(){selectedCandidate=state.candidates.find(c=>c.shift===activeBallot.shift&&c.className===activeBallot.className&&String(c.number)===typedNumber)||null;const hasLonger=state.candidates.some(c=>c.shift===activeBallot.shift&&c.className===activeBallot.className&&String(c.number).startsWith(typedNumber)&&String(c.number).length>typedNumber.length);if(selectedCandidate){$('previewPhoto').src=selectedCandidate.photo;$('previewName').textContent=selectedCandidate.name;$('previewNumber').textContent=selectedCandidate.number;$('previewShift').textContent=`Candidato(a) • ${shiftLabel[selectedCandidate.shift]}`;showScreen('screenCandidate');$('confirmVote').disabled=false}else if(typedNumber.length>=2&&!hasLonger){showScreen('screenInvalid');$('confirmVote').disabled=true}else{showScreen('screenIdle');$('confirmVote').disabled=true}}
function resetBallotScreen(){clearTimeout(successTimer);typedNumber='';selectedCandidate=null;updateDigits();showScreen('screenIdle');$('confirmVote').disabled=true}
function beep(freq=820,duration=.08){try{const ctx=new (window.AudioContext||window.webkitAudioContext)(),o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=freq;o.connect(g);g.connect(ctx.destination);g.gain.setValueAtTime(.045,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);o.start();o.stop(ctx.currentTime+duration)}catch{}}
function commitVote(){if(!selectedCandidate||!activeBallot)return;state.votes.push({id:uid(),candidateId:selectedCandidate.id,shift:activeBallot.shift,className:activeBallot.className,timestamp:new Date().toISOString()});saveState();showScreen('screenSuccess');$('confirmVote').disabled=true;beep(880,.11);setTimeout(()=>beep(1050,.14),120);renderResults();successTimer=setTimeout(resetBallotScreen,2200)}
function filteredVotes(){const shift=$('resultShift')?.value||'todos',cl=$('resultClass')?.value||'todos';return state.votes.filter(v=>(shift==='todos'||v.shift===shift)&&(cl==='todos'||v.className===cl))}
function renderResults(){
  if(!$('resultsArea'))return;
  $('totalVotes').textContent=state.votes.length;
  $('morningVotes').textContent=state.votes.filter(v=>v.shift==='manha').length;
  $('afternoonVotes').textContent=state.votes.filter(v=>v.shift==='tarde').length;
  const votes=filteredVotes(),shift=$('resultShift').value,cl=$('resultClass').value;
  const candidates=state.candidates.filter(c=>(shift==='todos'||c.shift===shift)&&(cl==='todos'||c.className===cl));
  const counts=new Map(candidates.map(c=>[c.id,0]));
  votes.forEach(v=>{if(counts.has(v.candidateId)) counts.set(v.candidateId,(counts.get(v.candidateId)||0)+1)});
  const max=Math.max(1,...counts.values());
  $('resultsList').innerHTML=candidates.length?[...candidates].sort((a,b)=>(counts.get(b.id)||0)-(counts.get(a.id)||0)).map(c=>{const n=counts.get(c.id)||0,p=Math.round(n/max*100);return `<div class="result-row"><div class="result-person"><img src="${c.photo}" alt=""><div><strong>${escapeHtml(c.name)}</strong><br><small>${c.className} • ${shiftLabel[c.shift]} • Nº ${escapeHtml(c.number)}</small></div></div><div class="bar-track"><div class="bar-fill" style="width:${p}%"></div></div><div class="result-count">${n} voto${n===1?'':'s'}</div></div>`}).join(''):'<p class="hint">Não há candidatos cadastrados para este filtro.</p>';
  renderClassBreakdown();
}
function renderClassBreakdown(){
  const rows=[];
  ['manha','tarde'].forEach(shift=>classes.forEach(cl=>{
    const candidates=state.candidates.filter(c=>c.shift===shift&&c.className===cl);
    const relevant=state.votes.filter(v=>v.shift===shift&&v.className===cl);
    // Turmas sem candidatos cadastrados não aparecem na apuração.
    if(!candidates.length) return;
    const counts=candidates.map(c=>({c,n:relevant.filter(v=>v.candidateId===c.id).length}));
    const details=counts.map(x=>`${escapeHtml(x.c.name)} (${escapeHtml(x.c.number)}): ${x.n}`).join(' • ');
    rows.push(`<tr><td>${shiftLabel[shift]}</td><td>${cl}</td><td>${relevant.length}</td><td>${details}</td></tr>`)
  }));
  $('classBreakdown').innerHTML=`<h3>Contagem por turma e turno</h3>${rows.length?`<table><thead><tr><th>Turno</th><th>Turma</th><th>Total</th><th>Distribuição</th></tr></thead><tbody>${rows.join('')}</tbody></table>`:'<p class="hint">Nenhuma turma possui candidatos cadastrados.</p>'}`
}
function exportCSV(){const lines=['Turno;Turma;Candidato;Numero;Votos'];['manha','tarde'].forEach(shift=>classes.forEach(cl=>state.candidates.filter(c=>c.shift===shift&&c.className===cl).forEach(c=>{const n=state.votes.filter(v=>v.shift===shift&&v.className===cl&&v.candidateId===c.id).length;lines.push([shiftLabel[shift],cl,c.name.replaceAll(';',','),c.number,n].join(';'))})));const blob=new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`resultado-votacao-saber-itsplay-${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(a.href)}
function buildEmailSummary(){const lines=["RESULTADO DA ELEIÇÃO ESCOLAR — SABER+ & IT'S PLAY",`Gerado em: ${new Intl.DateTimeFormat('pt-BR',{dateStyle:'full',timeStyle:'short'}).format(new Date())}`,`Total de votos: ${state.votes.length}`,''];['manha','tarde'].forEach(shift=>{lines.push(shiftLabel[shift].toUpperCase());classes.forEach(cl=>{lines.push(`  ${cl}:`);state.candidates.filter(c=>c.shift===shift&&c.className===cl).sort((a,b)=>Number(a.number)-Number(b.number)).forEach(c=>{const n=state.votes.filter(v=>v.shift===shift&&v.className===cl&&v.candidateId===c.id).length;lines.push(`    ${c.name} — nº ${c.number}: ${n} voto(s)`)})});lines.push('')});lines.push('Relatório sem fotos e sem identificação dos eleitores.');return lines.join('\n')}
async function sendEmailReport(){const summary=buildEmailSummary();$('emailStatus').textContent='Preparando envio...';try{const fd=new FormData();fd.append('_subject',"Resultado da eleição escolar — Saber+ & It's Play");fd.append('relatorio',summary);fd.append('_captcha','false');const r=await fetch(`https://formsubmit.co/ajax/${EMAIL_DESTINATION}`,{method:'POST',body:fd,headers:{Accept:'application/json'}});if(!r.ok)throw new Error();$('emailStatus').textContent=`Resultado enviado para ${EMAIL_DESTINATION}. No primeiro uso, o serviço pode pedir confirmação por e-mail.`}catch{location.href=`mailto:${EMAIL_DESTINATION}?subject=${encodeURIComponent("Resultado da eleição escolar — Saber+ & It's Play")}&body=${encodeURIComponent(summary)}`;$('emailStatus').textContent='Abrimos o aplicativo de e-mail com o relatório preenchido.'}}
function resetElection(){const typed=prompt('Para apagar tudo, digite APAGAR:');if(typed!=='APAGAR')return;state={...clone(initialState),pin:state.pin,createdAt:new Date().toISOString()};saveState();renderAdminCandidates();renderResults();alert('Candidatos e votos apagados. O PIN foi mantido.')}
initialize();
