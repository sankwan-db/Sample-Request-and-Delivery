import { CustomerMaster, ProductMaster, DocumentTypeMaster } from '../types';

export const DOCUMENT_TYPE_MASTER: DocumentTypeMaster[] = [
  {
    docCode: 'COA',
    docName: 'COA (Certificate of Analysis)',
    description: 'ใบรับรองผลการวิเคราะห์คุณภาพสินค้าประจำ Lot',
    isRequiredDefault: true,
    active: true,
    sortOrder: 1
  },
  {
    docCode: 'SPEC',
    docName: 'Product Specification Sheet',
    description: 'เอกสารข้อกำหนดคุณลักษณะและมาตรฐานสินค้าฉบับทางการ',
    isRequiredDefault: true,
    active: true,
    sortOrder: 2
  },
  {
    docCode: 'TAX_INV',
    docName: 'Tax Invoice / Delivery Note',
    description: 'ใบกำกับภาษี / ใบส่งของตัวอย่างมูลค่าศูนย์หรือเรียกเก็บ',
    isRequiredDefault: false,
    active: true,
    sortOrder: 3
  },
  {
    docCode: 'GMP_HACCP',
    docName: 'GMP / HACCP / GHPs Certificate',
    description: 'เอกสารรับรองมาตรฐานสุขอนามัยและความปลอดภัยอาหาร',
    isRequiredDefault: false,
    active: true,
    sortOrder: 4
  },
  {
    docCode: 'HALAL',
    docName: 'Halal Certificate (หนังสือรับรองฮาลาล)',
    description: 'หนังสือรับรองมาตรฐานอาหารฮาลาลจาก สนง.คณะกรรมการกลางฯ',
    isRequiredDefault: false,
    active: true,
    sortOrder: 5
  },
  {
    docCode: 'MSDS',
    docName: 'MSDS / SDS (Safety Data Sheet)',
    description: 'เอกสารข้อมูลความปลอดภัยสารเคมีและส่วนผสม',
    isRequiredDefault: false,
    active: true,
    sortOrder: 6
  },
  {
    docCode: 'NUTRITION',
    docName: 'Nutrition Fact Sheet (ข้อมูลโภชนาการ)',
    description: 'ตารางข้อมูลคุณค่าทางโภชนาการต่อหน่วยบริโภค',
    isRequiredDefault: false,
    active: true,
    sortOrder: 7
  }
];

export const DEPOT_LIST = [
  { code: 'DEPOT-BKK-01', name: 'คลังหลักบางนา-ตราด กม.19 (Central Cold Chain Depot)', province: 'สมุทรปราการ' },
  { code: 'DEPOT-BKK-02', name: 'ศูนย์กระจายสินค้าลาดกระบัง (East Distribution Hub)', province: 'กรุงเทพมหานคร' },
  { code: 'DEPOT-SAMUTSAKHON', name: 'คลังมหาชัยเมืองใหม่ (Frozen Logistics Center)', province: 'สมุทรสาคร' },
  { code: 'DEPOT-PATHUM', name: 'คลังนวนคร (North Hub)', province: 'ปทุมธานี' }
];

