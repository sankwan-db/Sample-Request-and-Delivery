export interface PublicRequirementForm {
  companyName:string;
  customerCode?:string;
  contactPerson:string;
  email:string;
  telephone:string;
  salesChannel:string;
  destinations:string[];
  packaging:{packingStyle:string;bagArtwork:string;cartonArtwork:string;freezingType:string;marketingUse:string;specNotes?:string;attachmentUrls?:string[]};
  products:Array<{productName:string;ideaPrice?:number;currency?:string;quantityPerMonthMT:number;contractType:'Spot'|'Monthly'|'Quarterly'|'Yearly';shipmentStart:string;shipmentEnd?:string}>;
  consent:boolean;
}

export interface RequirementSubmission extends PublicRequirementForm {
  requirementId:string;
  submissionId:string;
  submittedAt:string;
  assignedSalesRep?:string;
  stage:'New';
  matchStatus:'Pending';
}

export function validatePublicRequirement(form:PublicRequirementForm):string[] {
  const errors:string[]=[];
  if(!form.companyName.trim()) errors.push('กรุณาระบุชื่อบริษัท');
  if(!form.contactPerson.trim()) errors.push('กรุณาระบุชื่อผู้ติดต่อ');
  if(!form.email.trim()&&!form.telephone.trim()) errors.push('กรุณาระบุ Email หรือโทรศัพท์อย่างน้อย 1 รายการ');
  if(!form.salesChannel.trim()) errors.push('กรุณาเลือกช่องทางการขาย');
  if(!form.products.length) errors.push('กรุณาระบุรายการสินค้าอย่างน้อย 1 รายการ');
  if(form.products.some(p=>!p.productName.trim()||p.quantityPerMonthMT<=0)) errors.push('รายการสินค้าต้องมีชื่อและปริมาณมากกว่า 0');
  const duplicate=form.products.map(p=>p.productName.trim().toLowerCase()).filter((x,i,a)=>a.indexOf(x)!==i);
  if(duplicate.length) errors.push('ไม่อนุญาตให้มีรายการสินค้าซ้ำใน Requirement เดียวกัน');
  if(!form.consent) errors.push('กรุณายอมรับเงื่อนไขก่อนส่งข้อมูล');
  return errors;
}

export function createRequirementId(now=new Date()):string {
  const y=now.getFullYear(); const m=String(now.getMonth()+1).padStart(2,'0');
  const suffix=String(Math.floor(1000+Math.random()*9000));
  return 'REQ-'+y+m+'-'+suffix;
}

export function createSubmission(form:PublicRequirementForm, now=new Date()):RequirementSubmission {
  const submittedAt=now.toISOString();
  return {...form,requirementId:createRequirementId(now),submissionId:'SUB-'+Date.now().toString(36).toUpperCase(),submittedAt,stage:'New',matchStatus:'Pending'};
}
