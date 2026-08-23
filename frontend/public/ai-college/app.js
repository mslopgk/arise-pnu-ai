const sections = [
  { title:'AI대학 소개', summary:'출범과 비전 / 우수성·혁신성 / 미래와 지역 확산', subs:['AI대학 출범','비전과 전략목표 — PNU-APEX','AI대학의 우수성·혁신성','AI대학의 미래와 지역 확산'] },
  { title:'AI대학 조직체계', summary:'ADP+X 교육체계 / 학부 및 전공 / 융합·연계전공', subs:['ADP+X 교육체계','AI대학 학부 및 전공','AX 융합·연계전공','교육·연구·산업 조직의 연계체계','학부–대학원 연계체계'] },
  { title:'신입생모집', summary:'입학 안내 / 모집단위 / 교육경험 / 성장경로', subs:['입학안내','모집단위','교육경험','성장경로'] },
  { title:'AI대학 특화 프로그램', summary:'학습 / 실전 프로젝트 / 연구 / 창업', subs:['성장경로','실전프로젝트','연구성장','창업'] },
  { title:'함께하는 교수진들', summary:'여러 학문분야의 전문성이 하나의 AI대학에서 만납니다', subs:['교수진 탐색'] }
];

const indexList=document.querySelector('#index-list');
const globalMenu=document.querySelector('#global-menu');
sections.forEach((section,i)=>{
  const row=document.createElement('article'); row.className='index-item';
  row.dataset.go=i; row.tabIndex=0; row.setAttribute('role','link'); row.setAttribute('aria-label',`${section.title}로 이동`);
  row.innerHTML=`<div class="index-item-main"><div><h3>${section.title}</h3><div class="index-reveal">${section.summary}</div></div><button class="go-button" data-go="${i}" aria-label="${section.title}로 이동">이동하기<img src="./assets/arrow-circle.svg" width="24" height="24" alt=""></button></div>`;
  indexList.append(row);
  const button=document.createElement('button'); button.textContent=section.title; button.dataset.go=i; globalMenu.append(button);
});

const header=document.querySelector('.site-header');
const menuButton=document.querySelector('.menu-button');
const detail=document.querySelector('#detail');
const intro=document.querySelector('#intro');
const index=document.querySelector('#index');
const categoryButton=document.querySelector('#category-button');
const subnavButton=document.querySelector('#subnav-button');
const subnavWrap=document.querySelector('.subnav-wrap');
const subnavMenu=document.querySelector('#subnav-menu');
const detailContent=document.querySelector('#detail-content');
const searchForm=document.querySelector('#site-search');
const searchInput=document.querySelector('#site-search-input');
const searchStatus=document.querySelector('#search-status');
let currentCategory=0;
let introExperienceCleanup=()=>{};
let orgExperienceCleanup=()=>{};
let admissionsExperienceCleanup=()=>{};
let programsExperienceCleanup=()=>{};
let facultyExperienceCleanup=()=>{};

function showIndex(pushHistory=true){
  introExperienceCleanup();
  orgExperienceCleanup();
  admissionsExperienceCleanup();
  programsExperienceCleanup();
  facultyExperienceCleanup();
  detail.hidden=true; intro.hidden=false; header.classList.remove('light'); document.body.classList.remove('detail-mode','nav-hidden','org-mode','college-intro-mode','admissions-mode','programs-mode','faculty-mode');
  if(pushHistory) history.pushState({view:'index'},'','#index');
  requestAnimationFrame(()=>window.scrollTo({top:intro.offsetHeight-innerHeight,behavior:pushHistory?'smooth':'auto'}));
}
function showDetail(categoryIndex,subIndex=0,pushHistory=true){
  introExperienceCleanup();
  orgExperienceCleanup();
  admissionsExperienceCleanup();
  programsExperienceCleanup();
  facultyExperienceCleanup();
  currentCategory=categoryIndex; const section=sections[categoryIndex];
  intro.hidden=true; detail.hidden=false; header.classList.add('light'); document.body.classList.add('detail-mode'); document.body.classList.toggle('college-intro-mode',categoryIndex===0); document.body.classList.toggle('org-mode',categoryIndex===1); document.body.classList.toggle('admissions-mode',categoryIndex===2); document.body.classList.toggle('programs-mode',categoryIndex===3); document.body.classList.toggle('faculty-mode',categoryIndex===4); document.body.classList.remove('nav-hidden'); globalMenu.classList.remove('open'); menuButton.setAttribute('aria-expanded','false');
  categoryButton.textContent=section.title; subnavButton.textContent=section.subs[subIndex];
  subnavMenu.innerHTML=section.subs.map((s,i)=>`<button data-sub="${i}">${String(i+1).padStart(2,'0')}. ${s}</button>`).join('');
  detailContent.innerHTML=categoryIndex===0 ? renderCollegeIntroduction() : categoryIndex===1 ? renderOrganizationDetail() : categoryIndex===2 ? renderAdmissionsDetail() : categoryIndex===3 ? renderProgramsDetail() : categoryIndex===4 ? renderFacultyDetail() : `<section class="detail-hero"><div><p class="eyebrow">${section.title}</p><h1>${section.subs[subIndex]}</h1><p>${section.summary}. AI를 중심으로 Data · Process · X가 유기적으로 연결되는 부산대학교 AI대학의 새로운 교육과 연구를 소개합니다.</p></div></section><section class="detail-body"><h2>${section.title}<br>${section.subs[subIndex]}</h2><div class="cards"><div class="card"><strong>AI 중심 교육</strong><span>기초부터 심화까지 연결되는 교육</span></div><div class="card"><strong>산학 연계</strong><span>기업과 함께 만드는 현장형 과정</span></div><div class="card"><strong>지역 확산</strong><span>부산에서 시작되는 AX 혁신</span></div></div></section>`;
  if(categoryIndex===0) requestAnimationFrame(()=>initCollegeIntroduction(subIndex));
  if(categoryIndex===1) requestAnimationFrame(initOrgAnimations);
  if(categoryIndex===2) requestAnimationFrame(()=>initAdmissionsDetail(subIndex));
  if(categoryIndex===3) requestAnimationFrame(()=>initProgramsDetail(subIndex));
  if(categoryIndex===4) requestAnimationFrame(initFacultyDetail);
  window.scrollTo({top:0});
  if(pushHistory) history.pushState({view:'detail',categoryIndex,subIndex},'',`#detail-${categoryIndex+1}-${subIndex+1}`);
  if(categoryIndex===1&&subIndex>0) requestAnimationFrame(()=>document.querySelector(`#org-step-${subIndex+1}`)?.scrollIntoView({behavior:'auto'}));
  if(categoryIndex===2&&subIndex>0) requestAnimationFrame(()=>document.querySelector(`#admission-section-${subIndex+1}`)?.scrollIntoView({behavior:'auto'}));
  if(categoryIndex===3&&subIndex>0) requestAnimationFrame(()=>document.querySelector(`#program-section-${subIndex+1}`)?.scrollIntoView({behavior:'auto'}));
}

