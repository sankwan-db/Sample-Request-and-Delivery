import React from 'react';
import { matchRequirement, QuotaSnapshot, RequirementLine } from './matchingEngine';

const quotas:QuotaSnapshot[]=[
 {quotaId:'Q001',period:'2026-09',channel:'Export',productId:'P001',quotaMT:820,usedMT:704,reservedMT:52},
 {quotaId:'Q002',period:'2026-09',channel:'Food Service',productId:'P002',quotaMT:460,usedMT:352,reservedMT:44},
 {quotaId:'Q003',period:'2026-09',channel:'Domestic',productId:'P003',quotaMT:520,usedMT:508,reservedMT:28}
];
const lines:RequirementLine[]=[
 {productId:'P001',channel:'Export',shipmentMonth:'2026-09',quantityMT:64},
 {productId:'P002',channel:'Food Service',shipmentMonth:'2026-09',quantityMT:32},
 {productId:'P003',channel:'Domestic',shipmentMonth:'2026-09',quantityMT:54}
];

export function AllocationDashboard(){
 const results=matchRequirement(lines,quotas);
 return <section data-testid="allocation-dashboard" className="allocation-dashboard">
  <header><div><h2>ผลการจัดสรร Requirement</h2><p>ตรวจสอบ Quota และ Supply รอบเดือนกันยายน 2026</p></div><span className="allocation-badge">UAT Mock Data</span></header>
  <div className="allocation-summary">{results.map((r)=><article key={r.productId}><small>{r.channel} • {r.productId}</small><strong>{r.status}</strong><span>Requirement {r.quantityMT} MT</span><span>Reserve {r.reservedMT} MT • Available หลังจอง {r.availableAfterMT} MT</span><b>{r.coveragePct.toFixed(1)}% ของโควต้า</b></article>)}</div>
  <table><thead><tr><th>สินค้า</th><th>โควต้า</th><th>Requirement</th><th>Reserve</th><th>Available หลังจอง</th><th>สถานะ</th></tr></thead><tbody>{results.map(r=><tr key={r.productId}><td>{r.productId}</td><td>{r.quotaMT} MT</td><td>{r.quantityMT} MT</td><td>{r.reservedMT} MT</td><td>{r.availableAfterMT} MT</td><td><span className={'status-'+r.status.toLowerCase().replace(' ','-')}>{r.status}</span></td></tr>)}</tbody></table>
 </section>;
}
