import React, { useState } from 'react';
import { useRequests } from '../contexts/RequestContext';
import { Mail, X, CheckCheck, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

export function AutoEmailNotification() {
  const { recentEmails, dismissEmailNotice } = useRequests();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (recentEmails.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      {recentEmails.map(email => {
        const isExpanded = expandedId === email.emailLogId;

        return (
          <div 
            key={email.emailLogId}
            className="bg-slate-900 text-white rounded-md shadow-2xl border border-slate-700 p-3.5 pointer-events-auto transition-all transform animate-in slide-in-from-bottom-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-blue-400">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Mail size={13} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    System Auto-Email Sent (ส่งอีเมลอัตโนมัติ)
                  </span>
                  <h4 className="text-[12px] font-bold text-white line-clamp-1">
                    {email.subject}
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : email.emailLogId)}
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
                  title="Toggle details"
                >
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                <button
                  onClick={() => dismissEmailNotice(email.emailLogId)}
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="mt-2 text-[11px] text-slate-300 flex items-center justify-between border-t border-slate-800 pt-2">
              <span className="text-slate-400 truncate max-w-[240px]">
                ถึง: <span className="text-slate-200">{email.toEmail}</span>
              </span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCheck size={12} /> {email.sendTime} น.
              </span>
            </div>

            {isExpanded && (
              <div className="mt-3 bg-slate-950/80 rounded p-2.5 text-[11px] text-slate-300 border border-slate-800 space-y-1.5">
                {email.ccEmail && (
                  <div>
                    <span className="text-slate-500">สำเนา (CC): </span>
                    <span className="text-slate-300">{email.ccEmail}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-500">เนื้อหา: </span>
                  <p className="text-slate-200 mt-1 leading-relaxed bg-slate-900/60 p-2 rounded border border-slate-800">
                    {email.body}
                  </p>
                </div>
                <div className="text-[9px] text-slate-500 pt-1">
                  Logged in SHEET 13: EMAIL_LOG
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