export const CUSTOMER_LIST: CustomerMaster[] = [
  {
    customerCode: 'CUST-001',
    customerName: 'บริษัท ไทยเบฟเวอเรจ จำกัด (มหาชน)',
    customerGroup: 'Beverage & Food Conglomerate',
    salesChannel: 'Modern Trade & Key Account',
    saleOwner: 'Anucha (Sale)',
    contactName: 'คุณสมศักดิ์ วัฒนา',
    contactPhone: '02-785-5555 ต่อ 1234',
    contactEmail: 'somsak.w@thaibev.com',
    shipToCode: 'SHIP-01-BKK',
    deliveryAddress: '14 ถ.วิภาวดีรังสิต แขวงจอมพล เขตจตุจักร กรุงเทพฯ 10900',
    district: 'จตุจักร',
    province: 'กรุงเทพมหานคร',
    defaultRoute: 'BKK-CENTRAL (Zone A)',
    defaultDepot: 'DEPOT-BKK-01',
    defaultDeliveryTime: '10:00 - 12:00',
    defaultDocuments: 'COA, Spec Sheet, Tax Invoice',
    active: true
  },
  {
    customerCode: 'CUST-002',
    customerName: 'บริษัท ซีพี ออลล์ จำกัด (มหาชน)',
    customerGroup: 'Modern Trade / Convenience Store',
    salesChannel: 'Modern Trade',
    saleOwner: 'Anucha (Sale)',
    contactName: 'คุณกรรณิการ์ จิตเจริญ',
    contactPhone: '02-071-9000',
    contactEmail: 'kannika.j@cpall.co.th',
    shipToCode: 'SHIP-DC-PATHUM',
    deliveryAddress: 'ศูนย์กระจายสินค้าซีพี ออลล์ ลาดกระบัง ถ.ฉลองกรุง ลาดกระบัง กทม. 10520',
    district: 'ลาดกระบัง',
    province: 'กรุงเทพมหานคร',
    defaultRoute: 'BKK-EAST (Zone C)',
    defaultDepot: 'DEPOT-BKK-02',
    defaultDeliveryTime: '08:30 - 11:00',
    defaultDocuments: 'COA, GMP Certificate, Halal',
    active: true
  },
  {
    customerCode: 'CUST-003',
    customerName: 'บริษัท ไมเนอร์ ฟู้ด กรุ๊ป จำกัด (มหาชน)',
    customerGroup: 'QSR / Chain Restaurant',
    salesChannel: 'Food Service & HORECA',
    saleOwner: 'Suda (Sale)',
    contactName: 'คุณธนภัทร เลิศวรพงษ์',
    contactPhone: '02-365-7500',
    contactEmail: 'thanapat_le@minor.com',
    shipToCode: 'SHIP-03-BKK',
    deliveryAddress: '88 อาคารเดอะ ปาร์ค ชั้น 12 ถ.รัชดาภิเษก คลองเตย กทม. 10110',
    district: 'คลองเตย',
    province: 'กรุงเทพมหานคร',
    defaultRoute: 'BKK-SOUTH (Zone B)',
    defaultDepot: 'DEPOT-BKK-01',
    defaultDeliveryTime: '13:00 - 15:00',
    defaultDocuments: 'COA, Spec Sheet',
    active: true
  },
  {
    customerCode: 'CUST-004',
    customerName: 'บริษัท เอส แอนด์ พี ซินดิเคท จำกัด (มหาชน)',
    customerGroup: 'Bakery & Restaurant',
    salesChannel: 'Food Service & Chain Store',
    saleOwner: 'Suda (Sale)',
    contactName: 'คุณปิยะมาศ บุญส่ง',
    contactPhone: '02-785-4000',
    contactEmail: 'piyamas.b@snpfood.com',
    shipToCode: 'SHIP-SNP-BANGNA',
    deliveryAddress: '2034/100-107 อาคารอิตัลไทย ทาวเวอร์ ถ.เพชรบุรีตัดใหม่ บางกะปิ ห้วยขวาง กทม. 10310',
    district: 'ห้วยขวาง',
    province: 'กรุงเทพมหานคร',
    defaultRoute: 'BKK-CENTRAL (Zone A)',
    defaultDepot: 'DEPOT-BKK-01',
    defaultDeliveryTime: '10:00 - 14:00',
    defaultDocuments: 'COA, Spec Sheet',
    active: true
  }
];