function facultyEscape(value=''){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
function getFacultyUnits(){
  const rows=Array.isArray(window.FACULTY_DATA)?window.FACULTY_DATA.filter(row=>row?.name&&row?.department):[];
  const map=new Map();rows.forEach(person=>{if(!map.has(person.department))map.set(person.department,[]);map.get(person.department).push(person);});
  return [...map].map(([name,faculty])=>({name,faculty,representative:faculty.find(person=>person.isRepresentative)||faculty[0],usesFallback:!faculty.some(person=>person.isRepresentative)}));
}
function facultyInitials(name=''){return [...name.replace(/\s/g,'')].slice(-2).join('')||'AI';}
function renderFacultyDetail(){
  const units=getFacultyUnits();
  if(!units.length)return `<section class="faculty-empty"><p class="faculty-label">FACULTY</p><h1>함께하는 교수진들</h1><p>교수진 데이터를 불러오지 못했습니다.</p></section>`;
  const repCards=units.map((unit,index)=>{const p=unit.representative,image=p.image||'./assets/faculty-silhouette.svg';return `<button class="faculty-rep-card${index===0?' selected':''}" type="button" data-faculty-unit="${index}"><span class="faculty-unit-name">${facultyEscape(unit.name)}</span><span class="faculty-portrait"><img src="${facultyEscape(image)}" alt="${facultyEscape(p.name)} 교수 사진${p.image?'':' 준비 중'}"></span><strong>${facultyEscape(p.name)}</strong><small>${facultyEscape(p.rank)}</small><em>${facultyEscape(p.specialty||'세부전공 정보 없음')}</em><span class="faculty-rep-expanded"><b>전공 및 경력</b><span>${facultyEscape(p.career||'정보 없음')}</span><b>AI 관련 주요경력</b><span>${facultyEscape(p.aiCareer||'정보 없음')}</span></span>${unit.usesFallback?'<i>대표교수 미지정 · 임시 보기</i>':''}</button>`;}).join('');
  return `<div class="faculty-detail"><header class="faculty-hero"><p class="faculty-label">FACULTY</p><p class="faculty-hero-subtitle">여러 학문분야의 전문성이 하나의 AI대학에서 만납니다.</p><h1>함께하는 교수진들</h1><span>${units.length}개 학부·전공의 전문성이 하나의 AI대학에서 연결됩니다.</span></header><section class="faculty-explorer"><div class="faculty-representatives" role="list">${repCards}</div><div class="faculty-group-head"><div><p>ACADEMIC UNIT</p><h2></h2></div><label><span class="sr-only">교수진 검색</span><input id="faculty-search" type="search" placeholder="교수명·세부전공·AI 키워드 검색"></label></div><div class="faculty-grid"></div></section><aside class="faculty-panel" aria-hidden="true"><button class="faculty-panel-close" type="button" aria-label="상세 프로필 닫기">×</button><div class="faculty-panel-content"></div></aside><button class="faculty-panel-backdrop" type="button" aria-label="상세 프로필 닫기" hidden></button></div>`;
}
function initFacultyDetail(){
  const root=document.querySelector('.faculty-detail');if(!root)return;const units=getFacultyUnits();let selectedUnit=0,previewUnit=0,selectedProfessor=null,query='';
  const reps=[...root.querySelectorAll('[data-faculty-unit]')],heading=root.querySelector('.faculty-group-head h2'),grid=root.querySelector('.faculty-grid'),search=root.querySelector('#faculty-search'),panel=root.querySelector('.faculty-panel'),panelContent=root.querySelector('.faculty-panel-content'),backdrop=root.querySelector('.faculty-panel-backdrop');
  const personCard=(person,index)=>`<button type="button" class="faculty-person-card" data-faculty-person="${index}"><span class="faculty-mini-portrait" aria-hidden="true">${facultyEscape(facultyInitials(person.name))}</span><span><strong>${facultyEscape(person.name)}</strong><small>${facultyEscape(person.rank)}</small><em>${facultyEscape(person.specialty||'세부전공 정보 없음')}</em><i>${facultyEscape(person.aiCareer||person.career||'AI 관련 주요경력 정보 없음')}</i></span></button>`;
  function showUnit(index,persist=false){previewUnit=index;if(persist)selectedUnit=index;const unit=units[index];reps.forEach((card,i)=>{card.classList.toggle('selected',i===index);card.classList.toggle('dimmed',i!==index);});heading.textContent=`${unit.name} 교수진 · ${unit.faculty.length}명`;renderGrid();}
  function renderGrid(){const unit=units[previewUnit],needle=query.trim().toLowerCase(),filtered=unit.faculty.filter(p=>!needle||[p.name,p.specialty,p.career,p.aiCareer].join(' ').toLowerCase().includes(needle));grid.classList.add('switching');setTimeout(()=>{grid.innerHTML=filtered.map(personCard).join('')||'<p class="faculty-no-result">검색 결과가 없습니다.</p>';grid.classList.remove('switching');grid.querySelectorAll('[data-faculty-person]').forEach(button=>button.addEventListener('click',()=>openProfessor(filtered[Number(button.dataset.facultyPerson)])));},120);}
  function openProfessor(person){selectedProfessor=person;panelContent.innerHTML=`<p class="faculty-label">FACULTY PROFILE</p><div class="faculty-panel-person"><span class="faculty-panel-portrait">${facultyEscape(facultyInitials(person.name))}</span><div><h2>${facultyEscape(person.name)}</h2><p>${facultyEscape(person.rank)}</p></div></div><dl><div><dt>소속 단과대학</dt><dd>${facultyEscape(person.college||'정보 없음')}</dd></div><div><dt>학부·학과</dt><dd>${facultyEscape(person.department||'정보 없음')}</dd></div><div><dt>세부전공</dt><dd>${facultyEscape(person.specialty||'정보 없음')}</dd></div><div><dt>전공 및 경력</dt><dd>${facultyEscape(person.career||'정보 없음')}</dd></div><div><dt>AI 관련 주요경력</dt><dd>${facultyEscape(person.aiCareer||'정보 없음')}</dd></div></dl>`;panel.classList.add('open');panel.setAttribute('aria-hidden','false');backdrop.hidden=false;panel.querySelector('.faculty-panel-close').focus();}
  function closePanel(){selectedProfessor=null;panel.classList.remove('open');panel.setAttribute('aria-hidden','true');backdrop.hidden=true;}
  reps.forEach((card,index)=>{card.addEventListener('pointerenter',()=>showUnit(index));card.addEventListener('focus',()=>showUnit(index));card.addEventListener('pointerleave',()=>showUnit(selectedUnit));card.addEventListener('click',()=>showUnit(index,true));});search.addEventListener('input',()=>{query=search.value;renderGrid();});panel.querySelector('.faculty-panel-close').addEventListener('click',closePanel);backdrop.addEventListener('click',closePanel);const onKey=event=>{if(event.key==='Escape'&&selectedProfessor)closePanel();};addEventListener('keydown',onKey);showUnit(0,true);facultyExperienceCleanup=()=>{removeEventListener('keydown',onKey);facultyExperienceCleanup=()=>{};};
}

function renderProgramsDetail(){
  const growth=[
    ['집중수업제','필요한 AI 역량 집중학습'],['특화트랙','관심 분야·진로 심화교육'],['역량패스','학점·역량인정 연계'],
    ['AX 1000','우수학생 발굴 · 캡스톤 · URP'],['AX 100','연구실 매칭 · 선이수 · 진학브리지'],['AX 10','정예연구 · Fellowship · Global Research']
  ];
  const project=[['REAL PROBLEM','산업·공공 실제 문제'],['REAL DATA','실제 산업·공공 데이터'],['AI PROJECT','분석 · AI 모델 개발'],['VALIDATE','결과 검증'],['IMPACT','현장 적용 가능성']];
  const research=[['UNDERGRADUATE','학부 연구'],['MASTER','선이수 · 진학브리지'],['Ph.D.','심화연구 · 연구 연속성'],['FELLOWSHIP','Research · Global · Career']];
  const startup=[['LEARN','AI 학습'],['BUILD','AX 프로젝트'],['RESEARCH','AI Lab'],['VALIDATE','기술검증'],['CONNECT','산학협력'],['START-UP','창업']];
  return `<div class="programs-detail"><nav class="program-section-nav" aria-label="특화 프로그램 섹션">${['성장경로','실전프로젝트','연구성장','창업'].map((label,i)=>`<button type="button" data-program-go="${i}" aria-label="${String(i+1).padStart(2,'0')} ${label}">${String(i+1).padStart(2,'0')}</button>`).join('')}</nav>
    <div class="program-journey" aria-hidden="true"><i></i>${['DESIGN','APPLY','ADVANCE','LAUNCH'].map((label,i)=>`<span data-journey="${i}">${label}</span>`).join('')}<b></b></div>
    <svg class="program-persistent-line" viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="persistentBaseGradient" x1="0" x2="1"><stop offset="0" stop-color="#317eae" stop-opacity=".06"/><stop offset=".42" stop-color="#398fc4" stop-opacity=".14"/><stop offset=".62" stop-color="#43a4df" stop-opacity=".26"/><stop offset="1" stop-color="#67c2f4" stop-opacity=".4"/></linearGradient><linearGradient id="persistentProgressGradient" x1="0" x2="1"><stop offset="0" stop-color="#347ba8" stop-opacity=".16"/><stop offset=".42" stop-color="#3f95c9" stop-opacity=".28"/><stop offset=".62" stop-color="#48aef0" stop-opacity=".72"/><stop offset="1" stop-color="#8bd7ff" stop-opacity=".94"/></linearGradient></defs><path class="persistent-line-base" pathLength="1" d="M-30 188 C155 188 170 365 365 350 C550 336 535 155 720 180 C825 194 900 280 1030 244"/><path class="persistent-line-progress" pathLength="1" d="M-30 188 C155 188 170 365 365 350 C550 336 535 155 720 180 C825 194 900 280 1030 244"/><circle class="persistent-line-point" r="4.5"/></svg>
    <section class="program-section" id="program-section-1" data-program-section="0"><div class="program-stage"><div class="program-left"><p class="program-label">01 · GROWTH PATH</p><h1>내 길을 설계하다</h1><strong>나에게 맞는 AI 학습에서 정예 연구인재까지</strong><p>학생의 전공과 진로에 맞춰 AI 학습경로를 설계하고, 우수인재 발굴부터 대학원 진학과 정예연구까지 단계적으로 지원합니다.</p></div><div class="program-right"><div class="growth-program-flow"><svg aria-hidden="true"><path class="program-flow-track" pathLength="1" d="M50 175 C180 25 330 300 470 145 S760 30 930 165"/><path class="program-flow-progress" pathLength="1" d="M50 175 C180 25 330 300 470 145 S760 30 930 165"/><circle class="program-blue-point" r="5"/></svg>${growth.map((item,i)=>`<button type="button" data-growth-program="${i}"><small>${i<3?'PNU AI PATHWAY':i===3?'DISCOVER':i===4?'GRADUATE BRIDGE':'ADVANCED'}</small><b>${item[0]}</b><span>${item[1]}</span></button>`).join('')}</div><p class="program-note">학생진로 설계형 AI 학습성장 경로 · 전 학문분야 AI교육 확산</p></div></div></section>
    <section class="program-section" id="program-section-2" data-program-section="1"><div class="program-stage"><div class="program-left"><p class="program-label">02 · REAL PROJECT</p><h2>실제 문제를 풀다</h2><strong>실제 데이터에서 시작하는 AI 프로젝트와 연구</strong><p>산업·공공 분야의 실제 데이터와 문제를 활용한 AX 캡스톤과 학부 연구 프로그램을 통해 AI를 현실 문제와 연구로 연결합니다.</p></div><div class="program-right"><div class="real-project-flow"><svg aria-hidden="true"><path class="real-project-line" pathLength="1" d="M55 125 C230 20 320 220 485 125 S760 30 925 125"/>${Array.from({length:22},(_,i)=>`<circle cx="${55+i*41}" cy="${125+Math.sin(i*.8)*38}" r="2.8"/>`).join('')}</svg><div class="real-project-steps">${project.map((item,i)=>`<article data-real-step="${i}"><small>AX CAPSTONE</small><b>${item[0]}</b><span>${item[1]}</span></article>`).join('')}</div><div class="urp-bridge"><small>URP · UNDERGRADUATE RESEARCH PROGRAM</small><b>연구실 매칭 → 학기·방학 연구수행 → 성과 발표 → 우수과제 심화연구 → 대학원 연구 연계</b></div></div></div></div></section>
    <section class="program-section" id="program-section-3" data-program-section="2"><div class="program-stage"><div class="program-left"><p class="program-label">03 · ADVANCED RESEARCH</p><h2>연구를 이어가다</h2><strong>학부에서 시작한 연구를 대학원과 세계 무대로</strong><p>학부 연구 경험을 대학원까지 연속적으로 이어가고, 우수 AI·AX 연구인재에게 연구·국제화·산학 경험을 제공합니다.</p></div><div class="program-right"><div class="research-continuum"><div class="fast-track"><small>6-YEAR FAST TRACK · 추진</small><b>7 YEARS → 6 YEARS</b><span>학부 7학기 · 석사 2학기 · 박사 3학기</span></div><svg aria-hidden="true"><path class="research-line" pathLength="1" d="M70 210 C260 80 680 310 900 175"/></svg><div class="research-nodes">${research.map((item,i)=>`<button type="button" data-research-step="${i}"><small>${item[0]}</small><b>${item[1]}</b></button>`).join('')}</div><div class="fellowship-orbits"><strong>PNU AX 10<br>장영실 AI Fellowship</strong>${[['RESEARCH','연구 프로젝트 · GPU · Cloud · 산업데이터'],['GLOBAL','해외연수 · 국제공동연구 · 글로벌 학회'],['CAREER','산학 공동지도 · 인턴십 · 후속 R&D']].map((item,i)=>`<button type="button" data-orbit="${i}"><b>${item[0]}</b><span>${item[1]}</span></button>`).join('')}</div></div></div></div></section>
    <section class="program-section start-up" id="program-section-4" data-program-section="3"><div class="program-stage"><div class="program-left"><p class="program-label">04 · START-UP</p><h2>기술을 세상으로</h2><strong>AI 아이디어와 연구성과를 실제 창업까지</strong><p>AI 학습과 프로젝트, 연구실에서 만들어진 아이디어와 기술을 검증·고도화하고 개인창업과 연구실 기술창업으로 연결합니다.</p></div><div class="program-right"><div class="startup-flow"><svg aria-hidden="true"><path class="startup-line" pathLength="1" d="M50 115 C260 20 660 205 925 110"/><path class="startup-branch" pathLength="1" d="M925 110 C850 205 740 240 650 270 M925 110 C960 195 910 240 845 270"/></svg><div class="startup-steps">${startup.map((item,i)=>`<article data-startup-step="${i}"><small>${item[0]}</small><b>${item[1]}</b></article>`).join('')}</div><div class="startup-routes"><article><small>STUDENT START-UP</small><b>학생 개인·팀 아이디어 기반 창업</b></article><article><small>LAB START-UP</small><b>연구실 연구성과·기술 기반 창업</b></article></div><div class="launch-copy"><b>Learn. Build. Launch.</b><span>배우고, 만들고, 세상에 내놓습니다.</span></div></div><div class="infrastructure-strip"><small>POWERED BY PNU AI INFRASTRUCTURE</small><b>GPU · DATA · AI SERVICES</b><span>AI 컴퓨팅·데이터 인프라를 공동 활용하고 동남권 대학·기업·출연연과 협력합니다.</span><button type="button" data-go="1">AI 교육·연구 인프라 보기 →</button></div></div></div></section>
  </div>`;
}

function initProgramsDetail(initialSection=0){
  const root=document.querySelector('.programs-detail');if(!root)return;
  root.querySelectorAll('.program-blue-point').forEach(point=>point.remove());
  root.querySelectorAll('[data-growth-program],[data-real-step],[data-research-step],[data-startup-step]').forEach(node=>{const rect=node.getBoundingClientRect();node.dataset.baseCenterY=String(rect.top+rect.height*.5);});
  const sectionEls=[...root.querySelectorAll('[data-program-section]')],nav=[...root.querySelectorAll('[data-program-go]')],journey=[...root.querySelectorAll('[data-journey]')],clamp=value=>Math.max(0,Math.min(1,value));let raf=0;
  function draw(){raf=0;const horizontal=innerWidth>900;const total=Math.max(1,root.offsetHeight-innerHeight);const pageP=horizontal?clamp(-root.getBoundingClientRect().top/total):0;const timeline=pageP*4;const active=horizontal?Math.min(3,Math.floor(timeline)):Math.max(0,sectionEls.findIndex(el=>{const r=el.getBoundingClientRect();return r.top<=innerHeight*.5&&r.bottom>innerHeight*.5;}));const phase=horizontal?timeline-active:0;const transition=active<3?clamp((phase-.72)/.28):0;const eased=transition*transition*(3-2*transition);const position=active+eased;const interaction=horizontal?clamp(phase/.72):1;sectionEls.forEach((el,i)=>{if(horizontal)el.style.transform=`translate3d(${(i-position)*100}vw,0,0)`;else el.style.transform='';});nav.forEach(button=>button.classList.toggle('active',Number(button.dataset.programGo)===active));journey.forEach((item,i)=>item.classList.toggle('active',i<=active));root.querySelector('.program-journey').style.setProperty('--journey',String(pageP));subnavButton.textContent=sections[3].subs[active];const persistent=root.querySelector('.persistent-line-progress'),persistentPoint=root.querySelector('.persistent-line-point'),persistentLength=persistent.getTotalLength()||1;persistent.style.strokeDasharray=String(persistentLength);persistent.style.strokeDashoffset=String(persistentLength*(1-pageP));
    const growthP=horizontal?(active===0?interaction:active>0?1:0):clamp(-sectionEls[0].getBoundingClientRect().top/Math.max(1,sectionEls[0].offsetHeight-innerHeight)),growthNodes=[...root.querySelectorAll('[data-growth-program]')],growthIndex=Math.min(5,Math.floor(growthP*6));growthNodes.forEach((node,i)=>node.classList.toggle('active',i===growthIndex));const flow=root.querySelector('.program-flow-progress'),length=flow.getTotalLength()||1;flow.style.strokeDasharray=String(length);flow.style.strokeDashoffset=String(length*(1-growthP));
    const projectP=horizontal?(active===1?interaction:active>1?1:0):active===1?1:0;root.querySelector('.real-project-flow').style.setProperty('--project',projectP);root.querySelectorAll('[data-real-step]').forEach((step,i)=>step.classList.toggle('active',projectP>=i*.16));
    const researchP=horizontal?(active===2?interaction:active>2?1:0):active===2?1:0;root.querySelector('.research-continuum').style.setProperty('--research',researchP);root.querySelectorAll('[data-research-step]').forEach((step,i)=>step.classList.toggle('active',researchP>=i*.2));
    const startupP=horizontal?(active===3?interaction:0):active===3?1:0;root.querySelector('.startup-flow').style.setProperty('--startup',startupP);root.querySelectorAll('[data-startup-step]').forEach((step,i)=>step.classList.toggle('active',startupP>=i*.13));if(horizontal){const groups=[[...root.querySelectorAll('[data-growth-program]')],[...root.querySelectorAll('[data-real-step]')],[...root.querySelectorAll('[data-research-step]')],[...root.querySelectorAll('[data-startup-step]')]],current=groups[active],nodePosition=interaction*Math.max(0,current.length-1),from=current[Math.floor(nodePosition)],to=current[Math.min(current.length-1,Math.ceil(nodePosition))],mix=nodePosition-Math.floor(nodePosition),center=node=>{const r=node.getBoundingClientRect();return r.left+r.width*.5;};groups.flat().forEach(node=>node.style.setProperty('--curve-float','0px'));let targetX=center(from)+(center(to)-center(from))*mix;if(transition>0&&active<3){const outgoing=center(current[current.length-1])+eased*innerWidth,incoming=center(groups[active+1][0])-(1-eased)*innerWidth;targetX=outgoing+(incoming-outgoing)*eased;}const svgRect=root.querySelector('.program-persistent-line').getBoundingClientRect(),pointAtX=screenX=>{const svgX=clamp((screenX-svgRect.left)/svgRect.width)*1000;let best=persistent.getPointAtLength(0),distance=Infinity;for(let sample=0;sample<=180;sample++){const candidate=persistent.getPointAtLength(persistentLength*sample/180),gap=Math.abs(candidate.x-svgX);if(gap<distance){distance=gap;best=candidate;}}return best;},bestPoint=pointAtX(targetX);persistentPoint.setAttribute('cx',bestPoint.x);persistentPoint.setAttribute('cy',bestPoint.y);const baseline=current.reduce((sum,node)=>{const r=node.getBoundingClientRect();return sum+r.top+r.height*.5;},0)/current.length;current.forEach((node,i)=>{const influence=Math.max(0,1-Math.abs(i-nodePosition)/1.25),curve=pointAtX(center(node)),curveScreenY=svgRect.top+curve.y/500*svgRect.height,offset=Math.max(-54,Math.min(54,(curveScreenY-baseline)*.36))*influence;node.style.setProperty('--curve-float',`${offset.toFixed(1)}px`);});}
    if(horizontal){const selectors=['[data-growth-program]','[data-real-step]','[data-research-step]','[data-startup-step]'],nodes=[...root.querySelectorAll(selectors[active])],selected=nodes[Math.min(nodes.length-1,Math.round(interaction*(nodes.length-1)))];root.querySelectorAll(selectors.join(',')).forEach(node=>node.style.setProperty('--single-float','0px'));if(selected){const svgRect=root.querySelector('.program-persistent-line').getBoundingClientRect(),pointY=Number(persistentPoint.getAttribute('cy')),curveY=svgRect.top+pointY/500*svgRect.height,baseY=Number(selected.dataset.baseCenterY),offset=Math.max(-54,Math.min(54,(curveY-baseY)*.36));selected.style.setProperty('--single-float',`${offset.toFixed(1)}px`);}}
  }
  const go=i=>innerWidth>900?window.scrollTo({top:root.offsetTop+(root.offsetHeight-innerHeight)*(i/4),behavior:'smooth'}):sectionEls[i].scrollIntoView({behavior:'smooth'});const schedule=()=>{if(!raf)raf=requestAnimationFrame(draw);};root.querySelectorAll('[data-program-go]').forEach(button=>button.addEventListener('click',()=>go(Number(button.dataset.programGo))));if(initialSection>0)requestAnimationFrame(()=>go(initialSection));addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});draw();
  programsExperienceCleanup=()=>{if(raf)cancelAnimationFrame(raf);removeEventListener('scroll',schedule);removeEventListener('resize',schedule);programsExperienceCleanup=()=>{};};
}

