import {createSubmission,validatePublicRequirement,PublicRequirementForm} from './publicRequirementForm';
import {submitRequirementToAppsScript} from './googleAppsScriptClient';

export async function submitPublicRequirement(form:PublicRequirementForm){
 const errors=validatePublicRequirement(form);
 if(errors.length) return {ok:false as const,errors};
 const submission=createSubmission(form);
 try{
  const response=await submitRequirementToAppsScript(submission as unknown as Record<string,unknown>);
  return {ok:true as const,submission,response};
 }catch(error){
  return {ok:false as const,errors:[error instanceof Error?error.message:'ไม่สามารถบันทึกข้อมูลได้'],submission};
 }
}
