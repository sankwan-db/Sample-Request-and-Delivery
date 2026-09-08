# Requirement & Sales Allocation Module

โมดูลนี้แยกจาก Sample Request เดิม ใช้รับ Requirement จากลูกค้าภายนอก ตรวจสอบโควต้าช่องทาง และติดตามการขาย

## Customer Link
ใช้ Public Link เดียวสำหรับลูกค้าทุกคน ไม่ผูกกับลูกค้าหรือ Sale ล่วงหน้า

Customer เปิดลิงก์ → กรอก Company/Contact/Country/Channel และ Product Requirements → Submit → ระบบสร้าง Requirement_ID อัตโนมัติ → Matching Engine → Available/Reserve หรือ Over Quota → Sales Pipeline

Sale ไม่ต้องกรอกข้อมูลก่อนสร้างลิงก์ และไม่ต้องสร้างลิงก์รายลูกค้า

## Identity and duplicate protection
- ทุกการ Submit สร้าง Requirement_ID ใหม่รูปแบบ REQ-YYYYMM-XXXX
- สร้าง Submission_ID และ Created_At เป็น audit key
- ตรวจสอบ duplicate ด้วย Company Name + Contact Email + Shipment Month + Product
- ไม่เขียนทับ Requirement เดิม หากลูกค้าต้องแก้ไขให้สร้าง Revision ใหม่และเก็บรายการเดิมไว้
- ช่อง Assigned Sales Rep เป็นค่าว่างตอนลูกค้าส่ง และให้ทีมภายใน assign ภายหลัง

## Google Sheets
ใช้ Spreadsheet: Sales Allocation & Requirement Database
Tabs: Customer_Master, Product_Master, Channel_Quota, Supply_Plan, Requirement_Header, Requirement_Lines, Allocation_Result, Sales_Pipeline, Follow_Up_Log, System_Log

## Calculation
- Available MT = Quota MT - Used MT - Reserved MT
- Coverage % = Requirement MT / Quota MT × 100
- Weighted Pipeline MT = Opportunity MT × Probability
- Sales Gap MT = Allocation MT - Confirmed SO MT - Weighted Pipeline MT

## Separation rule
ห้ามเขียนทับตารางหรือ workflow ของ Sample Request เดิม ใช้ prefix REQ-, QUOTA-, ALLOC- และมี audit log ทุกการแก้ไข