function renderAdmissionsDetail(){
  const axes=[
    ['A · AI','214명','AI컴퓨터공학부','AI · Algorithm · System'],
    ['D · DATA','114명','데이터사이언스학부 · 통계학과','Data · Analytics · Statistics'],
    ['P · PROCESS','69명','산업공학부','Process · Optimization'],
    ['X · AX','27명','AX융합학부','AX · Convergence']
  ];
  const project=[['REAL PROBLEM','산업·공공 분야의 실제 문제'],['REAL DATA','실제 산업·공공 데이터'],['AI PROJECT','데이터 분석 · AI 모델 개발'],['REAL IMPACT','산업·사회 문제에 AI 적용']];
  const growth=[['LEARN','AI·AX 교육'],['PROJECT','산업·공공 프로젝트'],['RESEARCH','연구 경험'],['INNOVATE','연구 · 창업 · 산업']];
  return `<div class="admissions-detail">
    <nav class="admission-section-nav" aria-label="신입생 모집 섹션">${['입학안내','모집단위','교육경험','성장경로'].map((label,i)=>`<button type="button" data-admission-go="${i}" aria-label="${String(i+1).padStart(2,'0')} ${label}">${String(i+1).padStart(2,'0')}</button>`).join('')}</nav>
    <section class="admission-section admissions" id="admission-section-1" data-admission-section="0"><div class="admission-stage"><div class="admission-left"><p class="admission-label">01 · ADMISSIONS</p><h1>입학,<br>여기서 시작</h1><p class="admission-subtitle">2027년 3월, 부산대학교 AI대학이 출범합니다.</p></div><div class="admission-right"><div class="admission-copy"><small>2027학년도 수시모집</small><p>2027학년도 부산대학교 수시모집 원서접수는 <strong>2026년 9월 8일부터 11일까지 진행될 예정입니다.</strong></p><p>전형별 모집인원, 지원자격, 전형방법은 부산대학교 입학정보 홈페이지에서 확인합니다.</p></div><div class="calendar-card"><div class="calendar-head"><span>2026 SEPTEMBER</span><b><i data-date-part="year">2027</i><i data-date-part="month">09</i><i data-date-part="range">08 — 11</i></b></div><div class="calendar-days">${[8,9,10,11].map((day,i)=>`<span data-calendar-day="${i}">${String(day).padStart(2,'0')}</span>`).join('')}<i class="calendar-progress"></i></div><p>2027학년도 수시모집 원서접수 예정</p></div><div class="admission-actions"><a class="admission-primary" href="https://go.pusan.ac.kr" target="_blank" rel="noopener">입학정보 확인하기 <span>→</span></a><button type="button" data-admission-go="1">AI대학 모집단위 보기 ↓</button></div></div></div></section>
    <section class="admission-section majors" id="admission-section-2" data-admission-section="1"><div class="admission-stage"><div class="admission-left"><p class="admission-label">02 · MAJORS</p><h2>424명,<br>하나의 AI대학</h2><p class="admission-subtitle">AI · DATA · PROCESS · AX</p></div><div class="admission-right"><div class="admission-copy"><small>AI대학 구성</small><p>AI 핵심기술부터 데이터, 산업공정, 산업·사회 분야의 AX 적용까지 연결하는 교육체계입니다.</p></div><div class="major-scale"><div class="major-total"><strong>424</strong><span>AI대학 전체 규모</span></div><svg class="major-lines" aria-hidden="true">${axes.map((_,i)=>`<path data-major-line="${i}"/>`).join('')}</svg><div class="major-axis-grid">${axes.map((axis,i)=>`<button type="button" class="major-axis" data-major-axis="${i}"><small>${axis[0]}</small><b>${axis[1]}</b><strong>${axis[2]}</strong><span>${axis[3]}</span></button>`).join('')}</div></div><button class="text-cta" type="button" data-go="1">AI대학 조직체계 자세히 보기 →</button></div></div></section>
    <section class="admission-section education" id="admission-section-3" data-admission-section="2"><div class="admission-stage"><div class="admission-left"><p class="admission-label">03 · EDUCATION</p><h2>배우고,<br>직접 적용하고</h2></div><div class="admission-right"><div class="admission-copy"><small>실제 데이터를 활용하는 프로젝트 중심 교육</small><p>AI대학은 <strong>실제 산업·공공 데이터를 활용한 프로젝트 중심 교육</strong>으로 실무역량을 높이고 AI와 산업을 연결합니다.</p></div><div class="project-visual"><svg aria-hidden="true"><path class="project-path" pathLength="1" d="M70 130 C220 15 350 245 500 130 S780 20 930 130"/>${Array.from({length:18},(_,i)=>`<circle cx="${70+i*50}" cy="${130+Math.sin(i*.9)*42}" r="3"/>`).join('')}</svg><div class="project-steps">${project.map((item,i)=>`<article data-project-step="${i}"><small>STEP ${String(i+1).padStart(2,'0')}</small><b>${item[0]}</b><span>${item[1]}</span></article>`).join('')}</div><p class="project-support">AI TECHNOLOGY → DATA → PROCESS → AX</p></div></div></div></section>
    <section class="admission-section growth" id="admission-section-4" data-admission-section="3"><div class="admission-stage"><div class="admission-left"><p class="admission-label">04 · GROWTH</p><h2>입학에서<br>성장까지</h2></div><div class="admission-right"><div class="admission-copy"><small>AI·AX 전문인재로 이어지는 성장경로</small><p>프로젝트 중심 교육을 연구와 창업으로 확장해 <strong>창업·연구 친화적 AI·AX 전문인재</strong>를 단계적으로 육성합니다.</p></div><div class="growth-path">${growth.map((item,i)=>`<article data-growth-step="${i}"><small>${item[0]}</small><b>${item[1]}</b></article>`).join('')}<i></i></div><div class="program-preview">${['PNU AI 특화 Pathway','AX Capstone · URP','PNU AX 1000 · 100 · 10','AI Lab to Start-Up'].map(name=>`<span>${name}</span>`).join('')}</div><button class="text-cta" type="button" data-go="3">AI대학 특화 프로그램 자세히 보기 →</button><div class="final-admission-cta"><small>READY TO APPLY?</small><strong>2027학년도 부산대학교 AI대학</strong><span>수시모집 원서접수 예정 · 2026.09.08 — 09.11</span><a href="https://go.pusan.ac.kr" target="_blank" rel="noopener">입학정보 확인하기 →</a></div></div></div></section>
  </div>`;
}

