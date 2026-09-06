import { Router, Request, Response } from 'express';
import * as services from './googleSheetsService.js';
import fs from 'fs';
import path from 'path';

export const serviceRouter = Router();

// Helper to extract access token and spreadsheet ID
function getAuthContext(req: Request) {
  let token = req.body?.token;
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      token = parts[1];
    }
  }

  // Fallback to cached Google token if missing or from email/password flow
  if (!token || token === 'custom_email_password_token') {
    try {
      const tokenFile = path.join(process.cwd(), '.google_token.txt');
      if (fs.existsSync(tokenFile)) {
        token = fs.readFileSync(tokenFile, 'utf-8').trim();
      }
    } catch (e) {
      // ignore
    }
  }

  const spreadsheetId = (req.headers['x-spreadsheet-id'] as string) || req.body?.spreadsheetId;
  return { token, spreadsheetId };
}

// 1. Setup & Init
serviceRouter.post('/setupDatabase', async (req: Request, res: Response) => {
  try {
    const { token } = getAuthContext(req);
    const result = await services.setupDatabase(req.body.options || req.body, token);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

serviceRouter.post('/createAllSheets', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const result = await services.createAllSheets(spreadsheetId || req.body.spreadsheetId, token!);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

serviceRouter.post('/initializeDefaultMasterData', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const result = await services.initializeDefaultMasterData(spreadsheetId || req.body.spreadsheetId, token!, req.body.options);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Master Data
serviceRouter.get('/getUsers', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const users = await services.getUsers(token, spreadsheetId);
    res.json({ success: true, data: users });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

serviceRouter.get('/getCustomers', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const customers = await services.getCustomers(token, spreadsheetId);
    res.json({ success: true, data: customers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

serviceRouter.get('/getProducts', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const products = await services.getProducts(token, spreadsheetId);
    res.json({ success: true, data: products });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

serviceRouter.get('/getRDDepartments', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const depts = await services.getRDDepartments(token, spreadsheetId);
    res.json({ success: true, data: depts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

serviceRouter.get('/getRunningNumberConfig', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const config = await services.getRunningNumberConfig(token, spreadsheetId);
    res.json({ success: true, data: config });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

serviceRouter.post('/initializeRunningNumber', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const result = await services.initializeRunningNumber(req.body, token, spreadsheetId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

serviceRouter.post('/generateSampleNumber', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const { deptCode, year, userEmail, userName } = req.body;
    const result = await services.generateSampleNumber(deptCode, year, userEmail, userName, token, spreadsheetId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

serviceRouter.post('/upsertCustomer', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const result = await services.upsertCustomer(req.body, token!, spreadsheetId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

serviceRouter.post('/upsertProduct', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const result = await services.upsertProduct(req.body, token!, spreadsheetId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Requests
serviceRouter.get('/getSampleRequests', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const requests = await services.getSampleRequests(req.query, token, spreadsheetId);
    res.json({ success: true, data: requests });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

serviceRouter.get('/getSampleRequestById/:sampleNo', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const request = await services.getSampleRequestById(req.params.sampleNo, token, spreadsheetId);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Sample request not found' });
    }
    res.json({ success: true, data: request });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

serviceRouter.post('/createSampleRequest', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const result = await services.createSampleRequest(req.body, token, spreadsheetId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

serviceRouter.post('/updateSampleRequest', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const { sampleNo, updateData } = req.body;
    const result = await services.updateSampleRequest(sampleNo, updateData, token, spreadsheetId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

serviceRouter.post('/submitSampleRequest', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const { sampleNo, submitter } = req.body;
    const result = await services.submitSampleRequest(sampleNo, submitter, token, spreadsheetId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Logistics
serviceRouter.get('/getLogisticTasks', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const sampleNo = req.query.sampleNo as string;
    const tasks = await services.getLogisticTasks(sampleNo, token, spreadsheetId);
    res.json({ success: true, data: tasks });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

serviceRouter.post('/confirmLogisticPrecheck', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const { taskId, decision, proposedData, remark, user } = req.body;
    const result = await services.confirmLogisticPrecheck(taskId, decision, proposedData, remark, user, token, spreadsheetId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

serviceRouter.post('/assignVehicle', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const { taskId, vehicleData, user } = req.body;
    const result = await services.assignVehicle(taskId, vehicleData, user, token, spreadsheetId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

serviceRouter.post('/confirmVehicle', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const { taskId, confirmationData, user } = req.body;
    const result = await services.confirmVehicle(taskId, confirmationData, user, token, spreadsheetId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

serviceRouter.post('/updateDeliveryStatus', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const { taskId, deliveryStatus, podUrl, issueRemark, user } = req.body;
    const result = await services.updateDeliveryStatus(taskId, deliveryStatus, podUrl, issueRemark, user, token, spreadsheetId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Approvals
serviceRouter.get('/getApprovalQueue', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const queue = await services.getApprovalQueue(req.query.email as string, token, spreadsheetId);
    res.json({ success: true, data: queue });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

serviceRouter.post('/approveRequest', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const { sampleNo, approver, comment } = req.body;
    const result = await services.approveRequest(sampleNo, approver, comment, token, spreadsheetId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

serviceRouter.post('/rejectRequest', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const { sampleNo, approver, reason } = req.body;
    const result = await services.rejectRequest(sampleNo, approver, reason, token, spreadsheetId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

serviceRouter.post('/requestRevision', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const { sampleNo, approver, sections, remark } = req.body;
    const result = await services.requestRevision(sampleNo, approver, sections, remark, token, spreadsheetId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. RD & Co-Sale Tasks
serviceRouter.post('/createRDTasks', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const { sampleNo, items } = req.body;
    const result = await services.createRDTasks(sampleNo, items, token, spreadsheetId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

serviceRouter.post('/updateRDTask', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const { taskId, updateData } = req.body;
    const result = await services.updateRDTask(taskId, updateData, token, spreadsheetId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

serviceRouter.post('/completeRDTask', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const { taskId, lot, actualQty, productionDate, expiryDate, remark, user } = req.body;
    const result = await services.completeRDTask(taskId, lot, actualQty, productionDate, expiryDate, remark, user, token, spreadsheetId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

serviceRouter.post('/createCoSaleTask', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const { sampleNo, coSaleData } = req.body;
    const result = await services.createCoSaleTask(sampleNo, coSaleData, token, spreadsheetId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

serviceRouter.post('/completeSO', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const { taskId, soNumber, soDate, erpStatus, remark, user } = req.body;
    const result = await services.completeSO(taskId, soNumber, soDate, erpStatus, remark, user, token, spreadsheetId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Gate
serviceRouter.get('/checkReadyToDeliverGate/:sampleNo', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const result = await services.checkReadyToDeliverGate(req.params.sampleNo, token, spreadsheetId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Documents & PDF
serviceRouter.get('/generateSampleDocument/:sampleNo', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const result = await services.generateSampleDocument(req.params.sampleNo, token, spreadsheetId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

serviceRouter.post('/generatePDF', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const { sampleNo, documentType } = req.body;
    const result = await services.generatePDF(sampleNo, documentType, token, spreadsheetId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

serviceRouter.post('/savePDFToDrive', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const { sampleNo, pdfData, fileName } = req.body;
    const result = await services.savePDFToDrive(sampleNo, pdfData, fileName, token, spreadsheetId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Email & Notifications
serviceRouter.get('/getEmailRecipients', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const { eventCode, department } = req.query;
    const result = await services.getEmailRecipients(eventCode as string, department as string, token, spreadsheetId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

serviceRouter.post('/sendWorkflowEmail', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const { eventCode, sampleNo, customData } = req.body;
    const result = await services.sendWorkflowEmail(eventCode, sampleNo, customData, token, spreadsheetId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

serviceRouter.post('/writeEmailLog', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const result = await services.writeEmailLog(req.body, token, spreadsheetId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Issues & Audit Log
serviceRouter.post('/createIssue', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const result = await services.createIssue(req.body, token, spreadsheetId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

serviceRouter.post('/writeAuditLog', async (req: Request, res: Response) => {
  try {
    const { token, spreadsheetId } = getAuthContext(req);
    const result = await services.writeAuditLog(req.body, token, spreadsheetId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generic dynamic service executor
serviceRouter.post('/execute', async (req: Request, res: Response) => {
  try {
    const { serviceName, args } = req.body;
    const fn = (services as any)[serviceName];
    if (typeof fn !== 'function') {
      return res.status(404).json({ success: false, error: `Service method '${serviceName}' not found` });
    }
    const { token, spreadsheetId } = getAuthContext(req);
    const callArgs = Array.isArray(args) ? [...args] : [args];
    // inject token if needed
    const result = await fn(...callArgs, token, spreadsheetId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
