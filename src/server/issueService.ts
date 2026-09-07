import { appendRow, readSheet, updateRowByColumn } from './sheets.js';
import { getDatabaseConfig } from './db.js';
import { SHEETS_SCHEMA } from './schema.js';
import { writeAuditLog } from './googleSheetsService.js';

const fallbackIssues: any[] = [];

function getActiveSpreadsheetId(providedId?: string): string | null {
  if (providedId) return providedId;
  const config = getDatabaseConfig();
  return config.configured && config.spreadsheetId ? config.spreadsheetId : null;
}

export async function getIssues(sampleNo?: string, token?: string, spreadsheetId?: string) {
  const activeSpreadsheetId = getActiveSpreadsheetId(spreadsheetId);
  let issues: any[] = [];
  if (token && activeSpreadsheetId) {
    try {
      issues = await readSheet(token, activeSpreadsheetId, '22_ISSUE_LOG');
    } catch (error: any) {
      console.warn('Sheets read 22_ISSUE_LOG error, returning fallback:', error.message);
    }
  }
  if (issues.length === 0) issues = fallbackIssues;
  return sampleNo
    ? issues.filter(issue => (issue.Sample_No || issue.sampleNo) === sampleNo)
    : issues;
}

export async function createIssue(issueData: any, token?: string, spreadsheetId?: string) {
  const now = new Date();
  const issue = {
    Issue_ID: `ISS-${Date.now()}`,
    Sample_No: issueData.sampleNo || '',
    Process: issueData.process || 'GENERAL',
    Issue_Type: issueData.issueType || 'OTHER',
    Severity: issueData.severity || 'MEDIUM',
    Description: issueData.description || '',
    Owner: issueData.owner || 'System',
    Created_Time: now.toISOString(),
    Expected_Resolve: issueData.expectedResolve || '',
    Resolution: '',
    Resolved_Time: '',
    Status: 'OPEN',
  };

  fallbackIssues.unshift(issue);
  const activeSpreadsheetId = getActiveSpreadsheetId(spreadsheetId);
  if (token && activeSpreadsheetId) {
    const row = SHEETS_SCHEMA['22_ISSUE_LOG'].map(column => (issue as any)[column] || '');
    await appendRow(token, activeSpreadsheetId, '22_ISSUE_LOG', row);
  }
  return issue;
}

export async function resolveIssue(
  issueId: string,
  resolution: string,
  resolvedBy: string,
  token?: string,
  spreadsheetId?: string,
) {
  const issues = await getIssues(undefined, token, spreadsheetId);
  const existingIssue = issues.find(issue => (issue.Issue_ID || issue.id) === issueId);
  if (!existingIssue) throw new Error(`Issue '${issueId}' not found`);

  const updates = {
    Resolution: resolution,
    Resolved_Time: new Date().toISOString(),
    Status: 'RESOLVED',
  };
  const fallbackIssue = fallbackIssues.find(issue => issue.Issue_ID === issueId);
  if (fallbackIssue) Object.assign(fallbackIssue, updates, { Resolved_By: resolvedBy });

  const activeSpreadsheetId = getActiveSpreadsheetId(spreadsheetId);
  if (token && activeSpreadsheetId) {
    await updateRowByColumn(token, activeSpreadsheetId, '22_ISSUE_LOG', 'Issue_ID', issueId, updates);
  }
  await writeAuditLog({
    user: resolvedBy,
    role: 'AUTHORIZED_USER',
    module: 'ISSUE_CENTER',
    Sample_No: existingIssue.Sample_No || existingIssue.sampleNo || '',
    action: 'RESOLVE_ISSUE',
    targetId: issueId,
    reason: resolution,
  }, token, spreadsheetId);
  return { Issue_ID: issueId, ...updates, Resolved_By: resolvedBy };
}