function initAdmissionsDetail(initialSection=0){
  const root=document.querySelector('.admissions-detail');if(!root)return;
  const sectionsEls=[...root.querySelectorAll('[data-admission-section]')],nav=[...root.querySelectorAll('[data-admission-go]')],clamp=value=>Math.max(0,Math.min(1,value));let raf=0;
  const progress=el=>clamp(-el.getBoundingClientRect().top/Math.max(1,el.offsetHeight-innerHeight));
  function draw(){raf=0;const values=sectionsEls.map(progress),active=Math.max(0,sectionsEls.findIndex(el=>{const r=el.getBoundingClientRect();return r.top<=innerHeight*.5&&r.bottom>innerHeight*.5;}));nav.forEach(button=>button.classList.toggle('active',Number(button.dataset.admissionGo)===active));subnavButton.textContent=sections[2].subs[active];
    const admissionP=values[0];root.querySelectorAll('[data-date-part]').forEach((part,i)=>part.style.setProperty('--show',clamp((admissionP-.06-i*.11)/.16)));root.querySelectorAll('[data-calendar-day]').forEach((day,i)=>day.style.setProperty('--show',clamp((admissionP-.18-i*.1)/.13)));root.querySelector('.calendar-progress').style.setProperty('--progress',clamp((admissionP-.2)/.45));
    const majorsP=values[1];root.querySelector('.major-total').style.setProperty('--split',clamp((majorsP-.12)/.34));root.querySelectorAll('.major-axis').forEach((axis,i)=>axis.style.setProperty('--show',clamp((majorsP-.28-i*.08)/.15)));root.querySelector('.major-lines').style.setProperty('--draw',clamp((majorsP-.3)/.42));
    const total=root.querySelector('.major-total').getBoundingClientRect(),visual=root.querySelector('.major-scale').getBoundingClientRect();root.querySelectorAll('.major-axis').forEach((axis,i)=>{const r=axis.getBoundingClientRect(),path=root.querySelector(`[data-major-line="${i}"]`);path.setAttribute('d',`M ${total.left+total.width/2-visual.left} ${total.bottom-visual.top} C ${total.left+total.width/2-visual.left} ${total.bottom-visual.top+40}, ${r.left+r.width/2-visual.left} ${r.top-visual.top-35}, ${r.left+r.width/2-visual.left} ${r.top-visual.top}`);});
    const educationP=values[2];root.querySelectorAll('[data-project-step]').forEach((step,i)=>step.classList.toggle('active',educationP>=i*.2+.08));root.querySelector('.project-visual').style.setProperty('--project',clamp((educationP-.08)/.72));
    const growthP=values[3];root.querySelectorAll('[data-growth-step]').forEach((step,i)=>step.style.setProperty('--show',clamp((growthP-.05-i*.13)/.16)));root.querySelector('.growth-path').style.setProperty('--path',clamp((growthP-.08)/.58));
  }
  const schedule=()=>{if(!raf)raf=requestAnimationFrame(draw);};
  root.querySelectorAll('[data-admission-go]').forEach(button=>button.addEventListener('click',()=>sectionsEls[Number(button.dataset.admissionGo)].scrollIntoView({behavior:'smooth'})));
  if(initialSection>0)requestAnimationFrame(()=>sectionsEls[initialSection]?.scrollIntoView({behavior:'auto'}));addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});draw();
  admissionsExperienceCleanup=()=>{if(raf)cancelAnimationFrame(raf);removeEventListener('scroll',schedule);removeEventListener('resize',schedule);admissionsExperienceCleanup=()=>{};};
}

