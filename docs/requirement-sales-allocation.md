# Requirement & Sales Allocation Module

โมดูลนี้แยกจาก Sample Request เดิม ใช้รับ Requirement จากลูกค้าภายนอก ตรวจสอบโควต้าช่องทาง และติดตามการขาย

## Flow
Sale สร้าง Link → Customer กรอก Requirement → Matching Engine → Available/Reserve หรือ Over Quota → Quotation → Closed Won/Lost

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
