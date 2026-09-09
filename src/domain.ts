export const BURN_STATUSES=["unlit","burning","finished"] as const;
export type BurnStatus=(typeof BURN_STATUSES)[number];
export const VIEWS=["shelf","wishlist"] as const;
export type View=(typeof VIEWS)[number];
export interface Candle{id:string;name:string;brand:string;scentNotes:string;vesselStyle:string;burnStatus:BurnStatus;rating:number|null;view:View;createdAt:string;}
export interface CandleInput{name:string;brand:string;scentNotes:string;vesselStyle:string;burnStatus:string;rating:string|number|null;view:string;}
export interface ValidationErrors{name?:string;brand?:string;scentNotes?:string;vesselStyle?:string;burnStatus?:string;view?:string;}
export const NAME_MAX=80,BRAND_MAX=60,SCENT_MAX=120,VESSEL_MAX=80;
export function validate(input:CandleInput):ValidationErrors{
  const errors:ValidationErrors={};
  const name=(input.name??"").trim();
  if(!name)errors.name="Name is required.";
  else if(name.length>NAME_MAX)errors.name=`Name must be ${NAME_MAX} characters or fewer.`;
  const brand=(input.brand??"").trim();
  if(!brand)errors.brand="Brand is required.";
  else if(brand.length>BRAND_MAX)errors.brand=`Brand must be ${BRAND_MAX} characters or fewer.`;
  const scent=(input.scentNotes??"").trim();
  if(!scent)errors.scentNotes="Scent notes are required.";
  else if(scent.length>SCENT_MAX)errors.scentNotes=`Scent notes must be ${SCENT_MAX} characters or fewer.`;
  const vessel=(input.vesselStyle??"").trim();
  if(vessel.length>VESSEL_MAX)errors.vesselStyle=`Vessel style must be ${VESSEL_MAX} characters or fewer.`;
  if(!BURN_STATUSES.includes(input.burnStatus as BurnStatus))errors.burnStatus="Invalid burn status.";
  if(!VIEWS.includes(input.view as View))errors.view="Invalid view.";
  return errors;
}
export function hasErrors(e:ValidationErrors):boolean{return Object.keys(e).length>0;}
export function filterItems(items:Candle[],query:string,statusFilter:string):Candle[]{
  const q=query.trim().toLowerCase();
  return items.filter(c=>{
    if(statusFilter&&c.burnStatus!==statusFilter)return false;
    if(!q)return true;
    return c.name.toLowerCase().includes(q)||c.brand.toLowerCase().includes(q)||c.scentNotes.toLowerCase().includes(q)||c.vesselStyle.toLowerCase().includes(q);
  });
}
export function formatDate(iso:string):string{
  if(!iso)return "";
  const d=new Date(iso);
  if(isNaN(d.getTime()))return "";
  return String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0")+"/"+d.getFullYear();
}
function parseRating(raw:string|number|null|undefined):number|null{
  if(raw===null||raw===undefined||raw==="")return null;
  const n=typeof raw==="number"?raw:Number(raw);
  if(!isFinite(n)||n<1||n>5)return null;
  return Math.round(n);
}
export function createCandle(input:CandleInput,id:string,now:string):Candle{
  return{id,name:(input.name??"").trim(),brand:(input.brand??"").trim(),scentNotes:(input.scentNotes??"").trim(),vesselStyle:(input.vesselStyle??"").trim(),burnStatus:input.burnStatus as BurnStatus,rating:parseRating(input.rating),view:input.view as View,createdAt:now};
}
export function normalize(raw:unknown):Candle|null{
  if(!raw||typeof raw!=="object"||Array.isArray(raw))return null;
  const r=raw as Record<string,unknown>;
  const input:CandleInput={name:typeof r.name==="string"?r.name:"",brand:typeof r.brand==="string"?r.brand:"",scentNotes:typeof r.scentNotes==="string"?r.scentNotes:"",vesselStyle:typeof r.vesselStyle==="string"?r.vesselStyle:"",burnStatus:typeof r.burnStatus==="string"?r.burnStatus:"",rating:r.rating!==undefined?(r.rating as string|number|null):null,view:typeof r.view==="string"?r.view:""};
  if(hasErrors(validate(input)))return null;
  const id=typeof r.id==="string"&&r.id?r.id:null;
  if(!id)return null;
  return createCandle(input,id,typeof r.createdAt==="string"?r.createdAt:new Date(0).toISOString());
}
