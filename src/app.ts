import {validate,hasErrors,filterItems,formatDate,createCandle,VIEWS,type Candle,type CandleInput,type BurnStatus,type View} from "./domain.js";
import {load,save} from "./storage.js";
let items:Candle[]=[],currentView:View="shelf",searchQuery="",statusFilter="",editingId:string|null=null,currentRating:number|null=null,armedId:string|null=null,armedTimer:ReturnType<typeof setTimeout>|null=null;
const $=(id:string)=>document.getElementById(id)!;
function announce(m:string){const e=$("announce");e.textContent="";requestAnimationFrame(()=>{e.textContent=m;});}
function reportFailure(msg:string){const b=$("storage-banner");b.hidden=false;requestAnimationFrame(()=>{b.textContent=msg;});announce("Error: "+msg);}
function clearBanner(){const b=$("storage-banner");b.hidden=true;b.textContent="";}
function mk(t:string,c?:string,x?:string):HTMLElement{const e=document.createElement(t);if(c)e.className=c;if(x!==undefined)e.textContent=x;return e;}
function btn(c:string,x:string,action:string,id:string,label:string):HTMLButtonElement{const b=mk("button","btn "+c) as HTMLButtonElement;b.type="button";b.textContent=x;b.setAttribute("aria-label",label);b.dataset.action=action;b.dataset.id=id;return b;}
function statusLabel(s:BurnStatus){return s==="unlit"?"🕯 Unlit":s==="burning"?"🔥 Burning":"✦ Finished";}
function stars(r:number|null){const n=r??0;return "★".repeat(n)+"☆".repeat(5-n);}
function field(lbl:string,val:string,aria:string):HTMLElement{const p=mk("p","card-field");p.setAttribute("aria-label",aria);p.appendChild(mk("span","card-field-label",lbl));p.appendChild(mk("span","card-field-value",val));return p;}
function createCard(c:Candle):HTMLElement{
  const armed=armedId===c.id,card=mk("article","candle-card status-"+c.burnStatus+(c.burnStatus==="finished"?" finished":""));
  card.dataset.id=c.id;
  card.appendChild(mk("span","status-badge status-badge--"+c.burnStatus,statusLabel(c.burnStatus)));
  card.appendChild(mk("h3","card-name",c.name));
  card.appendChild(mk("p","card-brand",c.brand));
  card.appendChild(field("Scent: ",c.scentNotes,"Scent notes: "+c.scentNotes));
  card.appendChild(field("Vessel: ",c.vesselStyle||"—","Vessel: "+(c.vesselStyle||"—")));
  const s=mk("p","card-rating",stars(c.rating));s.setAttribute("aria-label",c.rating?"Rating: "+c.rating+" of 5":"Unrated");
  card.appendChild(s);
  card.appendChild(mk("p","card-date","Added "+formatDate(c.createdAt)));
  const acts=mk("div","card-actions");
  if(c.view==="wishlist")acts.appendChild(btn("btn-move","Move to Shelf","move",c.id,`Move "${c.name}" to shelf`));
  acts.appendChild(btn("btn-edit","Edit","edit",c.id,`Edit "${c.name}"`));
  const delTxt=armed?"Confirm delete":"Delete";
  acts.appendChild(btn("btn-delete"+(armed?" armed":""),delTxt,"delete",c.id,`${delTxt} "${c.name}"`));
  card.appendChild(acts);
  return card;
}
function updateStats(){
  let o=0,b=0,w=0;
  for(const c of items){if(c.view==="shelf")o++;if(c.burnStatus==="finished")b++;if(c.view==="wishlist")w++;}
  $("stat-owned").textContent=String(o);$("stat-burned").textContent=String(b);$("stat-wishlist").textContent=String(w);
}
function render(){
  const grid=$("candle-grid"),ec=$("empty-collection"),ef=$("empty-filter");
  grid.innerHTML="";ec.hidden=true;ef.hidden=true;updateStats();
  const viewItems=items.filter(c=>c.view===currentView),filtered=filterItems(viewItems,searchQuery,statusFilter);
  if(viewItems.length===0){ec.hidden=false;$("empty-collection-body").textContent=currentView==="shelf"?"Add your first candle to start building your collection.":"Add candles to your wish list to track what you want to buy.";return;}
  if(filtered.length===0){ef.hidden=false;const p:string[]=[];if(searchQuery)p.push(`"${searchQuery}"`);if(statusFilter)p.push(`status "${statusFilter}"`);const d=p.join(" and ");$("empty-filter-body").textContent="No candles match "+d+".";announce("No candles found for "+d+".");return;}
  filtered.forEach(c=>grid.appendChild(createCard(c)));
}
const FMAP:Record<string,string>={name:"name",brand:"brand",scentNotes:"scent",vesselStyle:"vessel",burnStatus:"status"};
function clearErrors(){["name","brand","scent","vessel","status"].forEach(f=>{const e=$("err-"+f);e.hidden=true;e.textContent="";const iid=f==="scent"?"field-scent":f==="status"?"field-status":"field-"+f;document.getElementById(iid)?.removeAttribute("aria-invalid");});}
function showErr(f:string,m:string){const k=FMAP[f]||f,e=$("err-"+k);if(e){e.hidden=false;e.textContent=m;}document.getElementById("field-"+k)?.setAttribute("aria-invalid","true");}
const $val=(id:string)=>(document.getElementById(id) as HTMLInputElement|HTMLSelectElement).value;
const setVal=(id:string,v:string)=>{(document.getElementById(id) as HTMLInputElement|HTMLSelectElement).value=v;};
function getInput():CandleInput{return{name:$val("field-name"),brand:$val("field-brand"),scentNotes:$val("field-scent"),vesselStyle:$val("field-vessel"),burnStatus:$val("field-status"),view:$val("field-view"),rating:currentRating};}
function setStars(r:number|null){document.querySelectorAll<HTMLButtonElement>(".star-btn").forEach((b,i)=>{const a=r!==null&&i<r;b.classList.toggle("active",a);b.setAttribute("aria-pressed",String(a));});($("field-rating") as HTMLInputElement).value=r!==null?String(r):"";}
function resetForm(){($("candle-form") as HTMLFormElement).reset();currentRating=null;editingId=null;setStars(null);clearErrors();$("btn-cancel-edit").hidden=true;$("btn-add").textContent="Add Candle";}
function fillEdit(c:Candle){setVal("field-name",c.name);setVal("field-brand",c.brand);setVal("field-scent",c.scentNotes);setVal("field-vessel",c.vesselStyle);setVal("field-status",c.burnStatus);setVal("field-view",c.view);currentRating=c.rating;setStars(c.rating);editingId=c.id;$("btn-cancel-edit").hidden=false;$("btn-add").textContent="Save Changes";$("field-name").focus();}
function armDelete(id:string){if(armedTimer)clearTimeout(armedTimer);armedId=id;render();armedTimer=setTimeout(()=>{armedId=null;armedTimer=null;render();},3000);}
function disarm(){if(armedTimer){clearTimeout(armedTimer);armedTimer=null;}armedId=null;render();}
function handleSubmit(e:Event){
  e.preventDefault();clearErrors();clearBanner();
  const input=getInput(),errors=validate(input);
  if(hasErrors(errors)){let first:string|null=null;Object.entries(errors).forEach(([f,m])=>{if(m){showErr(f,m);if(!first)first=FMAP[f]||f;}});announce("Form errors: "+Object.values(errors).filter(Boolean).join(" "));if(first)document.getElementById("field-"+first)?.focus();return;}
  if(editingId){const idx=items.findIndex(c=>c.id===editingId);if(idx===-1){reportFailure("Could not find candle to edit.");return;}const up=createCandle(input,editingId,items[idx].createdAt),next=items.map((c,i)=>i===idx?up:c),r=save(next);if(!r.ok){reportFailure(r.message);return;}items=next;announce(`"${up.name}" updated.`);resetForm();}
  else{const id=Date.now()+"-"+Math.random().toString(36).slice(2,7),nc=createCandle(input,id,new Date().toISOString()),next=[...items,nc],r=save(next);if(!r.ok){reportFailure(r.message);return;}items=next;announce(`"${nc.name}" added to ${nc.view==="shelf"?"your shelf":"your wish list"}.`);resetForm();}
  render();
}
function handleGrid(e:Event){
  const b=(e.target as HTMLElement).closest("[data-action]") as HTMLElement|null;if(!b)return;
  const{action,id}=b.dataset;if(!id)return;clearBanner();
  if(action==="delete"){if(armedId===id){disarm();const c=items.find(c=>c.id===id),next=items.filter(c=>c.id!==id),r=save(next);if(!r.ok){reportFailure(r.message);render();return;}items=next;announce(`"${c?.name??"Candle"}" deleted.`);if(editingId===id)resetForm();render();}else{disarm();armDelete(id);}}
  else if(action==="edit"){const c=items.find(c=>c.id===id);if(c){disarm();fillEdit(c);}}
  else if(action==="move"){const i=items.findIndex(c=>c.id===id);if(i===-1)return;const mv={...items[i],view:"shelf" as View},next=items.map((c,j)=>j===i?mv:c),r=save(next);if(!r.ok){reportFailure(r.message);return;}items=next;announce(`"${mv.name}" moved to your shelf.`);render();}
}
function init(){
  const result=load();
  switch(result.status){case "ok":items=result.items;break;case "empty":items=[];break;case "partial":items=result.items;reportFailure(result.message);break;case "error":items=[];reportFailure(result.message);break;}
  render();
  $("candle-form").addEventListener("submit",handleSubmit);
  $("candle-grid").addEventListener("click",handleGrid);
  $("rating-input-group").addEventListener("click",e=>{const b=(e.target as HTMLElement).closest(".star-btn") as HTMLButtonElement|null;if(!b)return;const v=Number(b.dataset.value);currentRating=currentRating===v?null:v;setStars(currentRating);});
  document.querySelector(".view-toggle")!.addEventListener("click",e=>{const b=(e.target as HTMLElement).closest("[data-view]") as HTMLElement|null;if(!b)return;const v=b.dataset.view as View;if(!VIEWS.includes(v))return;currentView=v;disarm();document.querySelectorAll<HTMLButtonElement>(".toggle-btn").forEach(x=>{const a=x.dataset.view===v;x.classList.toggle("active",a);x.setAttribute("aria-pressed",String(a));});render();});
  $("search-input").addEventListener("input",e=>{searchQuery=(e.target as HTMLInputElement).value;disarm();render();});
  $("filter-status").addEventListener("change",e=>{statusFilter=(e.target as HTMLSelectElement).value;disarm();render();});
  $("btn-clear-filters").addEventListener("click",()=>{($("search-input") as HTMLInputElement).value="";($("filter-status") as HTMLSelectElement).value="";searchQuery="";statusFilter="";render();});
  $("btn-cancel-edit").addEventListener("click",resetForm);
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&armedId)disarm();});
  document.addEventListener("click",e=>{if(armedId&&!(e.target as HTMLElement).closest("[data-action='delete']"))disarm();});
}
init();
