import { ids, characters, type Expression } from '../characters/model';
import { characterSvg } from '../characters/svg';
import { levels, levelInfo, moment, dayPeriod, type Kind } from '../engine/levels';
import { generateSession, type Question } from '../engine/session';
import { sameOnDial, type Time } from '../engine/time';
import { formatDigital, say, type Locale } from '../engine/text';
import { answer, stars, recordBest, unlocked, recordKey, type Attempt } from '../engine/progress';
import { readSave, writeSave, browserStorage } from '../shell/storage';
import { clockSvg, wireClock } from './clock';
const root = document.querySelector<HTMLElement>('#app')!;
const storage = browserStorage();
const save=readSave(storage,navigator.language.startsWith('en') ? 'en' : 'fr');
let screen: 'home'|'exercise'|'result'='home',level=1,kind: Kind='read',session: Question[]=[],attempt: Attempt={score:0,index:0,missed:false},displayed: Time={h:0,m:0},serial=0;
let feedback='',expression: Expression='concentre';
const tr=(fr:string,en:string):string=>save.locale==='fr'?fr:en;
const persist=():void=>writeSave(storage,save);
const motion=(): 'full'|'reduce'=>matchMedia('(prefers-reduced-motion: reduce)').matches?'reduce':'full';
function guide(): string {return `<aside class="guide">${characterSvg(save.guide,expression,screen==='result'?'celebration':'repos',motion())}<p role="status" aria-live="polite">${feedback || tr('Prends ton temps, on cherche ensemble !','Take your time, let’s work together!')}</p></aside>`;}
function button(text:string,id:string):string{return `<button id="${id}">${text}</button>`;}
function period(t:Time):string {
 const p=dayPeriod(t),sun=p==='morning'||p==='afternoon';
 const label=save.locale==='fr'?{night:'nuit',morning:'matin',afternoon:'après-midi',evening:'soir'}[p]:p;
 return `<div class="period"><svg viewBox="0 0 50 50" role="img" aria-label="${label}">${sun?'<circle cx="25" cy="25" r="12" fill="#8c5400"/><path d="M25 2v7M25 41v7M2 25h7M41 25h7M8 8l5 5M37 37l5 5M8 42l5-5M37 13l5-5" stroke="#8c5400" stroke-width="3"/>':'<path d="M34 5A21 21 0 1 0 45 34A23 23 0 0 1 34 5" fill="#164e63"/>'}</svg>${label}</div>`;
}
function start(next=level):void {
 level=next;kind=level===8?'read':kind;serial++;session=generateSession(level,kind,serial*7919+level*101);attempt={score:0,index:0,missed:false};screen='exercise';feedback='';expression='concentre';resetClock();render();window.scrollTo(0,0);
}
function resetClock():void {const q=session[attempt.index];displayed=kind==='set'?{h:q?.target.h && q.target.h>=12?12:0,m:0}:q?.start??{h:0,m:0};}
function submit(correct:boolean):void {
 attempt=answer(attempt,correct);
 if(!correct){feedback=tr('On réessaie ensemble ! Regarde la petite aiguille pour les heures, la grande pour les minutes.','Let’s try together! The short hand shows hours, the long hand shows minutes.');expression='surprise';updateGuide();return;}
 expression='joie';feedback=tr('Bravo, tu as trouvé !','Well done, you found it!');
 if(attempt.index===session.length){save.records=recordBest(save.records,level,kind,attempt.score);persist();screen='result';render();return;}
 // A next button leaves the encouragement visible and gives the child control of the pace.
 const actions=root.querySelector('#actions');if(actions){actions.innerHTML=button(tr('Continuer','Continue'),'continue');root.querySelector('#continue')?.addEventListener('click',()=>{expression='concentre';feedback='';resetClock();render();});}
 updateGuide();
}
function updateGuide():void {const old=root.querySelector('.guide');if(old)old.outerHTML=guide();}
function render():void {
 document.documentElement.lang=save.locale;
 if(screen==='home'){
 root.innerHTML=`<header><h1>TicTac <span aria-hidden="true">◷</span></h1><p>${tr('À ton rythme, découvre l’heure !','Discover time at your own pace!')}</p></header><label class="language">${tr('Langue','Language')} <select id="locale"><option value="fr" ${save.locale==='fr'?'selected':''}>Français</option><option value="en" ${save.locale==='en'?'selected':''}>English</option></select></label><h2>${tr('Choisis ton guide','Choose your guide')}</h2><div class="cast">${ids.map(id=>`<button class="character" data-guide="${id}" aria-pressed="${save.guide===id}">${characterSvg(id)}<span>${characters[id][save.locale]}</span></button>`).join('')}</div><fieldset><legend>${tr('Comment jouer ?','How to play?')}</legend><button id="read" aria-pressed="${kind==='read'}">${tr('Lire','Read')}</button><button id="set" aria-pressed="${kind==='set'}">${tr('Régler','Set')}</button></fieldset><div class="levels">${levels.map((info,i)=>{const n=i+1,score=save.records[recordKey(n,n===8?'read':kind)]??0;return `<button data-level="${n}" ${unlocked(save.records,n)?'':'disabled'}><b>${n}. ${info[save.locale]}</b><span aria-label="${stars(score)} ${tr('étoiles','stars')}">${'★'.repeat(stars(score))}${'☆'.repeat(3-stars(score))} ${unlocked(save.records,n)?'':'🔒'}</span></button>`;}).join('')}</div><footer>${tr('Sans publicité. Tout reste sur cet appareil.','No ads. Everything stays on this device.')} · 0.1.0</footer>`;
 root.querySelector<HTMLSelectElement>('#locale')?.addEventListener('change',e=>{save.locale=(e.target as HTMLSelectElement).value as Locale;persist();render();});
 root.querySelectorAll<HTMLButtonElement>('[data-guide]').forEach(b=>b.addEventListener('click',()=>{save.guide=b.dataset.guide as typeof save.guide;persist();render();}));
 for(const k of ['read','set'] as const)root.querySelector(`#${k}`)?.addEventListener('click',()=>{kind=k;render();});
 root.querySelectorAll<HTMLButtonElement>('[data-level]').forEach(b=>b.addEventListener('click',()=>start(Number(b.dataset.level))));return;
 }
 if(screen==='result'){
 const s=stars(attempt.score);feedback=s?tr('Tu progresses ! Quelle belle découverte !','You’re learning! What a wonderful discovery!'):tr('On réessaie ensemble, à ton rythme.','Let’s try again together, at your own pace.');
 root.innerHTML=`${button(tr('Accueil','Home'),'back')}<h1>${tr('Série terminée !','Session complete!')}</h1><div class="stars" aria-label="${s} ${tr('étoiles','stars')}">${'★'.repeat(s)}${'☆'.repeat(3-s)}</div><p class="score">${attempt.score}/10</p>${guide()}${button(tr('Encore','Again'),'again')}${level<8&&unlocked(save.records,level+1)?button(tr('Niveau suivant','Next level'),'next'):''}`;
 root.querySelector('#again')?.addEventListener('click',()=>start());root.querySelector('#next')?.addEventListener('click',()=>start(level+1));
 }else{
 const q=session[attempt.index]!;const style=level===6||level===8?'24':'12';
 const instruction=levelInfo(level).instructions[save.locale][kind].replace('{n}',String(q.delta));
 root.innerHTML=`<nav>${button(tr('Retour','Back'),'back')}<span>${levelInfo(level)[save.locale]}</span></nav><h1 class="instruction">${instruction}</h1>${kind==='set'?`<p id="target">${say(level===7?q.start:q.target,save.locale,style)} · ${formatDigital(level===7?q.start:q.target,style)}</p>${level===7?`<p>${tr('Départ','Start')}: ${formatDigital(q.start)}</p>`:''}`:''}<div class="clock-wrap">${clockSvg(displayed,save.locale,kind==='set',level===1)}<output id="digital">${formatDigital(displayed,style)}</output>${level===6||level===7?period(level===7?q.start:q.target):''}</div><div class="dots" aria-label="${attempt.index+1}/10">${session.map((_,i)=>`<span class="${i<attempt.index?'done':i===attempt.index?'current':''}">${i+1}</span>`).join('')}</div>${guide()}<div id="actions" class="answers">${kind==='set'?button(tr('Valider','Check'),'check'):q.choices.map((t,i)=>`<button data-answer="${i}">${level===8?moment(t)[save.locale]:say(t,save.locale,style)}</button>`).join('')}</div>${'speechSynthesis' in window && speechSynthesis.getVoices().some(v=>v.localService && v.lang.startsWith(save.locale))?button(tr('Écouter','Listen'),'listen'):''}`;
 if(kind==='set')wireClock(root.querySelector<SVGSVGElement>('#clock')!,displayed,levelInfo(level).step,save.locale,t=>{displayed=t;const out=root.querySelector('#digital');if(out)out.textContent=formatDigital(t,style);});
 root.querySelector('#check')?.addEventListener('click',()=>submit(sameOnDial(displayed,q.target)));
 root.querySelectorAll<HTMLButtonElement>('[data-answer]').forEach(b=>b.addEventListener('click',()=>submit(Number(b.dataset.answer)===q.answer)));
 root.querySelector('#listen')?.addEventListener('click',()=>{const voice=new SpeechSynthesisUtterance(kind==='set'?say(q.target,save.locale,style):instruction);const local=speechSynthesis.getVoices().find(v=>v.localService && v.lang.startsWith(save.locale));if(!local)return;voice.voice=local;voice.lang=local.lang;speechSynthesis.speak(voice);});
 }
 root.querySelector('#back')?.addEventListener('click',()=>{screen='home';feedback='';render();});
}
const hook=Object.freeze({state:()=>{
 const rect=root.querySelector('#clock')?.getBoundingClientRect();
 return structuredClone({screen,level,kind,index:attempt.index,question:session[attempt.index]??null,displayed,score:attempt.score,dial:rect?{cx:rect.left+rect.width/2,cy:rect.top+rect.height/2,radius:rect.width*154/320,hourRadius:rect.width*83/320,minuteRadius:rect.width*126/320}:null});
}});
Object.defineProperty(window,'__tictac',{value:hook,writable:false,configurable:false});
render();
