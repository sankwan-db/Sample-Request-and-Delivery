# Public Customer Requirement Link

## URL
ระบบใช้ลิงก์เดียวสำหรับลูกค้าทุกคน: `/public/requirement`

ลิงก์นี้ไม่ฝัง Customer Code, Sales Rep หรือข้อมูลลูกค้าใน URL และไม่สร้างลิงก์รายบุคคล

## Submission behavior
1. เปิดฟอร์มสาธารณะ
2. กรอกข้อมูลและรายการสินค้า
3. ตรวจสอบ Validation และ Consent
4. สร้าง Requirement_ID และ Submission_ID ใหม่
5. บันทึก Header/Lines แยกแถวลง Google Sheets
6. ส่งสถานะเริ่มต้นเป็น New / Pending
7. ทีมภายใน Assign Sales Rep ภายหลัง

## Duplicate protection
- ห้ามซ้ำรายการสินค้าใน Submission เดียวกัน
- ตรวจซ้ำ Company + Email/Telephone + Shipment Period + Product ก่อนแจ้งเตือน
- หากเป็นการแก้ไข ให้สร้าง Revision ใหม่และเก็บต้นฉบับ
- ทุกการเปลี่ยนสถานะบันทึกลง System_Log

## Internal flow
New → Quota Checked → Quoting → Closed Won / Closed Lost
