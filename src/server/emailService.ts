import { google } from 'googleapis';

/**
 * Sends an email using the Gmail API with the provided OAuth access token.
 */
export async function sendEmailViaGmail(
  token: string,
  to: string,
  cc: string,
  subject: string,
  body: string
) {
  try {
    // Basic validation
    if (!token || token === 'custom_email_password_token') {
      console.warn('Gmail skip: No valid OAuth token provided');
      return null;
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });
    const gmail = google.gmail({ version: 'v1', auth });

    // Build the RFC 2822 email message
    // Support UTF-8 subjects
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const messageParts = [
      `To: ${to}`,
      cc ? `Cc: ${cc}` : '',
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${utf8Subject}`,
      '',
      body,
    ];
    
    // Filter out empty lines (like empty Cc)
    const message = messageParts.filter(line => line !== '').join('\r\n');

    // Gmail requires the message to be base64url encoded
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    console.log('Gmail sent successfully:', res.data.id);
    return res.data;
  } catch (error: any) {
    console.error('Gmail error:', error?.response?.data || error.message);
    throw error;
  }
}

/**
 * Helper to generate HTML body for workflow emails
 */
export function generateEmailBody(eventCode: string, sampleNo: string, customData: any) {
  let title = '';
  let color = '#3b82f6'; // Blue-500
  let actionText = '';

  switch (eventCode) {
    case 'EVENT_SUBMITTED':
      title = 'ได้รับคำขอส่งตัวอย่างใหม่ (New Request Submitted)';
      actionText = 'กรุณาตรวจสอบและดำเนินการในขั้นตอนถัดไป';
      break;
    case 'EVENT_APPROVED':
      title = 'คำขอส่งตัวอย่างได้รับการอนุมัติ (Request Approved)';
      color = '#10b981'; // Green-500
      actionText = 'คำขอนี้ได้รับการอนุมัติเรียบร้อยแล้ว';
      break;
    case 'EVENT_REVISION':
      title = 'คำขอส่งตัวอย่างต้องแก้ไข (Revision Required)';
      color = '#f59e0b'; // Amber-500
      actionText = `เหตุผลที่ต้องแก้ไข: ${customData.remark || 'N/A'}`;
      break;
    case 'EVENT_READY_TO_DELIVER':
      title = 'ตัวอย่างพร้อมจัดส่งแล้ว (Ready to Deliver)';
      color = '#8b5cf6'; // Violet-500
      actionText = 'ฝ่ายคลังเตรียมจัดส่งสินค้าเรียบร้อยแล้ว';
      break;
    case 'EVENT_DELIVERED':
      title = 'จัดส่งตัวอย่างเรียบร้อยแล้ว (Sample Delivered)';
      color = '#059669'; // Emerald-600
      actionText = 'ตัวอย่างถูกส่งถึงปลายทางเรียบร้อยแล้ว';
      break;
    default:
      title = `แจ้งเตือนระบบ: ${eventCode}`;
      actionText = 'กรุณาตรวจสอบข้อมูลในระบบ';
  }

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: ${color}; padding: 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 20px;">${title}</h1>
      </div>
      <div style="padding: 24px; line-height: 1.6; color: #374151;">
        <p style="font-weight: bold; font-size: 18px; margin-bottom: 8px;">เลขที่เอกสาร: ${sampleNo}</p>
        <p style="margin-bottom: 16px;">${actionText}</p>
        
        ${customData.comment ? `<div style="background-color: #f3f4f6; padding: 16px; border-radius: 4px; margin-bottom: 16px;">
          <strong>บันทึกเพิ่มเติม:</strong><br/>
          ${customData.comment}
        </div>` : ''}

        <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 24px; font-size: 14px; color: #6b7280;">
          <p>นี่คืออีเมลอัตโนมัติจากระบบ Sample Request Management</p>
          <p>กรุณาเข้าใช้งานระบบเพื่อดูรายละเอียดฉบับเต็ม</p>
        </div>
      </div>
    </div>
  `;
}