function renderCollegeIntroduction(){
  const keywords=['EDUCATION','RESEARCH','DATA','INFRASTRUCTURE','INDUSTRY','AX'];
  const facts=[['424','AI 전공 정원'],['ADP+X','하나로 연결된 교육'],['300','산학·연구 네트워크'],['AI Infrastructure','교육에서 실행까지']];
  return `<div class="college-intro">
    <nav class="chapter-nav" aria-label="AI대학 소개 챕터"><button class="chapter-home" type="button" aria-label="차례로 돌아가기">PNU AI</button><div>${['01 출범','02 비전','03 혁신','04 미래'].map((label,i)=>`<button type="button" data-chapter="${i}">${label}</button>`).join('')}</div></nav>
    <section class="intro-chapter beginning" id="college-chapter-1" data-chapter-section="0"><div class="chapter-stage"><p class="chapter-number">01 · BEGINNING</p><header class="chapter-heading"><p>흩어진 AI 역량을 하나로.</p><h1>부산대학교 AI대학 출범</h1></header><div class="launch-point" tabindex="0" role="img" aria-label="작은 푸른 입자로 이루어진 2027.03"><div class="particle-date" aria-hidden="true"><span class="particle-fallback">2027.03</span></div><span class="point-note">교육과 연구, 산업을 하나의 중심으로</span></div></div></section>
    <section class="intro-chapter vision" id="college-chapter-2" data-chapter-section="1"><div class="chapter-stage"><p class="chapter-number">02 · VISION</p><header class="chapter-heading"><p>EDUCATION · RESEARCH · DATA · INFRASTRUCTURE · INDUSTRY · AX</p><h2>AI를 연결해,<br>변화를 실행합니다.</h2></header><div class="chapter-interaction keyword-field"><svg class="keyword-connections" aria-hidden="true">${Array.from({length:9},(_,i)=>`<path data-link="${i}"/>`).join('')}</svg>${keywords.map((word,i)=>`<span class="vision-keyword" data-keyword="${i}">${word}</span>`).join('')}<div class="apex-core"><strong>PNU-APEX</strong><span>AI·AX Platform for Education and eXecution</span></div></div></div></section>
    <section class="intro-chapter excellence" id="college-chapter-3" data-chapter-section="2"><div class="chapter-stage"><p class="chapter-number">03 · EXCELLENCE</p><header class="chapter-heading"><p>EDUCATION · DATA · PROCESS · X</p><h2>숫자를 넘어,<br>하나의 혁신 체계로.</h2></header><div class="chapter-interaction facts-stage"><svg class="fact-connections" viewBox="0 0 1000 520" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M170 170 C320 170 330 260 500 260 S680 350 830 350"/><path pathLength="1" d="M170 350 C320 350 330 260 500 260 S680 170 830 170"/></svg><div class="fact-grid">${facts.map((fact,i)=>`<article class="fact" data-fact="${i}"><strong>${i===0||i===2?`<span class="counter" data-target="${fact[0]}">0</span>`:fact[0]}</strong><span>${fact[1]}</span></article>`).join('')}</div></div></div></section>
    <section class="intro-chapter future" id="college-chapter-4" data-chapter-section="3"><div class="chapter-stage"><p class="chapter-number">04 · FUTURE</p><header class="chapter-heading"><p>부산에서 시작해 동남권으로.</p><h2>From AI Education<br>to AI Transformation.</h2></header><div class="chapter-interaction future-stage"><div class="scale-stage"><span data-scale="0">PNU</span><span data-scale="1">BUSAN</span><span data-scale="2">SOUTHEAST REGION</span></div><div class="roadmap"><div class="roadmap-line"><i></i></div>${[2026,2027,2028,2029,2030].map(year=>`<div class="roadmap-year ${year===2027?'launch':''}"><b>${year}</b><span>${year===2026?'FOUNDATION':year===2027?'LAUNCH':year===2028?'CONNECT':year===2029?'EXPAND':'TRANSFORM'}</span></div>`).join('')}</div></div></div></section>
  </div>`;
}

function initCollegeIntroduction(initialChapter=0){
  const root=document.querySelector('.college-intro');
  if(!root)return;
  const chapters=[...root.querySelectorAll('[data-chapter-section]')];
  const navButtons=[...root.querySelectorAll('[data-chapter]')];
  const point=root.querySelector('.launch-point');
  const particleDate=root.querySelector('.particle-date');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let raf=0;
  const clamp=value=>Math.max(0,Math.min(1,value));
  const progress=el=>clamp(-el.getBoundingClientRect().top/Math.max(1,el.offsetHeight-innerHeight));
  const draw=()=>{
    raf=0;
    const values=chapters.map(progress);
    const active=Math.min(3,Math.max(0,chapters.findIndex(ch=>{const r=ch.getBoundingClientRect();return r.top<=innerHeight*.5&&r.bottom>innerHeight*.5;})));
    navButtons.forEach((button,i)=>button.classList.toggle('active',i===active));
    if(currentCategory===0&&sections[0].subs[active])subnavButton.textContent=sections[0].subs[active];
    point.style.setProperty('--reveal',clamp((values[0]-.12)/.3));
    const visionP=values[1];
    const visionWords=[...root.querySelectorAll('.vision-keyword')];
    visionWords.forEach((word,i)=>{const angle=(i/6)*Math.PI*2-.45;const pull=1-clamp((visionP-.08)/.55);word.style.transform=`translate(calc(-50% + ${Math.cos(angle)*Math.min(innerWidth*.34,430)*pull}px), calc(-50% + ${Math.sin(angle)*Math.min(innerHeight*.3,230)*pull}px)) scale(${.82+.18*(1-pull)})`;word.style.opacity=String(1-clamp((visionP-.52)/.18));});
    const field=root.querySelector('.keyword-field'),fieldRect=field.getBoundingClientRect(),points=visionWords.map(word=>{const r=word.getBoundingClientRect();return{x:r.left+r.width/2-fieldRect.left,y:r.top+r.height/2-fieldRect.top};});
    root.querySelectorAll('.keyword-connections path').forEach((path,i)=>{const from=points[i%6],to=points[i<6?(i+1)%6:(i+3)%6],cx=(from.x+to.x)/2+(fieldRect.width/2-(from.x+to.x)/2)*.16,cy=(from.y+to.y)/2+(fieldRect.height/2-(from.y+to.y)/2)*.16;path.setAttribute('d',`M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`);});
    field.style.setProperty('--lines',String((1-clamp((visionP-.46)/.2))*.64));
    root.querySelector('.apex-core').style.setProperty('--show',clamp((visionP-.48)/.18));
    const factP=values[2];
    root.querySelectorAll('.fact').forEach((fact,i)=>fact.style.setProperty('--show',clamp((factP-(.08+i*.12))/.16)));
    root.querySelector('.fact-connections').style.setProperty('--draw',clamp((factP-.5)/.3));
    root.querySelectorAll('.counter').forEach(counter=>{const targetValue=Number(counter.dataset.target);counter.textContent=Math.round(targetValue*clamp((factP-.08)/.6)).toLocaleString();});
    const futureP=values[3];
    root.querySelectorAll('[data-scale]').forEach((label,i)=>{const start=.05+i*.14;const enter=clamp((futureP-start)/.12);const leave=1-clamp((futureP-(i<2?start+.16:.48))/.1);label.style.setProperty('--show',enter*leave);});
    root.querySelector('.roadmap').style.setProperty('--show',clamp((futureP-.5)/.18));
    root.querySelector('.roadmap').style.setProperty('--line',clamp((futureP-.5)/.32));
  };
  const schedule=()=>{if(!raf)raf=requestAnimationFrame(draw);};
  function buildParticleDate(){
    const canvas=document.createElement('canvas');canvas.width=680;canvas.height=160;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#fff';ctx.font='700 116px "Noto Sans KR", sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('2027.03',canvas.width/2,canvas.height/2-3);
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;const fragment=document.createDocumentFragment();
    for(let y=6;y<canvas.height-6;y+=4)for(let x=6;x<canvas.width-6;x+=4){if(pixels[(y*canvas.width+x)*4+3]>105){const dot=document.createElement('i');dot.className='date-particle';dot.dataset.x=x;dot.dataset.y=y;dot.style.left=`${x/canvas.width*100}%`;dot.style.top=`${y/canvas.height*100}%`;dot.style.setProperty('--delay',`${((x+y)%23)*-.1}s`);fragment.append(dot);}}
    particleDate.replaceChildren(fragment);
  }
  const moveParticles=event=>{const rect=particleDate.getBoundingClientRect();const px=event.clientX-rect.left,py=event.clientY-rect.top;point.style.setProperty('--proximity',clamp(1-Math.hypot(px-rect.width/2,py-rect.height/2)/Math.max(180,rect.width*.55)).toFixed(3));particleDate.querySelectorAll('.date-particle').forEach(dot=>{const x=Number(dot.dataset.x)/680*rect.width,y=Number(dot.dataset.y)/160*rect.height,dx=x-px,dy=y-py,dist=Math.hypot(dx,dy),force=clamp(1-dist/96);if(force>0){const amount=force*18;dot.style.translate=`${dx/(dist||1)*amount}px ${dy/(dist||1)*amount}px`;dot.style.scale=String(1+force*.9);dot.style.opacity=String(.58+force*.42);}else{dot.style.translate='0 0';dot.style.scale='1';dot.style.opacity='';}});};
  const resetParticles=()=>{point.style.setProperty('--proximity','0');particleDate.querySelectorAll('.date-particle').forEach(dot=>{dot.style.translate='0 0';dot.style.scale='1';dot.style.opacity='';});};
  const onPointer=event=>moveParticles(event);
  root.querySelector('.chapter-home').addEventListener('click',()=>showIndex(true));
  navButtons.forEach((button,i)=>button.addEventListener('click',()=>chapters[i].scrollIntoView({behavior:reduced.matches?'auto':'smooth'})));
  document.fonts.ready.then(buildParticleDate);addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});point.addEventListener('pointermove',onPointer,{passive:true});point.addEventListener('pointerleave',resetParticles);
  if(initialChapter>0) requestAnimationFrame(()=>chapters[initialChapter]?.scrollIntoView({behavior:'auto',block:'start'}));
  draw();
  introExperienceCleanup=()=>{if(raf)cancelAnimationFrame(raf);removeEventListener('scroll',schedule);removeEventListener('resize',schedule);point.removeEventListener('pointermove',onPointer);point.removeEventListener('pointerleave',resetParticles);document.body.classList.remove('college-intro-mode');introExperienceCleanup=()=>{};};
}

