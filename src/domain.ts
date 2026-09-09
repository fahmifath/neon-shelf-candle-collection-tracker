export const BURN_STATUSES=["unlit","burning","finished"] as const;
export type BurnStatus=(typeof BURN_STATUSES)[number];
export const VIEWS=["shelf","wishlist"] as const;
export type View=(typeof VIEWS)[number];
export interface Candle{id:string;name:string;brand:string;scentNotes:string;vesselStyle:string;burnStatus:BurnStatus;rating:number|null;view:View;createdAt:string;}
export interface CandleInput{name:string;brand:string;scentNotes:string;vesselStyle:string;burnStatus:string;rating:string|number|null;view:string;}
export interface ValidationErrors{name?:string;brand?:string;scentNotes?:string;vesselStyle?:string;burnStatus?:string;view?:string;}
export const NAME_MAX=80,BRAND_MAX=60,SCENT_MAX=120,VESSEL_MAX=80;
function chk(v:string|undefined,req:boolean,max:number,lbl:string):string|undefined{
  const s=(v??"").trim();
  if(!s&&req)return lbl+" is required.";
  return s.length>max?`${lbl} must be ${max} characters or fewer.`:undefined;
}
export function validate(input:CandleInput):ValidationErrors{
  const errors:ValidationErrors={};
  const n=chk(input.name,true,NAME_MAX,"Name");if(n)errors.name=n;
  const b=chk(input.brand,true,BRAND_MAX,"Brand");if(b)errors.brand=b;
  const s=chk(input.scentNotes,true,SCENT_MAX,"Scent notes");if(s)errors.scentNotes=s;
  const v=chk(input.vesselStyle,false,VESSEL_MAX,"Vessel style");if(v)errors.vesselStyle=v;
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
  const r=raw as Record<string,unknown>,str=(k:string)=>typeof r[k]==="string"?r[k] as string:"";
  const input:CandleInput={name:str("name"),brand:str("brand"),scentNotes:str("scentNotes"),vesselStyle:str("vesselStyle"),burnStatus:str("burnStatus"),rating:r.rating!==undefined?(r.rating as string|number|null):null,view:str("view")};
  if(hasErrors(validate(input))||typeof r.id!=="string"||!r.id)return null;
  return createCandle(input,r.id,typeof r.createdAt==="string"?r.createdAt:new Date(0).toISOString());
}
