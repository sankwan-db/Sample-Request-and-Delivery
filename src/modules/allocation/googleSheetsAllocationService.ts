import {google} from 'googleapis';
import type {RequirementSubmission} from './publicRequirementForm';

const spreadsheetId=process.env.ALLOCATION_SHEET_ID||'1OJVf07UpQ1D_M0nwwPYc9NOP-iZA4y16dEt6hP_Q3DY';
const auth=()=>new google.auth.GoogleAuth({credentials:process.env.GOOGLE_SERVICE_ACCOUNT_JSON?JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON):undefined,scopes:['https://www.googleapis.com/auth/spreadsheets']});
const sheets=()=>google.sheets({version:'v4',auth:auth()});

export async function readAllocationSheet(range:string){
 if(!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return {connected:false,values:[]};
 const response=await sheets().spreadsheets.values.get({spreadsheetId,range});
 return {connected:true,values:response.data.values||[]};
}

export async function appendRequirement(submission:RequirementSubmission){
 if(!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) throw new Error('Google Sheets service account is not configured');
 const api=sheets();
 const header=[submission.requirementId,submission.submissionId,submission.companyName,submission.customerCode||'',submission.submittedAt,submission.contactPerson,submission.email,submission.telephone,submission.salesChannel,submission.stage,submission.matchStatus];
 const lines=submission.products.map((p,i)=>[submission.requirementId,i+1,p.productName,p.ideaPrice||'',p.currency||'',p.quantityPerMonthMT,p.contractType,p.shipmentStart,p.shipmentEnd||'']);
 await api.spreadsheets.values.append({spreadsheetId,range:'Requirement_Header!A:K',valueInputOption:'USER_ENTERED',insertDataOption:'INSERT_ROWS',requestBody:{values:[header]}});
 if(lines.length) await api.spreadsheets.values.append({spreadsheetId,range:'Requirement_Lines!A:I',valueInputOption:'USER_ENTERED',insertDataOption:'INSERT_ROWS',requestBody:{values:lines}});
 return {requirementId:submission.requirementId,submissionId:submission.submissionId};
}
