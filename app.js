const search=document.querySelector('#cert-search');let certs=[...document.querySelectorAll('.cert')];const count=document.querySelector('#cert-count');const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();function filter(){const term=normalize(search.value);let total=0;certs.forEach(link=>{link.hidden=!normalize(link.textContent).includes(term);if(!link.hidden)total++});count.textContent=`${total} certificados disponíveis`;document.querySelector('#empty').hidden=total!==0}search.addEventListener('input',filter);filter();

const rail=document.querySelector('.scroll-ruler'),scale=rail.querySelector('.ruler-ticks'),cursor=rail.querySelector('.ruler-cursor');
const ticks=Array.from({length:101},(_,i)=>{const tick=document.createElement('div');tick.className=`tick${i%5===0?' major':''}`;tick.innerHTML=`<span class="tick-line"></span>${i%5===0?`<small>${i}</small>`:''}`;scale.append(tick);return tick;});
const digits=Array.from({length:3},()=>{const col=document.createElement('span');col.className='ruler-digit-col';col.innerHTML=Array.from({length:10},(_,i)=>`<span>${i}</span>`).join('');rail.querySelector('.ruler-digits').append(col);return col;});
let queued=false,dragging=false,hovering=false,hideTimer,active=false;
function updateProgress(){const h=window.innerHeight,doc=document.documentElement.scrollHeight,max=doc-h,y=window.scrollY,ratio=max>0?Math.min(1,Math.max(0,y/max)):0;scale.style.height=`${doc}px`;scale.style.transform=`translate3d(0,${60-ratio*120-y}px,0)`;ticks.forEach((tick,i)=>{tick.style.top=`${i*doc/100}px`;});cursor.style.transform=`translate3d(0,${Math.max(1,Math.min(h-20,ratio*h))}px,0)`;const value=Math.round(ratio*100);rail.setAttribute('aria-valuenow',value);rail.setAttribute('aria-valuetext',`${value}% da página`);String(value).padStart(3,'0').split('').forEach((n,i)=>digits[i].style.transform=`translateY(-${n}em)`);queued=false;}
function scheduleProgress(){if(!queued){queued=true;requestAnimationFrame(updateProgress);}}
function reveal(){active=true;cursor.style.opacity='1';clearTimeout(hideTimer);hideTimer=setTimeout(()=>{if(!dragging&&!hovering){active=false;cursor.style.opacity='0';}},1100);}
function seek(event){window.scrollTo({top:Math.min(1,Math.max(0,event.clientY/window.innerHeight))*(document.documentElement.scrollHeight-window.innerHeight),behavior:'instant'});}
rail.addEventListener('pointerdown',event=>{if(event.button!==0)return;dragging=true;rail.setPointerCapture(event.pointerId);seek(event);reveal();});
rail.addEventListener('pointermove',event=>{if(dragging)seek(event);const lines=rail.querySelectorAll('.tick-line');lines.forEach(line=>{const d=Math.abs(line.getBoundingClientRect().top-event.clientY);const bump=Math.pow(Math.max(0,1-d/180),2)*.2;line.style.transform=`scaleX(${1+bump})`;line.style.opacity=(line.parentElement.classList.contains('major')?.8:.4)+bump;});});
rail.addEventListener('pointerenter',()=>{hovering=true;reveal();});rail.addEventListener('pointerleave',()=>{hovering=false;reveal();rail.querySelectorAll('.tick-line').forEach(line=>{line.style.transform='';line.style.opacity='';});});
rail.addEventListener('pointerup',()=>{dragging=false;reveal();});rail.addEventListener('pointercancel',()=>{dragging=false;});rail.addEventListener('lostpointercapture',()=>{dragging=false;});
rail.addEventListener('keydown',event=>{let top=window.scrollY;switch(event.key){case 'ArrowDown':top+=80;break;case 'ArrowUp':top-=80;break;case 'PageDown':top+=window.innerHeight*.85;break;case 'PageUp':top-=window.innerHeight*.85;break;case 'Home':top=0;break;case 'End':top=document.documentElement.scrollHeight;break;default:return;}event.preventDefault();window.scrollTo({top,behavior:'instant'});reveal();});
window.addEventListener('scroll',()=>{scheduleProgress();reveal();},{passive:true});window.addEventListener('resize',scheduleProgress);new ResizeObserver(scheduleProgress).observe(document.body);updateProgress();

