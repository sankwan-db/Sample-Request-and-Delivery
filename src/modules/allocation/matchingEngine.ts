export type MatchStatus = 'Available' | 'Near Limit' | 'Over Quota';

export interface QuotaSnapshot { quotaId:string; period:string; channel:string; productId:string; quotaMT:number; usedMT:number; reservedMT:number; }
export interface RequirementLine { productId:string; channel:string; shipmentMonth:string; quantityMT:number; }
export interface MatchLine extends RequirementLine { quotaMT:number; availableBeforeMT:number; reservedMT:number; availableAfterMT:number; coveragePct:number; status:MatchStatus; }

/** Pure matching calculation. Does not mutate source quota; reservation is returned as a proposed result. */
export function matchRequirement(lines:RequirementLine[], quotas:QuotaSnapshot[]):MatchLine[] {
 const reserved=new Map<string,number>();
 return lines.map(line=>{
  const q=quotas.find(x=>x.productId===line.productId&&x.channel===line.channel&&x.period===line.shipmentMonth);
  const quotaMT=q?.quotaMT??0,usedMT=q?.usedMT??0,existing=q?.reservedMT??0;
  const key=q?.quotaId??(line.shipmentMonth+'|'+line.channel+'|'+line.productId);
  const proposed=reserved.get(key)??0; const before=quotaMT-usedMT-existing-proposed;
  const reserve=Math.max(0,Math.min(line.quantityMT,before)); const after=before-reserve; reserved.set(key,proposed+reserve);
  const coverage=quotaMT===0?0:(line.quantityMT/quotaMT)*100;
  const status:MatchStatus=before<line.quantityMT?'Over Quota':after/quotaMT<0.15?'Near Limit':'Available';
  return {...line,quotaMT,availableBeforeMT:before,reservedMT:reserve,availableAfterMT:after,coveragePct:coverage,status};
 });
}
