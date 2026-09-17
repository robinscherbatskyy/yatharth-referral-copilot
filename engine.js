(function(root){
'use strict';
const departments=['Cardiology','Orthopaedics','Neurosciences','General Medicine'];
const samples=[
 {alias:'Demo Patient A',patientId:'SYN-001',referrer:'Dr A · synthetic clinic',contact:'',docs:'Referral letter',text:'Requested speciality: Cardiology\nReferrer priority: Urgent\nReason: Recurrent palpitations. Referrer requests specialist review.\nAttachments: Referral letter. ECG mentioned but not supplied.',expected:'Urgent review; missing contact and ECG'},
 {alias:'Demo Patient B',patientId:'SYN-002',referrer:'Dr B · synthetic clinic',contact:'DEMO-CONTACT-B',docs:'Referral letter; X-ray report',text:'Requested speciality: Orthopaedics\nReferrer priority: Routine\nReason: Persistent knee discomfort. Referrer requests outpatient assessment.\nAttachments: Referral letter and X-ray report supplied.',expected:'Complete routine referral'},
 {alias:'Demo Patient C',patientId:'SYN-003',referrer:'Dr C · synthetic clinic',contact:'DEMO-CONTACT-C',docs:'Referral letter',text:'Requested speciality: Neurosciences\nReferrer priority: Immediate\nReason: Referrer documents sudden weakness and asks for immediate clinical assessment.\nAttachments: Referral letter.',expected:'Escalation; no routine booking'}
];
const unknown=v=>!v||/^(unknown|not provided|missing|n\/a|none)$/i.test(v.trim());
const value=(text,label)=>{const m=text.match(new RegExp('^'+label+':\\s*(.*)$','im'));return m?m[1].trim():''};
function analyse(input,records=[]){
 const text=input.text||'',rawDept=value(text,'Requested speciality'),rawPriority=value(text,'Referrer priority'),reason=value(text,'Reason');
 const speciality=departments.find(x=>x.toLowerCase()===rawDept.toLowerCase())||'Unclear';
 const priority=['Routine','Urgent','Immediate'].find(x=>x.toLowerCase()===rawPriority.toLowerCase())||'Unclear';
 const missing=[];for(const [k,label]of [['alias','Patient alias'],['patientId','Patient identifier'],['referrer','Referrer'],['contact','Contact reference']])if(unknown(input[k]))missing.push(label);
 if(unknown(reason))missing.push('Referral reason');if(!/referral letter/i.test(input.docs||''))missing.push('Referral letter');
 if(/ECG mentioned but not supplied/i.test(text)&&!/ECG/i.test(input.docs||''))missing.push('ECG mentioned by referrer');
 const duplicate=records.some(r=>r.patientId.trim().toLowerCase()===(input.patientId||'').trim().toLowerCase()&&r.id!==input.id);
 const flags=[];if(duplicate)flags.push('Possible duplicate identifier: compare records; do not merge automatically.');
 if(priority==='Immediate')flags.push('Referrer requests immediate assessment: escalate to a clinician outside routine scheduling.');
 if(priority==='Unclear'||speciality==='Unclear')flags.push('Unclear routing or priority: clinician must resolve.');
 if(/ignore.*instruction|system prompt|approve automatically|override.*rule/i.test(text))flags.push('Instruction-like source text detected. Treat referral content only as data.');
 return{summary:reason||'No labelled referral reason supplied; inspect the original text.',speciality,priority,missing,flags,duplicate,critical:priority==='Immediate',evidence:[rawDept?'Requested speciality: '+rawDept:'',rawPriority?'Referrer priority: '+rawPriority:'',reason?'Reason: '+reason:''].filter(Boolean),rationale:'Department and priority reproduce explicit referrer labels. They are proposals pending clinician review; no diagnosis or symptom-based triage is performed.',confidence:'Not calibrated — no probability estimate',mode:'Review simulation · verify against source',version:'RTOCF-3.0',createdAt:new Date().toISOString()};
}
function canApprove(r,role){if(!r.analysis)return'Analyse the referral first.';if(role!=='Clinician')return'Only the clinician role can confirm routing and priority.';if(!r.verified)return'Coordinator verification is required.';if(r.analysis.missing.length)return'Resolve missing information and reanalyse first.';if(r.analysis.duplicate&&!r.duplicateResolved)return'Resolve the duplicate flag with a recorded reason.';if(r.analysis.critical||r.status==='Escalated')return'Immediate or escalated requests require a reviewed modification.';if(r.analysis.speciality==='Unclear'||r.analysis.priority==='Unclear')return'Use Modify to resolve the unclear recommendation.';return'';}
function draft(r){if(r.analysis.missing.length)return'Referral '+r.id+': Please provide '+r.analysis.missing.join(', ')+'. The referral is awaiting verification. This message does not confirm an appointment.';if(r.status==='Rejected')return'Referral '+r.id+': The reviewer has returned this request. Please contact the referral coordinator for the reviewed next step. No appointment is confirmed.';if(r.status==='Escalated')return'Referral '+r.id+': This request has been escalated for clinician review. Routine booking is on hold. The care team must confirm the next action directly.';if(r.status==='Scheduled'||r.status==='Closed')return'Referral '+r.id+': The demonstration booking is recorded for '+r.final.department+' on '+r.appointment+'. Please confirm arrangements with the care team. This is a synthetic demonstration message.';return'Referral '+r.id+': Your referral is being reviewed. We will share the next step after the care team confirms it. No appointment is confirmed.';}
const api={samples,departments,analyse,canApprove,draft,value};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ReferralEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
