import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, Save, Send, Plus, Trash2, Lock, Unlock, 
  RotateCcw, CheckCircle2, AlertCircle, Sparkles, Building2,
  Calendar, Clock, Truck, ShieldAlert, Check, Copy, ArrowUp, ArrowDown,
  Search, Package, Layers, Info, DollarSign, X, CheckSquare, Square,
  HelpCircle, ChevronDown, ChevronRight, FileCheck, Warehouse
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router';
import { CUSTOMER_LIST, PRODUCT_LIST, DOCUMENT_TYPE_MASTER, DEPOT_LIST } from '../lib/masterData';
import { useRequests } from '../contexts/RequestContext';
import { useAuth } from '../contexts/AuthContext';
import * as sheetService from '../services/sheetService';
import { CustomerMaster, ProductMaster, DocumentRequirementItem, SampleLine } from '../types';

export function CreateSample() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getNextSampleNo, createRequest, rdDepartments, customers: ctxCustomers, products: ctxProducts } = useRequests();
  const location = useLocation();

  // Reset form to blank defaults on visiting /sample/new
  useEffect(() => {
    if (location.pathname === '/sample/new') {
      setCustomerCode('');
      setCustomerName('');
      setCustomerGroup('');
      setSalesChannel('');
      setContactName('');
      setContactPhone('');
      setContactEmail('');
      setShipToCode('');
      setDeliveryAddress('');
      setDistrict('');
      setProvince('');
      setRoute('');
      setDepot('');
      setSampleType('');
      setSamplePurpose('');
      setPurposeDetail('');
      setPriority('NORMAL');
      setDepartment('');
      setLines([
        {
          id: 1,
          itemCode: '',
          productName: '',
          category: '',
          storageType: '',
          kgPerBag: 0,
          bagQty: 0,
          requestQty: 0,
          uom: '',
          price: 0,
          value: 0,
          refCode: '',
          remark: '',
          stockDeduction: 'DEDUCT'
        }
      ]);
    }
  }, [location.pathname, location.key]);

  // ==========================================
  // 1. RD DEPARTMENT & SAMPLE NUMBER STATE
  // ==========================================
  const [department, setDepartment] = useState('');
  const [sampleNo, setSampleNo] = useState('');
  const [revision, setRevision] = useState('REV.00');
  const [isSampleNoLocked, setIsSampleNoLocked] = useState(true);
  const [isManualOverride, setIsManualOverride] = useState(false);

  // Dynamic Master Data mapping
  const dynamicCustomers = useMemo(() => {
    if (!ctxCustomers || ctxCustomers.length === 0) return [];
    return ctxCustomers.map((c: any) => ({
      customerCode: c.Customer_Code || '',
      customerName: c.Customer_Name || '',
      customerGroup: c.Customer_Group || '',
      salesChannel: c.Sales_Channel || '',
      saleOwner: c.Sale_Owner || '',
      contactName: c.Contact_Name || '',
      contactPhone: c.Contact_Phone || '',
      contactEmail: c.Contact_Email || '',
      shipToCode: c.Ship_To_Code || '',
      deliveryAddress: c.Delivery_Address || '',
      district: c.District || '',
      province: c.Province || '',
      defaultRoute: c.Default_Route || '',
      defaultDepot: c.Default_Depot || '',
      defaultDeliveryTime: c.Default_Delivery_Time || '',
      defaultDocuments: c.Default_Documents || '',
      active: c.Active === 'TRUE' || c.Active === true
    }));
  }, [ctxCustomers]);

  const dynamicProducts = useMemo(() => {
    if (!ctxProducts || ctxProducts.length === 0) return [];
    return ctxProducts.map((p: any) => ({
      itemCode: p.Item_Code || '',
      productName: p.Product_Name || '',
      category: p.Category || '',
      deptCode: p.Product_Type || '',
      uom: p.UOM || '',
      kgPerBag: Number(p.Kg_Per_Bag) || 0,
      kgPerUnit: Number(p.Kg_Per_Unit) || 0,
      storageType: p.Storage_Type || '',
      temperature: p.Temperature || '',
      shelfLife: p.Shelf_Life || '',
      standardPrice: Number(p.Standard_Price) || 0,
      active: p.Active === 'TRUE' || p.Active === true
    }));
  }, [ctxProducts]);

  // Sync initial department if RM isn't found
  useEffect(() => {
    if (department && rdDepartments.length > 0 && !rdDepartments.some(d => d.RD_Department_Code === department)) {
      setDepartment(rdDepartments[0].RD_Department_Code);
    }
  }, [rdDepartments, department]);

  // Regenerate auto sample number when department changes (if not manual)
  useEffect(() => {
    if (!isManualOverride) {
      const generated = getNextSampleNo(department);
      setSampleNo(generated);
    }
  }, [department, isManualOverride, getNextSampleNo]);

  // ==========================================
  // 2. CUSTOMER SECTION STATE (PART 54)
  // ==========================================
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  
  const [customerCode, setCustomerCode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerGroup, setCustomerGroup] = useState('');
  const [salesChannel, setSalesChannel] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [shipToCode, setShipToCode] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [province, setProvince] = useState('');
  const [route, setRoute] = useState('');
  const [depot, setDepot] = useState('');

  const [sampleType, setSampleType] = useState('');
  const [samplePurpose, setSamplePurpose] = useState('');
  const [purposeDetail, setPurposeDetail] = useState('');
  const [priority, setPriority] = useState<'NORMAL' | 'URGENT' | 'HIGH'>('NORMAL');

  // Filtered customers for search
  const filteredCustomers = useMemo(() => {
    const list = dynamicCustomers.length > 0 ? dynamicCustomers : CUSTOMER_LIST;
    if (!customerSearchQuery.trim()) return list;
    const q = customerSearchQuery.toLowerCase();
    return list.filter(c => 
      c.customerCode.toLowerCase().includes(q) ||
      c.customerName.toLowerCase().includes(q) ||
      c.customerGroup.toLowerCase().includes(q) ||
      c.contactName.toLowerCase().includes(q)
    );
  }, [customerSearchQuery, dynamicCustomers]);

  const handleSelectCustomer = (cust: CustomerMaster) => {
    setCustomerCode(cust.customerCode);
    setCustomerName(cust.customerName);
    setCustomerGroup(cust.customerGroup);
    setSalesChannel(cust.salesChannel || 'Modern Trade');
    setContactName(cust.contactName);
    setContactPhone(cust.contactPhone);
    setContactEmail(cust.contactEmail);
    setShipToCode(cust.shipToCode);
    setDeliveryAddress(cust.deliveryAddress);
    setDistrict(cust.district);
    setProvince(cust.province);
    setRoute(cust.defaultRoute);
    if (cust.defaultDepot) setDepot(cust.defaultDepot);
    setIsCustomerDropdownOpen(false);
    setCustomerSearchQuery('');
  };

  // ==========================================
  // 3. PRODUCT SECTION STATE (PART 55)
  // ==========================================
  const [lines, setLines] = useState<SampleLine[]>([
    {
      id: 1,
      itemCode: '',
      productName: '',
      category: '',
      storageType: '',
      kgPerBag: 0,
      bagQty: 0,
      requestQty: 0,
      uom: '',
      price: 0,
      value: 0,
      refCode: '',
      remark: '',
      stockDeduction: 'DEDUCT'
    }
  ]);

  // Product Search UI State
  const [activeSearchLineId, setActiveSearchLineId] = useState<string | number | null>(null);
  const [productSearchQuery, setProductSearchQuery] = useState('');

  const currentProductList = useMemo(() => {
    return dynamicProducts.length > 0 ? dynamicProducts : PRODUCT_LIST;
  }, [dynamicProducts]);

  const filteredProducts = useMemo(() => {
    if (!productSearchQuery.trim()) return currentProductList;
    const q = productSearchQuery.toLowerCase();
    return currentProductList.filter(p => 
      p.itemCode.toLowerCase().includes(q) ||
      p.productName.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }, [productSearchQuery, currentProductList]);

  const handleProductSelect = (lineId: string | number, itemCode: string) => {
    if (!itemCode) {
      setLines(prev => prev.map(line => {
        if (line.id === lineId) {
          return {
            ...line,
            itemCode: '',
            productName: '',
            category: '',
            storageType: '',
            kgPerBag: 0,
            bagQty: 0,
            requestQty: 0,
            uom: '',
            price: 0,
            value: 0,
            refCode: ''
          };
        }
        return line;
      }));
      return;
    }
    const prod = currentProductList.find(p => p.itemCode === itemCode);
    if (!prod) return;

    setLines(prev => prev.map(line => {
      if (line.id === lineId) {
        const kgPerBag = prod.kgPerBag || prod.kgPerUnit || 1;
        const bagQty = line.bagQty || 1;
        const requestQty = kgPerBag * bagQty;
        const price = prod.standardPrice || 0;
        const value = requestQty * price;

        return {
          ...line,
          itemCode: prod.itemCode,
          productName: prod.productName,
          category: prod.category,
          storageType: prod.storageType,
          kgPerBag,
          bagQty,
          requestQty,
          uom: prod.uom,
          price,
          value,
          refCode: line.refCode || `REF-${prod.itemCode.split('-')[1] || 'SKU'}`
        };
      }
      return line;
    }));

    // Auto update department if single item or user didn't lock
    if (prod.deptCode && !isManualOverride) {
      setDepartment(prod.deptCode);
    }
    setActiveSearchLineId(null);
    setProductSearchQuery('');
  };

  const handleItemCodeChange = (lineId: string | number, code: string) => {
    const cleanCode = code.trim().toUpperCase();
    
    // Update the item code field immediately for typing feel
    setLines(prev => prev.map(line => {
      if (line.id === lineId) {
        return { ...line, itemCode: cleanCode };
      }
      return line;
    }));

    // If matches a product exactly, trigger selection
    const prod = currentProductList.find(p => p.itemCode.toUpperCase() === cleanCode);
    if (prod) {
      handleProductSelect(lineId, prod.itemCode);
    }
  };

  const handleKgPerBagChange = (lineId: string | number, valStr: string) => {
    const kgPerBag = parseFloat(valStr) || 0;
    setLines(prev => prev.map(line => {
      if (line.id === lineId) {
        const bagQty = line.bagQty || 1;
        const requestQty = kgPerBag * bagQty;
        const value = requestQty * (line.price || 0);
        return { ...line, kgPerBag, requestQty, value };
      }
      return line;
    }));
  };

  const handleBagQtyChange = (lineId: string | number, valStr: string) => {
    const bagQty = parseFloat(valStr) || 0;
    setLines(prev => prev.map(line => {
      if (line.id === lineId) {
        const kgPerBag = line.kgPerBag || 1;
        const requestQty = kgPerBag * bagQty;
        const value = requestQty * (line.price || 0);
        return { ...line, bagQty, requestQty, value };
      }
      return line;
    }));
  };

  const handleManualKgChange = (lineId: string | number, valStr: string) => {
    const requestQty = parseFloat(valStr) || 0;
    setLines(prev => prev.map(line => {
      if (line.id === lineId) {
        const value = requestQty * (line.price || 0);
        return { ...line, requestQty, value };
      }
      return line;
    }));
  };

  const handlePriceChange = (lineId: string | number, valStr: string) => {
    const price = parseFloat(valStr) || 0;
    setLines(prev => prev.map(line => {
      if (line.id === lineId) {
        const value = (line.requestQty || 0) * price;
        return { ...line, price, value };
      }
      return line;
    }));
  };

  const handleLineFieldChange = (lineId: string | number, field: keyof SampleLine, val: any) => {
    setLines(prev => prev.map(line => {
      if (line.id === lineId) {
        return { ...line, [field]: val };
      }
      return line;
    }));
  };

  const addLine = () => {
    const newLine: SampleLine = {
      id: Date.now(),
      itemCode: '',
      productName: '',
      category: '',
      storageType: '',
      kgPerBag: 0,
      bagQty: 0,
      requestQty: 0,
      uom: '',
      price: 0,
      value: 0,
      refCode: '',
      remark: '',
      stockDeduction: 'DEDUCT'
    };
    setLines(prev => [...prev, newLine]);
  };

  const duplicateLine = (lineId: string | number) => {
    const lineToDup = lines.find(l => l.id === lineId);
    if (!lineToDup) return;
    const newLine: SampleLine = {
      ...lineToDup,
      id: Date.now(),
      refCode: lineToDup.refCode ? `${lineToDup.refCode}-COPY` : '',
      remark: lineToDup.remark ? `${lineToDup.remark} (สำเนา)` : ''
    };
    setLines(prev => [...prev, newLine]);
  };

  const moveLine = (index: number, direction: 'UP' | 'DOWN') => {
    if (direction === 'UP' && index === 0) return;
    if (direction === 'DOWN' && index === lines.length - 1) return;
    const newLines = [...lines];
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    const temp = newLines[index];
    newLines[index] = newLines[targetIdx];
    newLines[targetIdx] = temp;
    setLines(newLines);
  };

  const removeLine = (id: string | number) => {
    if (lines.length > 1) {
      setLines(prev => prev.filter(l => l.id !== id));
    }
  };

  // Summary Computations
  const totalItems = lines.length;
  const totalWeightKg = useMemo(() => lines.reduce((acc, l) => acc + (Number(l.requestQty) || 0), 0), [lines]);
  const subtotal = useMemo(() => lines.reduce((acc, l) => acc + (Number(l.value) || 0), 0), [lines]);
  const vatAmount = useMemo(() => subtotal * 0.07, [subtotal]);
  const grandTotal = useMemo(() => subtotal + vatAmount, [subtotal, vatAmount]);

  // ==========================================
  // 4. DOCUMENT REQUIREMENT STATE (PART 56)
  // ==========================================
  const [docRequirements, setDocRequirements] = useState<DocumentRequirementItem[]>(() => {
    return DOCUMENT_TYPE_MASTER.map(d => ({
      docCode: d.docCode,
      docName: d.docName,
      required: d.isRequiredDefault,
      remark: d.isRequiredDefault ? 'ขอฉบับทางการแนบพร้อมสินค้า' : ''
    }));
  });

  const handleDocToggle = (docCode: string) => {
    setDocRequirements(prev => prev.map(item => {
      if (item.docCode === docCode) {
        const nextRequired = !item.required;
        return {
          ...item,
          required: nextRequired,
          remark: nextRequired && !item.remark ? 'แนบพร้อมสินค้าตัวอย่าง' : item.remark
        };
      }
      return item;
    }));
  };

  const handleDocRemarkChange = (docCode: string, remark: string) => {
    setDocRequirements(prev => prev.map(item => {
      if (item.docCode === docCode) {
        return { ...item, remark };
      }
      return item;
    }));
  };

  // ==========================================
  // 5. PREPARATION STATE (PART 57)
  // ==========================================
  const todayStr = new Date().toISOString().split('T')[0];
  const [preparationDate, setPreparationDate] = useState(todayStr);
  const [preparationDueTime, setPreparationDueTime] = useState('15:00');
  const [preparationRemark, setPreparationRemark] = useState('');

  // ==========================================
  // 6. DELIVERY STATE (PART 58)
  // ==========================================
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [deliveryDate, setDeliveryDate] = useState(tomorrowStr);
  const [deliveryTimeFrom, setDeliveryTimeFrom] = useState('10:00');
  const [deliveryTimeTo, setDeliveryTimeTo] = useState('12:00');
  const [temperature, setTemperature] = useState('Chilled (0°C to 4°C)');
  const [deliveryType, setDeliveryType] = useState('Direct to Customer');
  const [vehicleRequirement, setVehicleRequirement] = useState('รถควบคุมอุณหภูมิ 4 ล้อห้องเย็น (4W Chilled)');
  const [deliveryRemark, setDeliveryRemark] = useState('ต้องแลกบัตรเข้าคลังสินค้า ประตู 4 ติดต่อฝ่ายรับสินค้า');
  const [customerRequirement, setCustomerRequirement] = useState('');
  const [saleRemark, setSaleRemark] = useState('');

  // ==========================================
  // 7. FORM ACTIONS & VALIDATION (PART 59)
  // ==========================================
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    sections: { name: string; valid: boolean; errors: string[] }[];
  }>({ isValid: true, sections: [] });

  const runValidation = () => {
    const customerErrors: string[] = [];
    if (!customerCode) customerErrors.push('กรุณาระบุรหัสลูกค้า (Customer Code)');
    if (!customerName) customerErrors.push('กรุณาระบุชื่อลูกค้า (Customer Name)');
    if (!contactName) customerErrors.push('กรุณาระบุชื่อผู้ติดต่อ (Contact Name)');
    if (!contactPhone) customerErrors.push('กรุณาระบุเบอร์โทรศัพท์ผู้ติดต่อ (Phone)');

    const productErrors: string[] = [];
    if (lines.length === 0) productErrors.push('ต้องมีรายการสินค้าอย่างน้อย 1 รายการ');
    lines.forEach((l, idx) => {
      if (!l.itemCode) productErrors.push(`รายการที่ ${idx + 1}: กรุณาเลือกสินค้า`);
      if (!l.requestQty || l.requestQty <= 0) productErrors.push(`รายการที่ ${idx + 1}: จำนวนน้ำหนักรวม (KG) ต้องมากกว่า 0`);
      if (l.price === undefined || l.price < 0) productErrors.push(`รายการที่ ${idx + 1}: ราคาต่อหน่วยต้องไม่ติดลบ`);
    });

    const prepErrors: string[] = [];
    if (!department) prepErrors.push('กรุณาระบุแผนก RD');
    if (!preparationDate) prepErrors.push('กรุณาระบุวันที่จัดเตรียม');
    if (!preparationDueTime) prepErrors.push('กรุณาระบุเวลาเสร็จสิ้น');

    const deliveryErrors: string[] = [];
    if (!deliveryDate) deliveryErrors.push('กรุณาระบุวันที่ต้องการจัดส่ง (Requested Delivery Date)');
    if (!deliveryTimeFrom || !deliveryTimeTo) deliveryErrors.push('กรุณาระบุช่วงเวลาจัดส่ง (Time From - To)');
    if (!deliveryAddress.trim()) deliveryErrors.push('กรุณาระบุที่อยู่จัดส่งโดยละเอียด (Delivery Address)');
    if (!province.trim()) deliveryErrors.push('กรุณาระบุจังหวัด');

    const docErrors: string[] = [];
    const activeReqDocs = docRequirements.filter(d => d.required);
    if (activeReqDocs.length === 0) {
      docErrors.push('แนะนำให้เลือกเอกสารที่จำเป็นอย่างน้อย 1 รายการ (เช่น COA หรือ Spec Sheet)');
    }

    const sections = [
      { name: '1. ข้อมูลลูกค้า (Customer Section)', valid: customerErrors.length === 0, errors: customerErrors },
      { name: '2. รายการสินค้า (Product Line Items)', valid: productErrors.length === 0, errors: productErrors },
      { name: '3. เอกสารที่ต้องการ (Document Requirement)', valid: docErrors.length === 0, errors: docErrors },
      { name: '4. การจัดเตรียมตัวอย่าง (Preparation Section)', valid: prepErrors.length === 0, errors: prepErrors },
      { name: '5. ข้อมูลการจัดส่ง (Delivery Section)', valid: deliveryErrors.length === 0, errors: deliveryErrors }
    ];

    const isValid = sections.every(s => s.valid);
    setValidationResult({ isValid, sections });
    return { isValid, sections };
  };

  const handleValidateClick = () => {
    runValidation();
    setValidationModalOpen(true);
  };

  const resetToAutoSampleNo = () => {
    setIsManualOverride(false);
    setIsSampleNoLocked(true);
    const auto = getNextSampleNo(department);
    setSampleNo(auto);
  };

  // ==========================================
  // SAVE DRAFT WORKFLOW (PART 59)
  // 1. Validate RD Department
  // 2. Generate Sample Number
  // 3. Save Header
  // 4. Save Lines
  // 5. Revision = 00
  // 6. Audit Log
  // ==========================================
  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    try {
      // 1. Validate RD Department
      if (!department) {
        throw new Error('กรุณาระบุหน่วยงาน RD เพื่อสร้าง Running Number');
      }

      // 2. Generate/Validate Sample Number
      let finalNo = sampleNo.trim();
      if (!finalNo || !isManualOverride) {
        finalNo = getNextSampleNo(department);
        setSampleNo(finalNo);
      }

      const activeReqDocCodes = docRequirements.filter(d => d.required).map(d => d.docCode);

      // 3 & 4. Save Header & Lines
      const created = await createRequest({
        sampleNo: finalNo,
        department,
        customerCode,
        customerName,
        customerGroup,
        salesChannel,
        contactName,
        contactPhone,
        contactEmail,
        shipToCode,
        sampleType,
        samplePurpose,
        purposeDetail,
        priority,
        preparationDate,
        preparationDueTime,
        preparationRemark,
        deliveryDate,
        deliveryTimeFrom,
        deliveryTimeTo,
        deliveryAddress,
        district,
        province,
        depot,
        route,
        temperature,
        deliveryType,
        vehicleRequirement,
        deliveryRemark,
        requiredDocuments: activeReqDocCodes,
        documentRequirements: docRequirements,
        customerRequirement,
        saleRemark,
        lines: lines.map(l => ({
          itemCode: l.itemCode,
          productName: l.productName,
          category: l.category,
          storageType: l.storageType,
          kgPerBag: l.kgPerBag || 1,
          bagQty: l.bagQty || 1,
          requestQty: l.requestQty || 1,
          uom: l.uom,
          price: l.price || 0,
          value: l.value || 0,
          refCode: l.refCode || '',
          remark: l.remark || '',
          stockDeduction: l.stockDeduction || 'DEDUCT'
        })),
        isDraft: true
      });

      // 6. Central Audit Log
      await sheetService.writeAuditLog({
        User: user?.name || 'Sale Specialist',
        User_Email: user?.email || 'sale@company.com',
        Role: user?.role || 'SALE',
        Module: 'SAMPLE_HEADER',
        Sample_No: created.sampleNo,
        Action: 'SAVE_DRAFT',
        details: `Saved Draft Sample Request ${created.sampleNo} (${created.revision}) with ${lines.length} items. Total Weight: ${totalWeightKg.toFixed(2)} KG`
      }).catch(e => console.warn('Audit log write notice:', e.message));

      navigate(`/sample/${created.id}`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'เกิดข้อผิดพลาดในการบันทึกร่าง');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // SUBMIT WORKFLOW (PART 59)
  // 1. Validate Mandatory Data
  // 2. Create Logistic Precheck Task
  // 3. Status: WAITING_LOGISTIC_CHECK
  // 4. Send Auto Email
  // ==========================================
  const handleSubmit = async () => {
    const { isValid } = runValidation();
    if (!isValid) {
      setValidationModalOpen(true);
      return;
    }

    setIsSubmitting(true);
    try {
      let finalNo = sampleNo.trim();
      if (!finalNo || !isManualOverride) {
        finalNo = getNextSampleNo(department);
      }

      const activeReqDocCodes = docRequirements.filter(d => d.required).map(d => d.docCode);

      const created = await createRequest({
        sampleNo: finalNo,
        department,
        customerCode,
        customerName,
        customerGroup,
        salesChannel,
        contactName,
        contactPhone,
        contactEmail,
        shipToCode,
        sampleType,
        samplePurpose,
        purposeDetail,
        priority,
        preparationDate,
        preparationDueTime,
        preparationRemark,
        deliveryDate,
        deliveryTimeFrom,
        deliveryTimeTo,
        deliveryAddress,
        district,
        province,
        depot,
        route,
        temperature,
        deliveryType,
        vehicleRequirement,
        deliveryRemark,
        requiredDocuments: activeReqDocCodes,
        documentRequirements: docRequirements,
        customerRequirement,
        saleRemark,
        lines: lines.map(l => ({
          itemCode: l.itemCode,
          productName: l.productName,
          category: l.category,
          storageType: l.storageType,
          kgPerBag: l.kgPerBag || 1,
          bagQty: l.bagQty || 1,
          requestQty: l.requestQty || 1,
          uom: l.uom,
          price: l.price || 0,
          value: l.value || 0,
          refCode: l.refCode || '',
          remark: l.remark || '',
          stockDeduction: l.stockDeduction || 'DEDUCT'
        })),
        isDraft: false
      });

      // Send workflow email via service
      await sheetService.sendWorkflowEmail('SUBMITTED_FOR_PRECHECK', created.sampleNo, {
        customerName: created.customerName,
        deliveryDate: created.deliveryDate,
        deliveryTime: `${created.deliveryTimeFrom} - ${created.deliveryTimeTo}`,
        route: created.route,
        totalWeight: totalWeightKg
      }).catch(e => console.warn('Workflow email notice:', e.message));

      navigate(`/sample/${created.id}`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'เกิดข้อผิดพลาดในการส่งคำขอ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1300px] mx-auto w-full text-[var(--color-text-primary)] pb-28">
      {/* Top Breadcrumb & Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <nav className="text-[11px] text-[var(--color-text-secondary)] uppercase font-semibold flex items-center gap-2 mb-1">
            <Link to="/" className="hover:text-[var(--color-primary-blue)] transition-colors">Dashboard</Link>
            <span>/</span>
            <span className="text-[var(--color-text-primary)]">สร้างคำขอสินค้าตัวอย่าง</span>
          </nav>
          <div className="flex items-center gap-3">
            <h2 className="text-[22px] font-black text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="text-blue-600" size={24} />
              ใบขอตัวอย่างสินค้า (Sample Request Form)
            </h2>
            <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={11} /> System-Driven Workflow
            </span>
          </div>
        </div>

        {/* Quick Step Indicators */}
        <div className="flex items-center gap-2 text-xs font-semibold bg-white border border-slate-200 px-3 py-1.5 rounded-md shadow-xs">
          <span className="flex items-center gap-1 text-blue-700 font-bold">
            <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
            Sale Create
          </span>
          <ChevronRight size={14} className="text-slate-400" />
          <span className="text-slate-500">2. Logistic Pre-check</span>
          <ChevronRight size={14} className="text-slate-400" />
          <span className="text-slate-500">3. SM Approve</span>
          <ChevronRight size={14} className="text-slate-400" />
          <span className="text-slate-500">4. Dispatch</span>
        </div>
      </div>

      {/* Top Banner: Sequence & Department Control */}
      <div className="bg-white rounded-lg border border-slate-200/90 shadow-xs p-4.5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          {/* RD Department Selection */}
          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Layers size={13} className="text-blue-600" />
              หน่วยงาน RD (RD Department) *
            </label>
            <select 
              value={department} 
              onChange={e => setDepartment(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-md text-[13px] py-2 px-3 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              <option value="">-- เลือกฝ่าย RD (Select RD Dept) --</option>
              {rdDepartments.filter(d => d.Active).map(dept => (
                <option key={dept.RD_Department_Code} value={dept.RD_Department_Code}>
                  [{dept.RD_Department_Code}] {dept.Sample_No_Prefix} — {dept.RD_Department_Name_TH}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-500 mt-1 block">
              ใช้สำหรับออกเลข Sequence SRI Prefix และกระจาย Task ให้ทีม RD โดยตรง
            </span>
          </div>

          {/* Sample Number Display with Lock/Unlock Override */}
          <div className="md:col-span-8 bg-gradient-to-r from-blue-50/70 to-slate-50 border border-blue-100 rounded-lg p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-blue-950 uppercase tracking-wider">
                  หมายเลขเอกสาร (Sample Number) *
                </span>
                {isManualOverride ? (
                  <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-300">
                    แก้ไขด้วยตนเอง (Manual Override)
                  </span>
                ) : (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                    <Check size={11} /> ออกเลขอัตโนมัติ (Server Running Sequence)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isManualOverride && (
                  <button
                    type="button"
                    onClick={resetToAutoSampleNo}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw size={12} /> คืนค่าอัตโนมัติ
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsSampleNoLocked(!isSampleNoLocked);
                    if (isSampleNoLocked) setIsManualOverride(true);
                  }}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded border transition-all flex items-center gap-1.5 shadow-2xs ${
                    isSampleNoLocked 
                      ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100' 
                      : 'bg-amber-500 border-amber-600 text-white hover:bg-amber-600'
                  }`}
                >
                  {isSampleNoLocked ? <Lock size={12} /> : <Unlock size={12} />}
                  {isSampleNoLocked ? 'ปลดล็อคเพื่อแก้ไขเลข' : 'ล็อคหมายเลข'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="text" 
                value={sampleNo} 
                onChange={e => {
                  setSampleNo(e.target.value);
                  setIsManualOverride(true);
                }}
                readOnly={isSampleNoLocked}
                className={`w-full font-mono text-[16px] font-bold py-1.5 px-3 rounded border transition-colors ${
                  isSampleNoLocked 
                    ? 'bg-white/80 border-slate-200 text-blue-900 font-black cursor-not-allowed select-all' 
                    : 'bg-white border-amber-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500'
                }`}
                placeholder="SRI-RM001-2026 REV.00"
              />
              <span className="bg-slate-200 text-slate-700 font-mono font-bold text-xs px-2.5 py-2 rounded">
                {revision}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 1: CUSTOMER SECTION (PART 54)                         */}
      {/* ============================================================ */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              1
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-slate-900 flex items-center gap-2">
                <Building2 size={16} className="text-blue-600" />
                ข้อมูลลูกค้า (Customer Section)
              </h3>
              <p className="text-[11px] text-slate-500">
                ค้นหาและเลือกจาก CUSTOMER_MASTER เพื่อดึงข้อมูลที่อยู่, ช่องทางการขาย, และผู้ติดต่ออัตโนมัติ
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded">
            Auto-fill Connected
          </span>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* Customer Search & Select Bar */}
          <div className="relative">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              ค้นหาลูกค้า (Search Customer Master) *
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text"
                value={customerSearchQuery}
                onFocus={() => setIsCustomerDropdownOpen(true)}
                onChange={e => {
                  setCustomerSearchQuery(e.target.value);
                  setIsCustomerDropdownOpen(true);
                }}
                placeholder={`พิมพ์ค้นหารหัส หรือชื่อลูกค้า เช่น ${CUSTOMER_LIST[0].customerName}...`}
                className="w-full bg-white border border-slate-300 rounded-md text-[13px] py-2.5 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
              {customerSearchQuery && (
                <button 
                  type="button" 
                  onClick={() => setCustomerSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Dropdown Suggestions */}
            {isCustomerDropdownOpen && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-64 overflow-y-auto custom-scrollbar">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map(c => (
                    <div 
                      key={c.customerCode}
                      onClick={() => handleSelectCustomer(c)}
                      className={`p-3 border-b border-slate-100 hover:bg-blue-50/70 cursor-pointer transition-colors ${
                        c.customerCode === customerCode ? 'bg-blue-50/90 font-semibold' : ''
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900 text-xs">{c.customerCode} — {c.customerName}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">{c.salesChannel || c.customerGroup}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-3">
                        <span>ผู้ติดต่อ: {c.contactName} ({c.contactPhone})</span>
                        <span>•</span>
                        <span>สาย: {c.defaultRoute}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500">
                    ไม่พบข้อมูลลูกค้าที่ตรงกับคำค้นหา
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Auto-filled Customer Details Grid */}
          <div className="bg-slate-50/80 rounded-md border border-slate-200 p-4">
            <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-600" />
              รายละเอียดลูกค้าที่ถูกเติมข้อมูลอัตโนมัติ (Auto Filled Details)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Customer Code *
                </label>
                <input 
                  type="text" 
                  value={customerCode}
                  onChange={e => setCustomerCode(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded py-1.5 px-2.5 text-xs font-bold text-blue-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Customer Name *
                </label>
                <input 
                  type="text" 
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded py-1.5 px-2.5 text-xs font-bold text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Customer Group
                </label>
                <input 
                  type="text" 
                  value={customerGroup}
                  onChange={e => setCustomerGroup(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded py-1.5 px-2.5 text-xs font-medium text-slate-700 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Sales Channel (ช่องทางการขาย)
                </label>
                <input 
                  type="text" 
                  value={salesChannel}
                  onChange={e => setSalesChannel(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded py-1.5 px-2.5 text-xs font-medium text-slate-700 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Ship-To Code
                </label>
                <input 
                  type="text" 
                  value={shipToCode}
                  onChange={e => setShipToCode(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded py-1.5 px-2.5 text-xs font-mono font-medium text-slate-700 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Contact Person (ผู้ติดต่อ) *
                </label>
                <input 
                  type="text" 
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded py-1.5 px-2.5 text-xs font-medium text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Phone (เบอร์โทร) *
                </label>
                <input 
                  type="text" 
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded py-1.5 px-2.5 text-xs font-medium text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Contact Email
                </label>
                <input 
                  type="email" 
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded py-1.5 px-2.5 text-xs font-medium text-slate-700 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  District (เขต/อำเภอ) *
                </label>
                <input 
                  type="text" 
                  value={district}
                  onChange={e => setDistrict(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded py-1.5 px-2.5 text-xs font-medium text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Province (จังหวัด) *
                </label>
                <input 
                  type="text" 
                  value={province}
                  onChange={e => setProvince(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded py-1.5 px-2.5 text-xs font-medium text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="lg:col-span-4">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Delivery Address (สถานที่จัดส่ง) *
                </label>
                <textarea 
                  rows={2}
                  value={deliveryAddress}
                  onChange={e => setDeliveryAddress(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded py-1.5 px-2.5 text-xs font-medium text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* Purpose and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                ประเภทการขอ (Sample Type) *
              </label>
              <select 
                value={sampleType} 
                onChange={e => setSampleType(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md text-[13px] py-2 px-3 font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">-- เลือกประเภทการขอ (Select Sample Type) --</option>
                <option value="New Product Presentation">New Product Presentation</option>
                <option value="Quality Testing & Lab Trial">Quality Testing & Lab Trial</option>
                <option value="Cost Reduction Comparison">Cost Reduction Comparison</option>
                <option value="Exhibition & Showcase">Exhibition & Showcase</option>
                <option value="Special Event / Promotion">Special Event / Promotion</option>
                <option value="Other / Special Request">Other / Special Request</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                ระดับความสำคัญ (Priority) *
              </label>
              <select 
                value={priority} 
                onChange={e => setPriority(e.target.value as any)}
                className={`w-full border rounded-md text-[13px] py-2 px-3 font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none ${
                  priority === 'URGENT' ? 'bg-red-50 border-red-300 text-red-700' :
                  priority === 'HIGH' ? 'bg-amber-50 border-amber-300 text-amber-700' :
                  'bg-white border-slate-300 text-slate-800'
                }`}
              >
                <option value="NORMAL">NORMAL (ปกติ - ตามรอบจัดส่ง)</option>
                <option value="HIGH">HIGH (ด่วน - ส่งผลต่อยอดขาย)</option>
                <option value="URGENT">URGENT (ด่วนที่สุด - อนุมัติพิเศษ)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                วัตถุประสงค์โดยสรุป (Sample Purpose) *
              </label>
              <input 
                type="text" 
                value={samplePurpose} 
                onChange={e => setSamplePurpose(e.target.value)}
                placeholder="เช่น ทดสอบเนื้อสัมผัสและรสชาติในเมนูใหม่..."
                className="w-full bg-white border border-slate-300 rounded-md text-[13px] py-2 px-3 font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 2: PRODUCT SECTION (PART 55)                          */}
      {/* ============================================================ */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              2
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-slate-900 flex items-center gap-2">
                <Package size={16} className="text-blue-600" />
                รายการสินค้าตัวอย่าง (Product Section - Editable Table)
              </h3>
              <p className="text-[11px] text-slate-500">
                เลือกสินค้าจาก PRODUCT_MASTER เพื่อ Auto-fill สูตรคำนวณ: KG = (KG/Bag × Bag) และ ยอดเงิน = (KG × บาท/กก.)
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={addLine}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-md flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Plus size={14} /> เพิ่มรายการสินค้า (Add Product)
          </button>
        </div>

        {/* Product Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1150px]">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-2.5 px-2.5 w-12 text-center border-r border-slate-200">No.</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-32">Item Code</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-72">Product Name *</th>
                <th className="py-2.5 px-2.5 border-r border-slate-200 w-24 text-center">Type</th>
                <th className="py-2.5 px-2.5 border-r border-slate-200 w-20 text-center">Fz/Ch</th>
                <th className="py-2.5 px-2.5 border-r border-slate-200 w-20 text-right">KG/Bag</th>
                <th className="py-2.5 px-2.5 border-r border-slate-200 w-20 text-right">Bag</th>
                <th className="py-2.5 px-2.5 border-r border-slate-200 w-24 text-right bg-blue-50/50">KG (รวม) *</th>
                <th className="py-2.5 px-2.5 border-r border-slate-200 w-24 text-right">บาท/กก.</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-28 text-right bg-blue-50/50">ยอดเงิน (฿)</th>
                <th className="py-2.5 px-2.5 border-r border-slate-200 w-28">Ref Code</th>
                <th className="py-2.5 px-2.5 border-r border-slate-200 w-36">Stock Deduction</th>
                <th className="py-2.5 px-3 border-r border-slate-200">Note (หมายเหตุ)</th>
                <th className="py-2.5 px-2.5 w-24 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="text-[12px] divide-y divide-slate-200">
              {lines.map((line, idx) => (
                <tr key={line.id} className="hover:bg-blue-50/30 transition-colors">
                  {/* No & Order */}
                  <td className="py-2 px-2 text-center font-bold text-slate-500 border-r border-slate-200">
                    <div className="flex flex-col items-center gap-0.5">
                      <span>{idx + 1}</span>
                      <div className="flex items-center gap-0.5 opacity-60 hover:opacity-100">
                        <button 
                          type="button" 
                          onClick={() => moveLine(idx, 'UP')}
                          disabled={idx === 0}
                          className="text-slate-400 hover:text-blue-600 disabled:opacity-20"
                        >
                          <ArrowUp size={10} />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => moveLine(idx, 'DOWN')}
                          disabled={idx === lines.length - 1}
                          className="text-slate-400 hover:text-blue-600 disabled:opacity-20"
                        >
                          <ArrowDown size={10} />
                        </button>
                      </div>
                    </div>
                  </td>

                  {/* Item Code */}
                  <td className="py-2 px-2 border-r border-slate-200">
                    <input 
                      type="text"
                      value={line.itemCode}
                      onChange={e => handleItemCodeChange(line.id, e.target.value)}
                      placeholder="SKU-XXXX"
                      className="w-full bg-white border border-slate-200 rounded py-1 px-2 text-[12px] font-mono font-bold text-blue-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </td>

                  {/* Product Name (Searchable dropdown) */}
                  <td className="py-2 px-2.5 border-r border-slate-200 relative">
                    <div className="relative">
                      <div 
                        className="w-full bg-white border border-slate-200 rounded py-1 px-2 text-[12px] font-semibold text-slate-900 cursor-text flex items-center justify-between min-h-[30px]"
                        onClick={() => {
                          setActiveSearchLineId(line.id);
                          setProductSearchQuery(line.productName || '');
                        }}
                      >
                        <span className={line.productName ? 'text-slate-900' : 'text-slate-400 font-normal'}>
                          {line.productName || '-- เลือกสินค้า (Select Product) --'}
                        </span>
                        <ChevronDown size={14} className="text-slate-400" />
                      </div>

                      {activeSearchLineId === line.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setActiveSearchLineId(null)}
                          />
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-20 overflow-hidden min-w-[300px]">
                            <div className="p-2 border-b border-slate-100 bg-slate-50">
                              <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                <input
                                  type="text"
                                  autoFocus
                                  placeholder="พิมพ์ชื่อสินค้า หรือรหัสสินค้าเพื่อค้นหา..."
                                  value={productSearchQuery}
                                  onChange={(e) => setProductSearchQuery(e.target.value)}
                                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                              {filteredProducts.length > 0 ? (
                                filteredProducts.map(p => (
                                  <button
                                    key={p.itemCode}
                                    type="button"
                                    onClick={() => handleProductSelect(line.id, p.itemCode)}
                                    className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-none group"
                                  >
                                    <div className="flex flex-col">
                                      <span className="text-[11px] font-bold text-blue-700 group-hover:text-blue-800">{p.itemCode}</span>
                                      <span className="text-xs font-semibold text-slate-800">{p.productName}</span>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] text-slate-400">[{p.deptCode}]</span>
                                        <span className="text-[10px] bg-slate-100 px-1 rounded text-slate-500">{p.category}</span>
                                      </div>
                                    </div>
                                  </button>
                                ))
                              ) : (
                                <div className="p-4 text-center text-slate-500 text-xs italic">
                                  ไม่พบข้อมูลสินค้าที่ตรงกับการค้นหา
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </td>

                  {/* Type */}
                  <td className="py-2 px-2 text-center border-r border-slate-200">
                    <span className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded">
                      {line.category}
                    </span>
                  </td>

                  {/* Fz / Ch */}
                  <td className="py-2 px-2 text-center border-r border-slate-200">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      line.storageType === 'Frozen' ? 'bg-cyan-100 text-cyan-800' :
                      line.storageType === 'Chilled' ? 'bg-blue-100 text-blue-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {line.storageType === 'Frozen' ? 'FZ (-18°C)' : line.storageType === 'Chilled' ? 'CH (0-4°C)' : 'AMB'}
                    </span>
                  </td>

                  {/* KG / Bag */}
                  <td className="py-2 px-2 border-r border-slate-200">
                    <input 
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={line.kgPerBag || ''}
                      onChange={e => handleKgPerBagChange(line.id, e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded py-1 px-1.5 text-right font-medium text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </td>

                  {/* Bag */}
                  <td className="py-2 px-2 border-r border-slate-200">
                    <input 
                      type="number"
                      step="1"
                      min="1"
                      value={line.bagQty || ''}
                      onChange={e => handleBagQtyChange(line.id, e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded py-1 px-1.5 text-right font-medium text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </td>

                  {/* KG (Formula: Kg_Per_Bag * Bag_Qty or direct manual edit) */}
                  <td className="py-2 px-2 border-r border-slate-200 bg-blue-50/40">
                    <input 
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={line.requestQty || ''}
                      onChange={e => handleManualKgChange(line.id, e.target.value)}
                      className="w-full bg-white border border-blue-200 rounded py-1 px-1.5 text-right font-black text-blue-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </td>

                  {/* บาท/กก. (Unit Price) */}
                  <td className="py-2 px-2 border-r border-slate-200">
                    <input 
                      type="number"
                      step="1"
                      min="0"
                      value={line.price ?? ''}
                      onChange={e => handlePriceChange(line.id, e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded py-1 px-1.5 text-right font-medium text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </td>

                  {/* ยอดเงิน (Line Value) */}
                  <td className="py-2 px-3 border-r border-slate-200 text-right font-mono font-bold text-slate-900 bg-blue-50/40">
                    ฿{line.value ? line.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                  </td>

                  {/* Reference Code */}
                  <td className="py-2 px-2 border-r border-slate-200">
                    <input 
                      type="text"
                      value={line.refCode || ''}
                      onChange={e => handleLineFieldChange(line.id, 'refCode', e.target.value)}
                      placeholder="เช่น BARCODE / SKU"
                      className="w-full bg-white border border-slate-200 rounded py-1 px-1.5 text-xs font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </td>

                  {/* Stock Deduction */}
                  <td className="py-2 px-2 border-r border-slate-200">
                    <select 
                      value={line.stockDeduction}
                      onChange={e => handleLineFieldChange(line.id, 'stockDeduction', e.target.value as any)}
                      className="w-full bg-white border border-slate-200 rounded py-1 px-1.5 text-[11px] font-semibold text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="DEDUCT">ตัดสต็อกหลัก (FG)</option>
                      <option value="SAMPLE_STOCK">ตัดคลังตัวอย่าง (Sample)</option>
                      <option value="NO_DEDUCT">ไม่ตัดสต็อก (R&D Lab)</option>
                    </select>
                  </td>

                  {/* Note */}
                  <td className="py-2 px-2.5 border-r border-slate-200">
                    <input 
                      type="text"
                      value={line.remark || ''}
                      onChange={e => handleLineFieldChange(line.id, 'remark', e.target.value)}
                      placeholder="หมายเหตุเฉพาะรายการ..."
                      className="w-full bg-white border border-slate-200 rounded py-1 px-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </td>

                  {/* Action */}
                  <td className="py-2 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button 
                        type="button"
                        onClick={() => duplicateLine(line.id)}
                        className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="ทำสำเนาแถว (Duplicate)"
                      >
                        <Copy size={13} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => removeLine(line.id)}
                        disabled={lines.length <= 1}
                        className={`p-1 rounded transition-colors ${
                          lines.length > 1 
                            ? 'text-red-500 hover:bg-red-50 hover:text-red-700' 
                            : 'text-slate-300 cursor-not-allowed'
                        }`}
                        title="ลบแถว (Delete)"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Card (PART 55) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-6 text-xs text-slate-600">
              <div>
                <span className="font-semibold text-slate-500">จำนวนรายการ (Total Items):</span>{' '}
                <span className="font-bold text-slate-900 text-sm">{totalItems} รายการ</span>
              </div>
              <div className="w-px h-4 bg-slate-300" />
              <div>
                <span className="font-semibold text-slate-500">น้ำหนักรวม (Total Weight):</span>{' '}
                <span className="font-black text-blue-950 text-sm">{totalWeightKg.toFixed(2)} KG</span>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="flex items-center gap-4 bg-white border border-slate-200 px-4 py-2.5 rounded-lg shadow-2xs">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Subtotal (ก่อน VAT)</span>
                <span className="font-mono font-bold text-xs text-slate-800">
                  ฿{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="w-px h-6 bg-slate-200" />
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">VAT (7%)</span>
                <span className="font-mono font-medium text-xs text-slate-600">
                  ฿{vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="w-px h-6 bg-slate-200" />
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-blue-700 block">Grand Total (ยอดสุทธิ)</span>
                <span className="font-mono font-black text-base text-blue-900">
                  ฿{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 3: DOCUMENT REQUIREMENT (PART 56)                     */}
      {/* ============================================================ */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              3
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-slate-900 flex items-center gap-2">
                <FileCheck size={16} className="text-blue-600" />
                เอกสารที่ลูกค้าต้องการ (Document Requirement - Dynamic Master)
              </h3>
              <p className="text-[11px] text-slate-500">
                ดึงรายการประเภทเอกสารจาก DOCUMENT_TYPE_MASTER ไม่ Hard Code พร้อมระบุหมายเหตุสำหรับแต่ละฉบับ
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-600">
            เลือกแล้ว <span className="font-bold text-blue-700">{docRequirements.filter(d => d.required).length}</span> / {docRequirements.length} รายการ
          </span>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {docRequirements.map(doc => (
              <div 
                key={doc.docCode} 
                className={`p-3.5 rounded-lg border transition-all ${
                  doc.required 
                    ? 'bg-blue-50/50 border-blue-200 shadow-2xs' 
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <label 
                    onClick={() => handleDocToggle(doc.docCode)}
                    className="flex items-center gap-2.5 cursor-pointer select-none font-bold text-xs text-slate-900"
                  >
                    {doc.required ? (
                      <CheckSquare size={16} className="text-blue-600 shrink-0" />
                    ) : (
                      <Square size={16} className="text-slate-400 shrink-0" />
                    )}
                    <span>{doc.docName}</span>
                  </label>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    doc.required ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {doc.required ? 'Required' : 'Not Required'}
                  </span>
                </div>

                {doc.required && (
                  <div className="mt-2 pl-6">
                    <input 
                      type="text" 
                      value={doc.remark}
                      onChange={e => handleDocRemarkChange(doc.docCode, e.target.value)}
                      placeholder="ระบุหมายเหตุหรือข้อกำหนดเฉพาะสำหรับเอกสารนี้..."
                      className="w-full bg-white border border-blue-200 rounded px-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 4 & 5: PREPARATION & DELIVERY (PART 57 & PART 58)    */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PART 57: PREPARATION (การจัดเตรียมตัวอย่าง) */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              4
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-slate-900 flex items-center gap-2">
                <Layers size={16} className="text-blue-600" />
                การจัดเตรียมตัวอย่าง (Preparation Section)
              </h3>
              <p className="text-[11px] text-slate-500">
                กำหนดแผนก RD, วันที่ และเวลาที่ต้องเตรียมตัวอย่างแล้วเสร็จ
              </p>
            </div>
          </div>

          <div className="p-5 flex flex-col gap-4 flex-1">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                RD Department (หน่วยงาน RD ที่รับผิดชอบ) *
              </label>
              <select 
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md text-[13px] py-2 px-3 font-semibold text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">-- เลือกฝ่าย RD (Select RD Dept) --</option>
                {rdDepartments.filter(d => d.Active).map(dept => (
                  <option key={dept.RD_Department_Code} value={dept.RD_Department_Code}>
                    [{dept.RD_Department_Code}] {dept.Sample_No_Prefix} — {dept.RD_Department_Name_TH}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Calendar size={13} className="text-blue-600" />
                  Preparation Date *
                </label>
                <input 
                  type="date" 
                  value={preparationDate}
                  onChange={e => setPreparationDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md text-[13px] py-2 px-3 font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Clock size={13} className="text-blue-600" />
                  Due Time *
                </label>
                <input 
                  type="time" 
                  value={preparationDueTime}
                  onChange={e => setPreparationDueTime(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md text-[13px] py-2 px-3 font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Preparation Remark (คำแนะนำการจัดเตรียมสำหรับ RD)
              </label>
              <textarea 
                rows={3}
                value={preparationRemark}
                onChange={e => setPreparationRemark(e.target.value)}
                placeholder="ระบุสูตรเฉพาะ, วิธีบรรจุหีบห่อ, หรือข้อกำหนดการติดฉลาก sample..."
                className="w-full bg-white border border-slate-300 rounded-md text-[13px] py-2 px-3 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* PART 58: DELIVERY (ข้อมูลการจัดส่ง) */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
              5
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-slate-900 flex items-center gap-2">
                <Truck size={16} className="text-emerald-600" />
                ข้อมูลการจัดส่ง (Delivery Section)
              </h3>
              <p className="text-[11px] text-slate-500">
                ข้อมูลเงื่อนไขขนส่งสำหรับ Logistic Pre-check และจัดสรรสายรถ
              </p>
            </div>
          </div>

          <div className="p-5 flex flex-col gap-4 flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Delivery Date *
                </label>
                <input 
                  type="date" 
                  value={deliveryDate}
                  onChange={e => setDeliveryDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded py-1.5 px-2.5 text-xs font-bold text-blue-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Time From *
                </label>
                <input 
                  type="time" 
                  value={deliveryTimeFrom}
                  onChange={e => setDeliveryTimeFrom(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded py-1.5 px-2.5 text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Time To *
                </label>
                <input 
                  type="time" 
                  value={deliveryTimeTo}
                  onChange={e => setDeliveryTimeTo(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded py-1.5 px-2.5 text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded border border-slate-200">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Depot (คลังต้นทาง)
                </label>
                <input 
                  type="text" 
                  disabled
                  value="-- ฝ่ายโลจิสติกส์เป็นผู้กำหนด (Assigned by Logistics) --"
                  className="w-full bg-slate-100 border border-slate-200 text-slate-500 rounded py-1.5 px-2.5 text-[11px] font-medium cursor-not-allowed focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Route (สายการเดินรถ)
                </label>
                <input 
                  type="text" 
                  disabled
                  value="-- ฝ่ายโลจิสติกส์เป็นผู้กำหนด (Assigned by Logistics) --"
                  className="w-full bg-slate-100 border border-slate-200 text-slate-500 rounded py-1.5 px-2.5 text-[11px] font-medium cursor-not-allowed focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Temperature (อุณหภูมิ) *
                </label>
                <select 
                  value={temperature}
                  onChange={e => setTemperature(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded py-1.5 px-2 text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- เลือกอุณหภูมิ (Select Temp) --</option>
                  <option value="Chilled (0°C to 4°C)">Chilled (0°C to 4°C)</option>
                  <option value="Frozen (-18°C)">Frozen (-18°C)</option>
                  <option value="Ambient (Room Temp)">Ambient (Room Temp)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Delivery Type *
                </label>
                <select 
                  value={deliveryType}
                  onChange={e => setDeliveryType(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded py-1.5 px-2 text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- เลือกรูปแบบจัดส่ง (Select Type) --</option>
                  <option value="Direct to Customer">Direct to Customer</option>
                  <option value="Self Pick-up at Depot">Self Pick-up at Depot</option>
                  <option value="Third-Party Logistics (3PL)">Third-Party Logistics (3PL)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Vehicle Requirement
                </label>
                <select 
                  value={vehicleRequirement}
                  onChange={e => setVehicleRequirement(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded py-1.5 px-2 text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- เลือกรถที่ต้องการ (Select Vehicle) --</option>
                  <option value="รถควบคุมอุณหภูมิ 4 ล้อห้องเย็น (4W Chilled)">รถควบคุมอุณหภูมิ 4 ล้อห้องเย็น (4W Chilled)</option>
                  <option value="รถควบคุมอุณหภูมิ 4 ล้อแช่แข็ง (4W Frozen)">รถควบคุมอุณหภูมิ 4 ล้อแช่แข็ง (4W Frozen)</option>
                  <option value="รถ 6 ล้อตู้เย็น (6W Temp-Controlled)">รถ 6 ล้อตู้เย็น (6W Temp-Controlled)</option>
                  <option value="รถจักรยานยนต์พร้อมกล่องเก็บความเย็น">รถจักรยานยนต์พร้อมกล่องเก็บความเย็น</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Delivery Remark (หมายเหตุสำหรับฝ่ายขนส่ง)
              </label>
              <textarea 
                rows={2}
                value={deliveryRemark}
                onChange={e => setDeliveryRemark(e.target.value)}
                placeholder="เช่น ต้องแลกบัตรเข้าตึก, ส่งช่องโหลดสินค้า 3..."
                className="w-full bg-white border border-slate-300 rounded py-1.5 px-2.5 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none leading-relaxed"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 6: STICKY BOTTOM FORM ACTION BAR (PART 59)            */}
      {/* ============================================================ */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg px-4 sm:px-8 py-3.5">
        <div className="max-w-[1300px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              type="button"
              onClick={() => {
                if (confirm('คุณต้องการยกเลิกและกลับสู่ Dashboard หรือไม่? ข้อมูลที่ยังไม่บันทึกอาจสูญหาย')) {
                  navigate('/');
                }
              }}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-4 py-2 rounded-md text-xs font-bold transition-colors shadow-2xs"
            >
              ยกเลิก (Cancel)
            </button>
            <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500">
              <span>รวม: <strong className="text-slate-900">{totalItems}</strong> รายการ</span>
              <span>•</span>
              <span>น้ำหนัก: <strong className="text-blue-900">{totalWeightKg.toFixed(2)} KG</strong></span>
              <span>•</span>
              <span>ยอดรวม: <strong className="text-emerald-700 font-mono">฿{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Save Draft Button */}
            <button 
              type="button"
              onClick={handleSaveDraft}
              disabled={isSubmitting}
              className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 px-4 py-2 rounded-md text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Save size={14} className="text-slate-600" />
              บันทึกร่าง (Save Draft)
            </button>

            {/* Validate Button */}
            <button 
              type="button"
              onClick={handleValidateClick}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 px-4 py-2 rounded-md text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <CheckCircle2 size={14} className="text-emerald-600" />
              ตรวจสอบข้อมูล (Validate)
            </button>

            {/* Submit Button */}
            <button 
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md text-xs font-bold transition-colors flex items-center gap-2 shadow-sm"
            >
              <Send size={14} />
              {isSubmitting ? 'กำลังส่งเข้าระบบ...' : 'ส่งคำขอ (Submit)'}
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* VALIDATION SUMMARY MODAL (PART 59)                           */}
      {/* ============================================================ */}
      {validationModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className={`p-4 text-white flex justify-between items-center ${
              validationResult.isValid ? 'bg-emerald-600' : 'bg-red-600'
            }`}>
              <div className="flex items-center gap-2">
                {validationResult.isValid ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                <h4 className="font-bold text-sm">
                  {validationResult.isValid ? 'การตรวจสอบข้อมูลผ่าน 100%' : 'ผลการตรวจสอบข้อมูลฟอร์ม'}
                </h4>
              </div>
              <button 
                type="button" 
                onClick={() => setValidationModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 max-h-[70vh] overflow-y-auto custom-scrollbar flex flex-col gap-3">
              {validationResult.sections.map((sec, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded border ${
                    sec.valid ? 'bg-emerald-50/60 border-emerald-200' : 'bg-red-50/80 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span className={sec.valid ? 'text-emerald-900' : 'text-red-900'}>{sec.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      sec.valid ? 'bg-emerald-200 text-emerald-900' : 'bg-red-200 text-red-900'
                    }`}>
                      {sec.valid ? 'สมบูรณ์ (Passed)' : 'ต้องแก้ไข (Incomplete)'}
                    </span>
                  </div>

                  {!sec.valid && (
                    <ul className="list-disc list-inside text-[11px] text-red-700 space-y-0.5 mt-1.5">
                      {sec.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setValidationModalOpen(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold px-4 py-2 rounded"
              >
                ปิดหน้าต่าง
              </button>
              {validationResult.isValid && (
                <button
                  type="button"
                  onClick={() => {
                    setValidationModalOpen(false);
                    handleSubmit();
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-1.5"
                >
                  <Send size={13} /> ดำเนินการส่งคำขอทันที
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