function initOrgAnimations(){
  initOrganizationContinuum();
}

function renderOrganizationDetail(){
  const axMajors=['조선해양','미래모빌리티','우주항공','방산','차세대원자력','스마트제조','항만물류','바이오헬스','금융핀테크','에너지','스마트시티','기후환경','의료','교육','공공정책','문화콘텐츠','법·윤리'];
  const nodes=[
    ['ai','AI대학','CENTRAL HUB'],['split','',''],['a','A','AI'],['d','D','DATA'],['p','P','PROCESS'],['x','X','AX'],
    ['unit-a','AI컴퓨터공학부','214명','AI 모델·알고리즘·시스템 및 AI 서비스 구현','컴퓨터공학 · 인공지능 · 인터랙티브컴퓨팅 · AI컴퓨팅자율전공'],
    ['unit-d','데이터사이언스학부·통계학과','114명','데이터 수집·처리·분석과 통계적 추론','신뢰성 검증 · 불확실성 정량화 · 통계학과 공동'],
    ['unit-p','산업공학부','69명','산업·사회 문제 구조화와 프로세스 최적화','산업공학전공 · 산업AI전공'],
    ['unit-x','AX융합학부','17개 연계전공','ADP 공통역량을 산업·사회 현장에 적용','도메인별 AI 전환 교육 · 산학 프로젝트'],
    ...axMajors.map((name,i)=>[`ax-${i+1}`,name,'AX CONVERGENCE PROGRAM']),
    ['edu','AI융합교육원','AI보편교육·확산'],['research','장영실AI융합연구원','전략산업 AX지원'],['infra','AX정보화혁신본부','운영·인프라 지원'],['industry','산학·산업 파트너','INDUSTRY'],
    ['rail-undergrad','학부 연구','UNDERGRADUATE','AI 기초·전공 역량|AX 캡스톤|URP 연구 탐색','PNU AX 1000'],
    ['rail-research','연구 참여','RESEARCH','연구실 매칭|학기·방학 연구 수행|연구성과 발표|우수과제 연구 심화','URP · RESEARCH LAB'],
    ['rail-graduate','대학원 진학','GRADUATE','대학원 교과 선이수|PNU AX 진학브리지|학·석·박 연계|6년 패스트트랙 추진','PNU AX 100'],
    ['rail-advanced','정예연구','ADVANCED RESEARCH','PNU AX 10 정예연구트랙|장영실 AI 펠로우십|국제공동연구|GPU · 클라우드 · 산업데이터 지원','PNU AX 10']
  ];
  const edges=[['ai','split','stem'],['split','a','core'],['split','d','core'],['split','p','core'],['split','x','core'],['a','unit-a','unit'],['d','unit-d','unit'],['p','unit-p','unit'],['x','unit-x','unit'],...axMajors.map((_,i)=>['unit-x',`ax-${i+1}`,'ax']),['edu','research','ecos-link'],['research','infra','ecos-link'],['rail-undergrad','rail-research','rail'],['rail-research','rail-graduate','rail'],['rail-graduate','rail-advanced','rail']];
  const headings=[
    ['01 · FOUNDATION','하나의 중심에서,<br>네 개의 축으로.'],['02 · ADP+X','학문을 연결해,<br>실제 조직으로.'],['03 · AX CONVERGENCE','17개 AX 융합·연계전공'],['04 · PNU-APEX','배우고, 연구하고,<br>실행합니다.'],['05 · GROWTH RAIL','학부에서 정예연구까지,<br>하나의 성장 레일로.']
  ];
  const chapterSteps=[0,1,3,4];
  const renderNode=node=>`<button class="org-node" type="button" data-node="${node[0]}" aria-label="${node[1]}"><small>${node[2]}</small><strong>${node[1]}</strong>${node[0].startsWith('ax-')?`<span class="ax-node-detail"><b>${node[1]}</b><em>AX CONVERGENCE PROGRAM</em></span>`:node[3]?node[0].startsWith('rail-')?`<span class="rail-node-detail">${node[3].split('|').map(line=>`<i>${line}</i>`).join('')}<b>${node[4]}</b></span>`:`<span class="org-node-detail"><b>${node[3]}</b><em>${node[4]}</em></span>`:''}</button>`;
  return `<div class="org-continuum"><nav class="org-progress-nav" aria-label="조직체계 챕터">${[0,1,2,3,4].map(step=>`<button type="button" data-org-go="${step}">${String(step+1).padStart(2,'0')}</button>`).join('')}</nav><div class="org-graph-sticky"><div class="org-headings">${headings.map((item,i)=>`<header data-org-heading="${i}"><p>${item[0]}</p><h1>${item[1]}</h1>${i===2?`<div class="ax-heading-copy"><b>AX융합학부를 중심으로 AI 역량을 다양한 산업·사회 분야와 연결합니다.</b></div>`:''}</header>`).join('')}</div><div class="ecosystem-partners"><p>IT Big-Tech 기업참여형 교육과정 운영</p><div class="partner-logo-grid"><img src="./assets/logo-naver-cloud.png" alt="NAVER Cloud"><img src="./assets/logo-google.png" alt="Google"><img src="./assets/logo-aws.png" alt="AWS"><img src="./assets/logo-lguplus.png" alt="LG U+"><img src="./assets/logo-upstage.png" alt="Upstage"></div></div><div class="growth-supports" aria-label="연속 지원 체계"><article data-support="0"><small>SUPPORT 01</small><b>RESEARCH EXPERIENCE</b><span>연구실 매칭 · AX 캡스톤 · URP</span></article><article data-support="1"><small>SUPPORT 02</small><b>GRADUATE BRIDGE</b><span>대학원 교과 선이수 · 진학브리지 · 공동지도</span></article><article data-support="2"><small>SUPPORT 03</small><b>FAST &amp; ADVANCED TRACK</b><span>학·석·박 6년 패스트트랙 추진 · 정예연구 지원</span></article></div><svg class="org-network-svg" aria-hidden="true"><g>${edges.map((edge,i)=>`<path pathLength="1" data-edge="${i}" data-from="${edge[0]}" data-to="${edge[1]}" data-kind="${edge[2]}"/>`).join('')}</g><path class="growth-rail-track"/><path class="growth-rail-progress"/><circle class="growth-rail-point" r="4"/></svg><div class="org-node-layer">${nodes.map(renderNode).join('')}</div><div class="growth-final"><b>Research Experience → Graduate Study → Advanced Research</b><span>연구 경험이 진학으로, 진학이 정예연구로 이어집니다.</span></div><button class="growth-next" type="button" data-go="3">AI대학 특화 프로그램 자세히 보기 <span>↓</span></button></div><div class="org-steps">${headings.map((_,i)=>`<section id="org-step-${i+1}" data-org-step="${i}" aria-label="조직체계 ${i+1}단계"></section>`).join('')}</div></div>`;
}

