import {describe,it,expect} from "vitest";
import {validate,hasErrors,filterItems,formatDate,createCandle,normalize,BURN_STATUSES,VIEWS,NAME_MAX,BRAND_MAX,SCENT_MAX,VESSEL_MAX,type Candle,type CandleInput} from "../src/domain";
const D:Candle={id:"1",name:"Fireside",brand:"Diptyque",scentNotes:"cedar, vanilla",vesselStyle:"amber glass",burnStatus:"unlit",rating:null,view:"shelf",createdAt:"2024-01-15T10:00:00.000Z"};
const inp=(o:Partial<CandleInput>={})=>({...D,...o});
const can=(o:Partial<Candle>={})=>({...D,...o});
describe("validate-req",()=>{
  it("valid",()=>expect(hasErrors(validate(inp()))).toBe(false));
  it("name-empty",()=>expect(validate(inp({name:""})).name).toBeTruthy());
  it("name-ws",()=>expect(validate(inp({name:"   "})).name).toBeTruthy());
  it("name-max",()=>expect(validate(inp({name:"a".repeat(NAME_MAX)})).name).toBeUndefined());
  it("name-max+1",()=>expect(validate(inp({name:"a".repeat(NAME_MAX+1)})).name).toBeTruthy());
  it("brand-empty",()=>expect(validate(inp({brand:""})).brand).toBeTruthy());
  it("brand-ws",()=>expect(validate(inp({brand:"  "})).brand).toBeTruthy());
  it("brand-max",()=>expect(validate(inp({brand:"b".repeat(BRAND_MAX)})).brand).toBeUndefined());
  it("brand-max+1",()=>expect(validate(inp({brand:"b".repeat(BRAND_MAX+1)})).brand).toBeTruthy());
  it("scent-empty",()=>expect(validate(inp({scentNotes:""})).scentNotes).toBeTruthy());
  it("scent-ws",()=>expect(validate(inp({scentNotes:"   "})).scentNotes).toBeTruthy());
  it("scent-max",()=>expect(validate(inp({scentNotes:"c".repeat(SCENT_MAX)})).scentNotes).toBeUndefined());
  it("scent-max+1",()=>expect(validate(inp({scentNotes:"c".repeat(SCENT_MAX+1)})).scentNotes).toBeTruthy());
  it("vessel-empty",()=>expect(validate(inp({vesselStyle:""})).vesselStyle).toBeUndefined());
  it("vessel-max",()=>expect(validate(inp({vesselStyle:"v".repeat(VESSEL_MAX)})).vesselStyle).toBeUndefined());
  it("vessel-max+1",()=>expect(validate(inp({vesselStyle:"v".repeat(VESSEL_MAX+1)})).vesselStyle).toBeTruthy());
});
describe("validate-enum",()=>{
  it("burnStatus-valid",()=>BURN_STATUSES.forEach(s=>expect(validate(inp({burnStatus:s})).burnStatus).toBeUndefined()));
  it("burnStatus-invalid",()=>expect(validate(inp({burnStatus:"smoldering"})).burnStatus).toBeTruthy());
  it("burnStatus-empty",()=>expect(validate(inp({burnStatus:""})).burnStatus).toBeTruthy());
  it("view-valid",()=>VIEWS.forEach(v=>expect(validate(inp({view:v})).view).toBeUndefined()));
  it("view-invalid",()=>expect(validate(inp({view:"collection"})).view).toBeTruthy());
});
describe("filterItems",()=>{
  const C:Candle[]=[
    can({id:"1"}),
    can({id:"2",name:"Ocean Breeze",brand:"Bath & Body",scentNotes:"sea salt, musk",burnStatus:"burning"}),
    can({id:"3",name:"Vanilla Dreams",brand:"Diptyque",scentNotes:"vanilla, sandalwood",burnStatus:"finished"}),
  ];
  it("all",()=>expect(filterItems(C,"","")).toHaveLength(3));
  it("name-ci",()=>{const r=filterItems(C,"fireside","");expect(r).toHaveLength(1);expect(r[0].id).toBe("1");});
  it("brand",()=>expect(filterItems(C,"diptyque","")).toHaveLength(2));
  it("scent",()=>{const r=filterItems(C,"sea salt","");expect(r).toHaveLength(1);expect(r[0].id).toBe("2");});
  it("status",()=>{const r=filterItems(C,"","burning");expect(r).toHaveLength(1);expect(r[0].id).toBe("2");});
  it("combo",()=>{const r=filterItems(C,"diptyque","finished");expect(r).toHaveLength(1);expect(r[0].id).toBe("3");});
  it("none",()=>expect(filterItems(C,"unicorn","")).toHaveLength(0));
  it("status-none",()=>expect(filterItems(C.filter(c=>c.burnStatus==="unlit"),"","burning")).toHaveLength(0));
  it("immut",()=>{const cp=[...C];filterItems(C,"fireside","unlit");expect(C).toEqual(cp);});
  it("ws-query",()=>expect(filterItems(C,"  vanilla  ","").length).toBeGreaterThan(0));
});
describe("formatDate",()=>{
  it("iso",()=>expect(formatDate("2024-01-05T10:00:00.000Z")).toBe("05/01/2024"));
  it("pad",()=>expect(formatDate("2024-03-07T00:00:00.000Z")).toMatch(/^0\d\/0\d\/\d{4}$/));
  it("empty",()=>expect(formatDate("")).toBe(""));
  it("invalid",()=>expect(formatDate("not-a-date")).toBe(""));
});
describe("createCandle",()=>{
  it("id-ts",()=>{const c=createCandle(inp(),"my-id","2024-06-01T00:00:00Z");expect(c.id).toBe("my-id");expect(c.createdAt).toBe("2024-06-01T00:00:00Z");});
  it("trim",()=>{const c=createCandle(inp({name:"  Bloom  ",brand:"  Nest  "}),"id","now");expect(c.name).toBe("Bloom");expect(c.brand).toBe("Nest");});
  it("rating-empty",()=>expect(createCandle(inp({rating:""}),"id","now").rating).toBeNull());
  it("rating-num",()=>expect(createCandle(inp({rating:4}),"id","now").rating).toBe(4));
  it("rating-oob",()=>expect(createCandle(inp({rating:7}),"id","now").rating).toBeNull());
});
describe("normalize",()=>{
  const B={id:"1",name:"A",brand:"B",scentNotes:"C",burnStatus:"unlit",view:"shelf",createdAt:"2024-01-01T00:00:00Z"};
  const N=(o:Record<string,unknown>)=>normalize({...B,...o});
  it("null",()=>expect(normalize(null)).toBeNull());
  it("str",()=>expect(normalize("hello")).toBeNull());
  it("num",()=>expect(normalize(42)).toBeNull());
  it("arr",()=>expect(normalize([])).toBeNull());
  it("obj-empty",()=>expect(normalize({})).toBeNull());
  it("missing-name",()=>expect(normalize({brand:"B",scentNotes:"C",burnStatus:"unlit",view:"shelf",id:"1"})).toBeNull());
  it("invalid-status",()=>expect(N({burnStatus:"smoldering"})).toBeNull());
  it("invalid-view",()=>expect(N({view:"collection"})).toBeNull());
  it("missing-id",()=>expect(normalize({name:"A",brand:"B",scentNotes:"C",burnStatus:"unlit",view:"shelf"})).toBeNull());
  it("valid",()=>{const r=N({id:"abc"});expect(r).not.toBeNull();expect(r?.id).toBe("abc");});
  it("name-long",()=>expect(N({name:"a".repeat(NAME_MAX+1)})).toBeNull());
  it("vessel-default",()=>{const r=N({vesselStyle:undefined});expect(r).not.toBeNull();expect(r?.vesselStyle).toBe("");});
});
