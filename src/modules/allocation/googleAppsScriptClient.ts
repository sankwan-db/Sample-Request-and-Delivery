export interface AppsScriptResponse {ok?:boolean;requirementId?:string;message?:string;[key:string]:unknown}

const endpoint=()=>process.env.VITE_REQUIREMENT_FORM_ENDPOINT||'https://script.google.com/macros/s/AKfycbyFF74hyYq2YMMRwWk6GuISaYs1qllXDHreKJJBhhuCLqRXXwSySZSLjG9wXEbQCiFA/exec';

/** Sends one public-form submission to the configured Apps Script endpoint. */
export async function submitRequirementToAppsScript(payload:Record<string,unknown>):Promise<AppsScriptResponse>{
 const response=await fetch(endpoint(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source:'sales-allocation-web',...payload})});
 if(!response.ok) throw new Error('Google Sheets endpoint returned '+response.status);
 const text=await response.text();
 try{return JSON.parse(text) as AppsScriptResponse}catch{return {ok:true,message:text}}
}
