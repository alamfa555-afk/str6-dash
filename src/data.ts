import { InventoryItem, IssueTransaction, ReceiveTransaction } from './types';

export const INITIAL_ITEMS: InventoryItem[] = [
  {
    id: 'item-1',
    itemCode: 'INV-1001',
    description: 'LED Bulb 9W Syska',
    unit: 'pcs',
    initialQty: 100,
    pricePerUnit: 85,
    department: 'Electrical',
    remark: 'Main Store A-1 Rack',
    createdAt: '2026-06-01T10:00:00.000Z',
    damagedQty: 3,
    rejectedQty: 1,
    expiredQty: 0,
    supplierName: 'Ajanta Steel Corp',
    supplierContact: '+91 94433-22110'
  },
  {
    id: 'item-2',
    itemCode: 'INV-1002',
    description: 'Copper Wire 1.5 SQ mm',
    unit: 'roll',
    initialQty: 25,
    pricePerUnit: 1240,
    department: 'Electrical',
    remark: 'Shelf B-3',
    createdAt: '2026-06-01T10:15:00.000Z',
    damagedQty: 0,
    rejectedQty: 2,
    expiredQty: 0,
    supplierName: 'Polycab Cables Ltd',
    supplierContact: '+91 91100-22334'
  },
  {
    id: 'item-3',
    itemCode: 'INV-1003',
    description: 'PVC Conduit Pipe 25mm',
    unit: 'mtr',
    initialQty: 150,
    pricePerUnit: 12,
    department: 'Plumbing',
    remark: 'Yard Pile 2',
    createdAt: '2026-06-01T10:30:00.000Z',
    supplierName: 'Ajanta Steel Corp',
    supplierContact: '+91 94433-22110'
  },
  {
    id: 'item-4',
    itemCode: 'INV-1004',
    description: 'Submersible Pump 2HP',
    unit: 'box',
    initialQty: 12,
    pricePerUnit: 14500,
    department: 'Machinery',
    remark: 'Heavy Items Area',
    createdAt: '2026-06-02T11:00:00.000Z',
    supplierName: 'UltraTech Supply',
    supplierContact: '+91 98888-77766'
  },
  {
    id: 'item-5',
    itemCode: 'INV-1005',
    description: 'Grease Super-Lube Heavy Duty',
    unit: 'kg',
    initialQty: 8,
    pricePerUnit: 340,
    department: 'Tools',
    remark: 'Chemical Cabinet C-1 (Low Stock Demo)',
    createdAt: '2026-06-02T12:00:00.000Z',
    damagedQty: 0,
    rejectedQty: 0,
    expiredQty: 1,
    supplierName: 'UltraTech Supply',
    supplierContact: '+91 98888-77766'
  },
  {
    id: 'item-6',
    itemCode: 'INV-1006',
    description: 'Acrylic Partition Protection Sheet',
    unit: 'sheet',
    initialQty: 30,
    pricePerUnit: 450,
    department: 'Civil',
    remark: 'Rack C-4',
    createdAt: '2026-06-03T09:00:00.000Z',
    supplierName: 'Ajanta Steel Corp',
    supplierContact: '+91 94433-22110'
  },
  {
    id: 'item-7',
    itemCode: 'INV-1007',
    description: 'Engine Oil 15W-40 Max',
    unit: 'ltr',
    initialQty: 0,
    pricePerUnit: 280,
    department: 'Machinery',
    remark: 'Out of Stock Demo',
    createdAt: '2026-06-03T10:00:00.000Z',
    supplierName: 'UltraTech Supply',
    supplierContact: '+91 98888-77766'
  }
];

export const INITIAL_ISSUES: IssueTransaction[] = [
  {
    id: 'issue-1',
    itemCode: 'INV-1001',
    issuedTo: 'Rajesh Kumar (Electrician)',
    quantity: 15,
    department: 'Electrical',
    issuedAt: '2026-06-12T14:30:00.000Z',
    issuedByName: 'Amit Sharma',
    issuedById: 'ST-082',
    remark: 'Issued for B-Block wiring assembly',
    warehouse: 'Main Warehouse'
  },
  {
    id: 'issue-2',
    itemCode: 'INV-1002',
    issuedTo: 'Virendra Patel (Contractor)',
    quantity: 2,
    department: 'Electrical',
    issuedAt: '2026-06-15T11:00:00.000Z',
    issuedByName: 'Amit Sharma',
    issuedById: 'ST-082',
    remark: 'Urgent expansion request',
    warehouse: 'Main Warehouse'
  },
  {
    id: 'issue-3',
    itemCode: 'INV-1003',
    issuedTo: 'Suresh Pal (Plumber)',
    quantity: 40,
    department: 'Plumbing',
    issuedAt: '2026-06-18T16:15:00.000Z',
    issuedByName: 'Kunal Verma',
    issuedById: 'ST-104',
    remark: 'Ground water routing phase 1',
    warehouse: 'Main Warehouse'
  }
];

export const INITIAL_RECEIVES: ReceiveTransaction[] = [
  {
    id: 'rec-1',
    itemCode: 'INV-1001',
    quantity: 20,
    receivedAt: '2026-06-10T09:00:00.000Z',
    receivedByName: 'Amit Sharma',
    receivedById: 'ST-082',
    remark: 'Vendor supplier refilled',
    warehouse: 'Main Warehouse'
  }
];