async function loadDriveCertificates(){
 const config=window.certificateSource;
 if(!config?.apiKey)return;
 const folder=config.folderId;
 let token='',files=[];
 try{
  do{
   const params=new URLSearchParams({key:config.apiKey,q:`'${folder}' in parents and trashed = false and (mimeType = 'application/pdf' or mimeType contains 'image/')`,fields:'nextPageToken,files(id,name,webViewLink)',pageSize:'100',orderBy:'name'});
   if(token)params.set('pageToken',token);
   const response=await fetch(`https://www.googleapis.com/drive/v3/files?${params}`,{signal:AbortSignal.timeout(12000)});
   if(!response.ok)throw new Error('Drive indisponível');
   const data=await response.json();if(!Array.isArray(data.files))throw new Error('Resposta inválida');
   files.push(...data.files);token=data.nextPageToken||'';
  }while(token);
  const fragment=document.createDocumentFragment();
  files.forEach(file=>{
   const a=document.createElement('a');a.className='cert';a.href=`https://drive.google.com/file/d/${encodeURIComponent(file.id)}/view`;a.target='_blank';a.rel='noopener';
   const title=document.createElement('span');title.textContent=file.name.replace(/\.(pdf|png|jpe?g|webp)$/i,'').replace(/^Guilherme (Bruno Marques Biancardi|Biancardi) - (Curso |Formação )?/,'').replace(/ - Alura$/,'').replaceAll('_',':').replace(/^4523.*$/,'DevOps Essentials — Certificado de conclusão').replace(/^4Linux.*$/,'Linux — 4Linux');
   const arrow=document.createElement('span');arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');a.append(title,arrow);fragment.append(a);
  });
  document.querySelector('.certs').replaceChildren(fragment);certs=[...document.querySelectorAll('.cert')];filter();
 }catch(error){count.textContent='Não foi possível carregar os certificados.';document.querySelector('#empty').hidden=false;document.querySelector('#empty').textContent='Consulte os certificados diretamente na pasta do Google Drive.';}
}
loadDriveCertificates();


// Public repositories only: no GitHub token is shipped to visitors.
(function initProjects(){
 const track=document.querySelector('#projects-track');
 if(!track)return;
 const previous=document.querySelector('#projects-prev'),next=document.querySelector('#projects-next'),status=document.querySelector('#projects-status');
 const cacheKey='gb-public-projects-v3',lifetime=60*60*1000;
 function controls(){previous.disabled=track.scrollLeft<=2;next.disabled=track.scrollLeft+track.clientWidth>=track.scrollWidth-2;}
 function move(direction){const card=track.querySelector('.project-card');if(!card)return;const gap=parseFloat(getComputedStyle(track).gap)||20;track.scrollBy({left:direction*(card.getBoundingClientRect().width+gap),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
 previous.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));track.addEventListener('scroll',controls,{passive:true});new ResizeObserver(controls).observe(track);
 track.addEventListener('keydown',event=>{if(event.target!==track)return;if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();move(event.key==='ArrowRight'?1:-1);}});
 function render(repos){
  const fragment=document.createDocumentFragment();
  repos.forEach((repo,index)=>{
   const card=document.createElement('article');card.className='project-card';
   const label=document.createElement('p');label.className='eyebrow';label.textContent=`${String(index+1).padStart(2,'0')} / PROJETO PÚBLICO`;
   const title=document.createElement('h4'),link=document.createElement('a');link.href=`https://github.com/GuilhermeBiancardi/${encodeURIComponent(repo.name)}`;link.target='_blank';link.rel='noopener';link.append(document.createTextNode(repo.name));const arrow=document.createElement('span');arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');link.append(arrow);title.append(link);
   const description=document.createElement('p');description.textContent=repo.description||'Explore o código e os detalhes no repositório.';
   const language=document.createElement('span');language.className='project-language';language.textContent=repo.language||'Código aberto';card.append(label,title,description,language);fragment.append(card);
  });
  track.replaceChildren(fragment);track.scrollLeft=0;controls();status.textContent=`${repos.length} projetos públicos · Deslize ou use as setas para explorar.`;
 }
 async function load(){
  let cached;
  try{cached=JSON.parse(localStorage.getItem(cacheKey));if(Array.isArray(cached?.repos)&&cached.repos.length){render(cached.repos);if(Date.now()-cached.time<lifetime)return;}}catch{}
  try{
   const response=await fetch('https://api.github.com/users/GuilhermeBiancardi/repos?type=owner&sort=updated&direction=desc&per_page=100',{headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw new Error('GitHub indisponível');
   const data=await response.json();if(!Array.isArray(data))throw new Error('Resposta inválida');
   const eligible=data.filter(repo=>!repo.fork&&!repo.archived&&!repo.disabled&&!['guilhermebiancardi','curriculo'].includes(repo.name.toLowerCase()));
   const neural=eligible.find(repo=>repo.name.toLowerCase()==='neural-network-php');
   const markov=eligible.find(repo=>repo.name.toLowerCase()==='markovassetmodel');
   const selected=eligible.filter(repo=>repo!==markov).slice(0,markov?8:9);
   if(neural&&!selected.includes(neural)){selected.pop();selected.push(neural);}
   if(markov){const index=selected.indexOf(neural);selected.splice(index>=0?index+1:selected.length,0,markov);}
   // Explicit selections stay visible regardless of their update dates.
   const additions=['LinearRegression','NavyBayes-class'].map(name=>data.find(repo=>!repo.disabled&&repo.name.toLowerCase()===name.toLowerCase())).filter(Boolean);
   additions.forEach(repo=>{const existing=selected.findIndex(item=>item.name.toLowerCase()===repo.name.toLowerCase());if(existing>=0)selected.splice(existing,1);});
   const anchor=selected.indexOf(markov)>=0?selected.indexOf(markov):selected.indexOf(neural);
   selected.splice(anchor>=0?anchor+1:selected.length,0,...additions);
   const repos=selected.map(({name,description,language})=>({name,description,language}));
   if(!repos.length){status.textContent='Explore mais projetos no link do GitHub acima.';return;}
   render(repos);try{localStorage.setItem(cacheKey,JSON.stringify({time:Date.now(),repos}));}catch{}
  }catch{status.textContent='A atualização do GitHub está indisponível. Explore os projetos exibidos ou acesse o perfil acima.';}
 }
 controls();load();
})();
