# UAT — Issue & Exception Control Center

## ขอบเขต

ตรวจสอบการแจ้งปัญหาจาก Sales, RD, Co-Sale และ Logistic/Delivery ตั้งแต่สร้างรายการจนปิด Issue รวมถึงการบันทึกใน `22_ISSUE_LOG`

## Test cases

| ID | ขั้นตอนทดสอบ | ผลลัพธ์ที่คาดหวัง |
| --- | --- | --- |
| IC-01 | แจ้ง Issue จากหน้า Co-Sale | รายการใหม่แสดงใน `/monitoring/issues` และสถานะเป็น `OPEN` |
| IC-02 | แจ้ง Issue จากหน้า Delivery | รายการแสดงแหล่งที่มา Logistic / Delivery |
| IC-03 | ค้นหาด้วย Issue No., Sample No., ลูกค้า หรือ SO | ตารางแสดงเฉพาะรายการที่ตรงกับคำค้น |
| IC-04 | กรองตามส่วนงานและสถานะ | จำนวนและตารางเปลี่ยนตามตัวกรอง |
| IC-05 | กด “ส่งกลับ Sales / Co-Sale” สำหรับ Delivery Issue | Current Owner เปลี่ยนเป็น `Sale + Co-Sale` และมี Audit Log |
| IC-06 | กด “ส่งกลับ Sales / Co-Sale” สำหรับ Issue อื่น | Current Owner เปลี่ยนเป็น `Sale` และมี Audit Log |
| IC-07 | ปิด Issue โดยไม่กรอกผลการแก้ไข | ปุ่มปิด Issue ไม่สามารถกดได้ |
| IC-08 | กรอกผลการแก้ไขแล้วปิด Issue | สถานะเปลี่ยนเป็น `RESOLVED` พร้อมเวลาและผู้ดำเนินการ |
| IC-09 | Refresh หน้าเว็บหรือรอ Auto Sync | Issue และผลการแก้ไขยังคงอยู่ ไม่หายจากรายการ |
| IC-10 | เปิด Issue ที่แก้ไขแล้ว | แสดง Resolution Remark และไม่แสดงปุ่มแก้ไขซ้ำ |

## Regression checks

- หน้า Co-Sale และ Delivery ยังสามารถแจ้ง Issue ได้ตามเดิม
- เมื่อ Delivery มีสถานะ Delivered และไม่มี Open Issue ระบบสามารถปิดงานอัตโนมัติได้
- `npm ci`, `npm run lint` และ `npm run build` ต้องผ่านทั้งหมด