function initOrganizationContinuum(){
  const root=document.querySelector('.org-continuum');if(!root)return;
  const stage=root.querySelector('.org-graph-sticky'),steps=[...root.querySelectorAll('[data-org-step]')],nodes=[...root.querySelectorAll('.org-node')],paths=[...root.querySelectorAll('[data-edge]')],headings=[...root.querySelectorAll('[data-org-heading]')],nav=[...root.querySelectorAll('[data-org-go]')],supports=[...root.querySelectorAll('[data-support]')],railTrack=root.querySelector('.growth-rail-track'),railProgress=root.querySelector('.growth-rail-progress'),railPoint=root.querySelector('.growth-rail-point'),growthFinal=root.querySelector('.growth-final'),growthNext=root.querySelector('.growth-next');
  const clamp=value=>Math.max(0,Math.min(1,value)),mix=(a,b,t)=>a+(b-a)*t;
  const axes=['a','d','p','x'],units=['unit-a','unit-d','unit-p','unit-x'],ecos=['edu','research','infra','industry'],rails=['rail-undergrad','rail-research','rail-graduate','rail-advanced'];
  function state(id,s){
    const hidden={x:50,y:66,o:0,z:.65};let i;
    if(id==='ai')return [ {x:50,y:48,o:1,z:1.1},{x:50,y:42,o:1,z:.94},{x:18,y:32,o:0,z:.66},{x:50,y:58,o:0,z:.7},{x:8,y:66,o:0,z:.65} ][s];
    if(id==='split')return [{x:50,y:61,o:0,z:.1},{x:50,y:54,o:1,z:.1},{x:50,y:51,o:0,z:.1},{x:50,y:59,o:0,z:.1},hidden][s];
    if((i=axes.indexOf(id))>=0)return [ {x:50,y:61,o:0,z:.55},{x:18+i*21.3,y:60,o:1,z:.84},{x:id==='x'?50:18+i*7,y:id==='x'?43:70,o:id==='x'?.12:0,z:id==='x'?.82:.58},{x:32+i*12,y:76,o:0,z:.7},hidden ][s];
    if((i=units.indexOf(id))>=0){const unitX=[12,37,63,88][i],isAx=id==='unit-x',mobile=innerWidth<=720;return [hidden,{x:unitX,y:80,o:1,z:.92},{x:isAx?50:18+i*10,y:isAx?(mobile?37:40):80,o:isAx?1:0,z:isAx?1:.6},{x:27+i*11.5,y:84,o:0,z:.54},hidden][s];}
    if(id.startsWith('ax-')){i=Number(id.slice(3))-1;const mobile=innerWidth<=720,row=Math.floor(i/(mobile?2:6)),col=i%(mobile?2:6),rowCount=mobile?2:(row===2?5:6),startX=mobile?27:(row===0?18:row===1?21:26),stepX=mobile?46:(row===0?12.8:12),gridX=startX+col*stepX,gridY=mobile?51+row*5.4:60+row*11;return [hidden,hidden,{x:gridX,y:gridY,o:1,z:mobile?.82:.9},hidden,hidden][s];}
    if((i=ecos.indexOf(id))>=0){const pos=[[29,50],[50,50],[71,50],[50,73]][i];return [hidden,hidden,hidden,{x:pos[0],y:pos[1],o:i<3?1:0,z:i<3?1:.7},hidden][s];}
    if((i=rails.indexOf(id))>=0)return [hidden,hidden,hidden,hidden,{x:17+i*22,y:[76,72,76,71][i],o:1,z:.88}][s];
    return hidden;
  }
  let raf=0;
  function draw(){
    raf=0;const rect=root.getBoundingClientRect(),range=Math.max(1,root.offsetHeight-innerHeight),rawOverall=clamp(-rect.top/range)*4,rawIndex=Math.min(3,Math.floor(rawOverall)),rawT=rawOverall-rawIndex,transitionStart=rawIndex===3?.38:.68,transitionSpan=rawIndex===3?.2:.2,transitionT=clamp((rawT-transitionStart)/transitionSpan),transitionEase=transitionT*transitionT*(3-2*transitionT),overall=rawOverall>=4?4:rawIndex+transitionEase,index=Math.min(4,Math.floor(overall)),t=index===4?0:overall-index,ease=t*t*(3-2*t),axPhase=clamp((rawOverall-1.78)/.72);
    headings.forEach((heading,i)=>{const distance=Math.abs(i-overall);heading.style.opacity=String(clamp(1-distance*2.8));heading.style.transform=`translate(-50%,${(i-overall)*18}px)`;});nav.forEach(button=>button.classList.toggle('active',Math.abs(Number(button.dataset.orgGo)-overall)<.65));
    nodes.forEach(node=>{const id=node.dataset.node,a=state(id,index),b=state(id,Math.min(4,index+1)),x=mix(a.x,b.x,ease),y=mix(a.y,b.y,ease);let o=mix(a.o,b.o,ease),z=mix(a.z,b.z,ease);if(axes.includes(id))o*=clamp(overall/.48);if(units.includes(id))o*=clamp((overall-.72)/.22);if(id.startsWith('ax-')){const order=Number(id.slice(3))-1;o*=clamp((axPhase-order*.035)/.18);}node.style.left=`${x}%`;node.style.top=`${y}%`;node.style.opacity=String(o);node.style.transform=`translate(-50%,-50%) scale(${z})`;node.style.pointerEvents=o>.35?'auto':'none';});
    const stageRect=stage.getBoundingClientRect();paths.forEach(path=>{const from=root.querySelector(`[data-node="${path.dataset.from}"]`),to=root.querySelector(`[data-node="${path.dataset.to}"]`),fr=from.getBoundingClientRect(),tr=to.getBoundingClientRect(),x1=fr.left+fr.width/2-stageRect.left,y1=fr.top+fr.height/2-stageRect.top,x2=tr.left+tr.width/2-stageRect.left,y2=tr.top+tr.height/2-stageRect.top,curve=Math.abs(x2-x1)*.14;path.setAttribute('d',`M ${x1} ${y1} C ${x1} ${y1+curve}, ${x2} ${y2-curve}, ${x2} ${y2}`);const visible=Math.min(Number(from.style.opacity),Number(to.style.opacity));path.style.opacity=path.dataset.kind==='rail'?'0':String(visible*.68);path.style.strokeDashoffset=String(1-visible);});
    const railPhase=clamp((rawOverall-3.62)/.38),railNodes=rails.map(id=>root.querySelector(`[data-node="${id}"]`)),points=railNodes.map(node=>{const r=node.getBoundingClientRect();return{x:r.left+r.width/2-stageRect.left,y:r.top+r.height/2-stageRect.top};});
    const railD=`M ${points[0].x} ${points[0].y} C ${mix(points[0].x,points[1].x,.45)} ${points[0].y-30}, ${mix(points[0].x,points[1].x,.55)} ${points[1].y+18}, ${points[1].x} ${points[1].y} S ${mix(points[2].x,points[3].x,.2)} ${points[2].y+24}, ${points[2].x} ${points[2].y} S ${points[3].x-60} ${points[3].y-20}, ${points[3].x} ${points[3].y}`;
    railTrack.setAttribute('d',railD);railProgress.setAttribute('d',railD);railTrack.style.opacity=String(clamp((rawOverall-3.57)/.08));railProgress.style.opacity=railTrack.style.opacity;const length=railProgress.getTotalLength()||1;railProgress.style.strokeDasharray=String(length);railProgress.style.strokeDashoffset=String(length*(1-railPhase));const point=railProgress.getPointAtLength(length*railPhase);railPoint.setAttribute('cx',point.x);railPoint.setAttribute('cy',point.y);railPoint.style.opacity=String(clamp((rawOverall-3.62)/.06));
    const activeStep=Math.min(3,Math.floor(railPhase*3.999)),finalized=railPhase>.94;railNodes.forEach((node,i)=>{node.classList.toggle('is-active',railPhase>.02&&i===activeStep);node.classList.toggle('is-passed',railPhase>i/3+.08);node.classList.toggle('is-complete',finalized);node.style.setProperty('--rail-active',i===activeStep?'1':'0');});supports.forEach((support,i)=>support.classList.toggle('is-active',activeStep===[0,2,3][i]&&railPhase>.02&&!finalized));stage.classList.toggle('ax-convergence-active',Math.abs(overall-2)<.02);stage.classList.toggle('ecosystem-active',Math.abs(overall-3)<.02);stage.classList.toggle('growth-finalized',finalized);growthFinal.classList.toggle('visible',finalized);growthNext.classList.toggle('visible',railPhase>.97);const visibleSub=Math.min(4,Math.round(overall));if(sections[1].subs[visibleSub])subnavButton.textContent=sections[1].subs[visibleSub];
  }
  const schedule=()=>{if(!raf)raf=requestAnimationFrame(draw);};
  const pointer=event=>nodes.forEach(node=>{const r=node.getBoundingClientRect(),near=clamp(1-Math.hypot(event.clientX-(r.left+r.width/2),event.clientY-(r.top+r.height/2))/150);node.style.setProperty('--near',near.toFixed(2));});
  const leave=()=>nodes.forEach(node=>node.style.setProperty('--near','0'));
  let selectedAx='';
  const applyAxFocus=id=>{stage.dataset.axFocus=id||'';const focused=id?root.querySelector(`[data-node="${id}"]`):null,focusRect=focused?.getBoundingClientRect(),cx=focusRect?focusRect.left+focusRect.width/2:0,cy=focusRect?focusRect.top+focusRect.height/2:0;nodes.forEach(node=>{const active=node.dataset.node===id;node.classList.toggle('is-ax-focused',active);if(node.dataset.node.startsWith('ax-')&&!active&&focused){const r=node.getBoundingClientRect(),dx=r.left+r.width/2-cx,dy=r.top+r.height/2-cy,dist=Math.hypot(dx,dy)||1,force=Math.max(0,1-dist/270);node.style.translate=`${dx/dist*18*force}px ${dy/dist*13*force}px`;}else node.style.translate='0 0';});paths.forEach(path=>path.classList.toggle('is-ax-focused',path.dataset.to===id));};
  const onAxPointer=event=>{const node=event.target.closest('.org-node[data-node^="ax-"]');if(node)applyAxFocus(node.dataset.node);};
  const onAxOut=event=>{if(event.target.closest('.org-node[data-node^="ax-"]'))applyAxFocus(selectedAx);};
  const onAxClick=event=>{const node=event.target.closest('.org-node[data-node^="ax-"]');if(!node)return;selectedAx=selectedAx===node.dataset.node?'':node.dataset.node;applyAxFocus(selectedAx);};
  const onEscape=event=>{if(event.key==='Escape'){selectedAx='';applyAxFocus('');}};
  rails.forEach((id,i)=>{const node=root.querySelector(`[data-node="${id}"]`);const supportIndex=i===0?0:i===2?1:i===3?2:-1;const preview=()=>{if(supportIndex>=0)supports.forEach((support,j)=>support.classList.toggle('is-preview',j===supportIndex));};const restore=()=>supports.forEach(support=>support.classList.remove('is-preview'));node.addEventListener('pointerenter',preview);node.addEventListener('pointerleave',restore);node.addEventListener('click',()=>{preview();setTimeout(restore,1800);});});
  nav.forEach(button=>button.addEventListener('click',()=>steps[Number(button.dataset.orgGo)].scrollIntoView({behavior:'smooth'})));addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});addEventListener('keydown',onEscape);stage.addEventListener('pointermove',pointer,{passive:true});stage.addEventListener('pointerover',onAxPointer);stage.addEventListener('pointerout',onAxOut);stage.addEventListener('click',onAxClick);stage.addEventListener('pointerleave',leave);draw();
  orgExperienceCleanup=()=>{if(raf)cancelAnimationFrame(raf);removeEventListener('scroll',schedule);removeEventListener('resize',schedule);removeEventListener('keydown',onEscape);stage.removeEventListener('pointermove',pointer);stage.removeEventListener('pointerover',onAxPointer);stage.removeEventListener('pointerout',onAxOut);stage.removeEventListener('click',onAxClick);stage.removeEventListener('pointerleave',leave);orgExperienceCleanup=()=>{};};
}
document.addEventListener('click',e=>{ const go=e.target.closest('[data-go]'); if(go) showDetail(Number(go.dataset.go)); });
document.addEventListener('keydown',e=>{ const go=e.target.closest('.index-item[data-go]'); if(go&&(e.key==='Enter'||e.key===' ')){e.preventDefault();showDetail(Number(go.dataset.go));} });
categoryButton.addEventListener('click',()=>showIndex(true));
subnavButton.addEventListener('click',()=>{ if(matchMedia('(hover:hover)').matches&&!subnavMenu.hidden) return; const open=subnavMenu.hidden; subnavMenu.hidden=!open; subnavButton.setAttribute('aria-expanded',String(open)); });
subnavWrap.addEventListener('mouseenter',()=>{if(matchMedia('(hover:hover)').matches){subnavMenu.hidden=false;subnavButton.setAttribute('aria-expanded','true');}});
subnavWrap.addEventListener('mouseleave',()=>{if(matchMedia('(hover:hover)').matches){subnavMenu.hidden=true;subnavButton.setAttribute('aria-expanded','false');}});
subnavMenu.addEventListener('click',e=>{ const sub=e.target.closest('[data-sub]'); if(sub){ showDetail(currentCategory,Number(sub.dataset.sub)); subnavMenu.hidden=true; } });
document.querySelectorAll('[data-home]').forEach(el=>el.addEventListener('click',e=>{ e.preventDefault(); detail.hidden?window.scrollTo({top:0,behavior:'smooth'}):showIndex(); }));
menuButton.addEventListener('click',()=>{ const open=globalMenu.classList.toggle('open'); menuButton.setAttribute('aria-expanded',String(open)); });
searchForm.addEventListener('submit',event=>{
  event.preventDefault();
  const query=searchInput.value.trim().toLocaleLowerCase('ko-KR');
  if(!query){searchInput.focus();return;}
  let match=null;
  sections.some((section,categoryIndex)=>{
    const subIndex=section.subs.findIndex(sub=>sub.toLocaleLowerCase('ko-KR').includes(query));
    if(section.title.toLocaleLowerCase('ko-KR').includes(query)||section.summary.toLocaleLowerCase('ko-KR').includes(query)||subIndex>=0){
      match={categoryIndex,subIndex:Math.max(0,subIndex)};
      return true;
    }
    return false;
  });
  if(match){
    searchStatus.textContent='';
    searchInput.removeAttribute('aria-invalid');
    showDetail(match.categoryIndex,match.subIndex,true);
  }else{
    searchStatus.textContent=`“${searchInput.value.trim()}” 검색 결과가 없습니다.`;
    searchInput.setAttribute('aria-invalid','true');
  }
});