export const PRODUCT_LIST: ProductMaster[] = [
  // RM - Raw Meat
  {
    itemCode: 'SKU-RM-001',
    productName: 'Pork Collar Fresh Sliced (สันคอหมูสไลด์พรีเมียม)',
    category: 'Raw Meat',
    deptCode: 'RM',
    uom: 'กก.',
    kgPerBag: 1.0,
    kgPerUnit: 1.0,
    storageType: 'Chilled',
    temperature: '0°C to 4°C',
    shelfLife: '7 Days',
    standardPrice: 220,
    active: true
  },
  {
    itemCode: 'SKU-RM-002',
    productName: 'Premium Wagyu Beef Ribeye Strips (เนื้อริบอายวากิว)',
    category: 'Raw Meat',
    deptCode: 'RM',
    uom: 'กก.',
    kgPerBag: 2.0,
    kgPerUnit: 2.0,
    storageType: 'Chilled',
    temperature: '0°C to 4°C',
    shelfLife: '14 Days',
    standardPrice: 850,
    active: true
  },
  {
    itemCode: 'SKU-RM-003',
    productName: 'Chicken Breast Skinless Frozen (อกไก่ลอกหนังแช่แข็ง)',
    category: 'Raw Meat',
    deptCode: 'RM',
    uom: 'กก.',
    kgPerBag: 2.5,
    kgPerUnit: 2.5,
    storageType: 'Frozen',
    temperature: '-18°C',
    shelfLife: '365 Days',
    standardPrice: 95,
    active: true
  },

  // RTC - Ready to Cook
  {
    itemCode: 'SKU-RTC-001',
    productName: 'Marinated Teriyaki Pork Skewers (หมูหมักซอสเทอริยากิเสียบไม้)',
    category: 'Ready to Cook',
    deptCode: 'RTC',
    uom: 'กล่อง',
    kgPerBag: 2.0,
    kgPerUnit: 2.0,
    storageType: 'Frozen',
    temperature: '-18°C',
    shelfLife: '180 Days',
    standardPrice: 340,
    active: true
  },
  {
    itemCode: 'SKU-RTC-002',
    productName: 'Spicy Tom Yum Marinated Chicken Wings (ปีกไก่หมักต้มยำพร้อมปรุง)',
    category: 'Ready to Cook',
    deptCode: 'RTC',
    uom: 'กล่อง',
    kgPerBag: 1.5,
    kgPerUnit: 1.5,
    storageType: 'Chilled',
    temperature: '0°C to 4°C',
    shelfLife: '14 Days',
    standardPrice: 210,
    active: true
  },

  // RTE - Ready to Eat
  {
    itemCode: 'SKU-RTE-001',
    productName: 'Smoked Bacon Strips Fully Cooked (เบคอนรมควันสุกพร้อมทาน)',
    category: 'Ready to Eat',
    deptCode: 'RTE',
    uom: 'แพ็ค',
    kgPerBag: 0.5,
    kgPerUnit: 0.5,
    storageType: 'Chilled',
    temperature: '0°C to 4°C',
    shelfLife: '45 Days',
    standardPrice: 165,
    active: true
  },
  {
    itemCode: 'SKU-RTE-002',
    productName: 'German Bratwurst Sausage (ไส้กรอกเยอรมันบราทเวิร์สต์)',
    category: 'Ready to Eat',
    deptCode: 'RTE',
    uom: 'แพ็ค',
    kgPerBag: 1.0,
    kgPerUnit: 1.0,
    storageType: 'Chilled',
    temperature: '0°C to 4°C',
    shelfLife: '30 Days',
    standardPrice: 280,
    active: true
  },

  // BEV - Beverage
  {
    itemCode: 'SKU-BEV-001',
    productName: 'Cold Brew Citrus Tea Syrup Base (หัวเชื้อชาส้มโคลด์บรูว์)',
    category: 'Beverage',
    deptCode: 'BEV',
    uom: 'ขวด',
    kgPerBag: 1.2,
    kgPerUnit: 1.2,
    storageType: 'Ambient',
    temperature: 'Room Temp (25°C)',
    shelfLife: '180 Days',
    standardPrice: 190,
    active: true
  },

  // BAK - Bakery
  {
    itemCode: 'SKU-BAK-001',
    productName: 'Frozen Butter Croissant Dough 60g (แป้งครัวซองต์เนยฝรั่งเศสแช่แข็ง)',
    category: 'Bakery',
    deptCode: 'BAK',
    uom: 'กล่อง',
    kgPerBag: 3.0,
    kgPerUnit: 3.0,
    storageType: 'Frozen',
    temperature: '-18°C',
    shelfLife: '180 Days',
    standardPrice: 420,
    active: true
  },

  // SEA - Seasoning & Sauce
  {
    itemCode: 'SKU-SEA-001',
    productName: 'Signature Roasted Sesame Salad Dressing (น้ำสลัดงาคั่วสูตรพรีเมียม)',
    category: 'Seasoning & Sauce',
    deptCode: 'SEA',
    uom: 'แกลลอน',
    kgPerBag: 3.8,
    kgPerUnit: 3.8,
    storageType: 'Ambient',
    temperature: 'Room Temp (25°C)',
    shelfLife: '240 Days',
    standardPrice: 550,
    active: true
  }
];

export const SLA_THRESHOLDS = {
  LOGISTIC_PRECHECK: { minutes: 60, name: 'Logistic Pre-check' },
  APPROVAL: { minutes: 120, name: 'Sale Manager Approval' },
  RD_PREPARATION: { minutes: 240, name: 'RD Sample Preparation' },
  CO_SALE_SO: { minutes: 60, name: 'Co-Sale SO Creation' },
  VEHICLE_ASSIGNMENT: { minutes: 60, name: 'Vehicle & Driver Assignment' },
  DELIVERY: { minutes: 180, name: 'Sample Delivery & POD' },
};