const video=document.querySelector('#scrub-video');
const poster=document.querySelector('#scrub-poster');
const dim=document.querySelector('.video-dim');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const mobileVideo=matchMedia('(max-width: 720px), (pointer: coarse)');
const SCRUB_DURATION=8;
const SCRUB_HOLD=7;            // 인트로가 멈추는 지점(네트워크 메시 프레임)
const INTRO_RATE=1;            // 자연 속도(1.0x) 재생
const INDEX_REVEAL_AT=5.2;     // 이 시점(영상 초)부터 인덱스 페이드인
const INTRO_DEADLINE_MS=3500;  // 영상이 안 뜨면 이 시점에 인덱스 노출
let scrubRaf=0;
let targetTime=0;
let seekPending=false;
let videoReady=false;
let loadedMobile=null;
let objectUrl='';
let introDone=false;
let indexShown=false;
let introRaf=0;
let introDeadline=0;

function scrubProgress(){
  const rect=intro.getBoundingClientRect();
  const range=Math.max(1,intro.offsetHeight-innerHeight);
  return Math.max(0,Math.min(1,-rect.top/range));
}

function videoDuration(){
  return Number.isFinite(video.duration)?Math.max(0,video.duration-.01):SCRUB_DURATION;
}

function updateHeroLayers(){
  const reveal=indexShown?1:0;
  dim.style.opacity=indexShown?'.25':'0';
  index.style.opacity=String(reveal);
  index.style.transform=`translateY(${(1-reveal)*28}px)`;
  index.classList.toggle('ready',indexShown);
}

function showIndexOverlay(){
  if(indexShown)return;
  indexShown=true;
  updateHeroLayers();
}

function scrubTime(){
  const duration=videoDuration(),from=Math.min(SCRUB_HOLD,duration);
  return from+scrubProgress()*Math.max(0,duration-from);
}

function commitLatestSeek(){
  if(!videoReady||!introDone)return;
  targetTime=scrubTime();
  if(video.seeking){seekPending=true;return;}
  if(Math.abs(video.currentTime-targetTime)>.012)video.currentTime=targetTime;
}

function flushScrub(){
  scrubRaf=0;
  if(intro.hidden)return;
  updateHeroLayers();
  commitLatestSeek();
}

function scheduleScrub(){if(!scrubRaf)scrubRaf=requestAnimationFrame(flushScrub);}

function endIntro(){
  if(introDone)return;
  introDone=true;
  if(introRaf){cancelAnimationFrame(introRaf);introRaf=0;}
  if(introDeadline){clearTimeout(introDeadline);introDeadline=0;}
  try{video.pause();}catch(err){}
  if(videoReady){
    const to=Math.min(SCRUB_HOLD,videoDuration());
    if(Math.abs(video.currentTime-to)>.05)video.currentTime=to;
  }
  showIndexOverlay();
  scheduleScrub();
}

function watchIntro(){
  introRaf=0;
  if(introDone)return;
  const to=Math.min(SCRUB_HOLD,videoDuration());
  if(video.currentTime>=Math.min(INDEX_REVEAL_AT,to-.3))showIndexOverlay();
  if(video.ended||video.currentTime>=to-.03){endIntro();return;}
  introRaf=requestAnimationFrame(watchIntro);
}

function startIntro(){
  if(introDone||introRaf)return;
  if(reducedMotion.matches){endIntro();return;}
  // rAF로 currentTime을 밀어넣으면 seek이 연속돼 끊긴다. 네이티브 재생을 쓴다.
  try{video.currentTime=0;}catch(err){}
  video.playbackRate=INTRO_RATE;
  const played=video.play();
  if(played&&played.catch)played.catch(()=>endIntro());  // 자동재생 차단 시 즉시 종료
  introRaf=requestAnimationFrame(watchIntro);
}

function revealVideo(){
  video.classList.add('is-ready');
  poster.classList.add('is-hidden');
}

function applyVideoSource(url,isBlob){
  if(objectUrl&&objectUrl!==url){URL.revokeObjectURL(objectUrl);objectUrl='';}
  if(isBlob)objectUrl=url;
  video.src=url;
  video.load();
}

async function loadScrubVideo(){
  const VIDEO_SRC='./assets/higgsfield-pnu-particles.mp4';
  const POSTER_SRC='./assets/higgsfield-pnu-poster.webp';
  if(reducedMotion.matches){
    if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl='';}
    video.removeAttribute('src');
    video.load();
    loadedMobile=null;
    videoReady=false;
    video.classList.remove('is-ready');
    poster.classList.remove('is-hidden');
    return;
  }
  const useMobile=mobileVideo.matches;
  if(loadedMobile===useMobile&&video.getAttribute('src'))return;
  videoReady=false;
  video.classList.remove('is-ready');
  poster.classList.remove('is-hidden');
  video.poster=POSTER_SRC;
  video.preload='auto';
  loadedMobile=useMobile;
  // 호스트가 Range 요청을 지원하지 않으면(예: Cloudflare Pages) 브라우저가
  // 영상을 seek 불가로 처리해 스크럽이 전혀 동작하지 않는다.
  // blob URL은 항상 seek 가능하므로 blob을 우선 사용하고, 실패 시 직접 src로 대체한다.
  try{
    const response=await fetch(VIDEO_SRC);
    if(!response.ok)throw new Error('HTTP '+response.status);
    applyVideoSource(URL.createObjectURL(await response.blob()),true);
  }catch(error){
    console.warn('blob 로드 실패, 직접 src로 대체:',error);
    applyVideoSource(VIDEO_SRC,false);
  }
}

video.addEventListener('loadeddata',()=>{
  videoReady=true;
  revealVideo();
  if(introDone){
    targetTime=scrubTime();
    if(Math.abs(video.currentTime-targetTime)>.012)video.currentTime=targetTime;
  }else startIntro();
});
video.addEventListener('seeked',()=>{
  if(!video.classList.contains('is-ready'))revealVideo();
  if(introDone&&(seekPending||Math.abs(video.currentTime-targetTime)>.012)){
    seekPending=false;
    commitLatestSeek();
  }
});
video.addEventListener('error',()=>{videoReady=false;poster.classList.remove('is-hidden');});
function onScrubScroll(){ if(!introDone&&scrollY>4) endIntro(); scheduleScrub(); }
addEventListener('scroll',onScrubScroll,{passive:true});
addEventListener('resize',scheduleScrub,{passive:true});
mobileVideo.addEventListener('change',loadScrubVideo);
reducedMotion.addEventListener('change',loadScrubVideo);
function cleanupScrub(){
  if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl='';}
  if(scrubRaf)cancelAnimationFrame(scrubRaf);
  if(introRaf)cancelAnimationFrame(introRaf);
  if(introDeadline)clearTimeout(introDeadline);
  removeEventListener('scroll',onScrubScroll);
  removeEventListener('resize',scheduleScrub);
  mobileVideo.removeEventListener('change',loadScrubVideo);
  reducedMotion.removeEventListener('change',loadScrubVideo);
}
addEventListener('pagehide',event=>{ if(!event.persisted) cleanupScrub(); });
loadScrubVideo();
scheduleScrub();
introDeadline=setTimeout(()=>{ if(!videoReady) endIntro(); },INTRO_DEADLINE_MS);

let lastScrollY=window.scrollY;
function toggleNavigationOnScroll(){
  const current=window.scrollY;
  const delta=current-lastScrollY;
  if(current<40) document.body.classList.remove('nav-hidden');
  else if(delta>7) document.body.classList.add('nav-hidden');
  else if(delta<-4) document.body.classList.remove('nav-hidden');
  lastScrollY=current;
}
addEventListener('scroll',toggleNavigationOnScroll,{passive:true});

function parseDetailHash(){
  const hash=location.hash.match(/^#detail-(\d+)-(\d+)$/);
  if(!hash) return null;
  const categoryIndex=Number(hash[1])-1,subIndex=Number(hash[2])-1;
  const section=sections[categoryIndex];
  if(!section||subIndex<0||subIndex>=section.subs.length) return null;
  return {categoryIndex,subIndex};
}
function renderFromLocation(){
  const target=parseDetailHash();
  if(target) showDetail(target.categoryIndex,target.subIndex,false);
  else showIndex(false);
}
addEventListener('popstate',renderFromLocation);
const initialTarget=parseDetailHash();
if(initialTarget) showDetail(initialTarget.categoryIndex,initialTarget.subIndex,false);
else history.replaceState({view:'index'},'',location.hash||'#index');
