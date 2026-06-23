export type UnitType = 'kg' | 'pcs' | 'box' | 'ltr' | 'mtr' | 'roll' | 'sheet' | 'ho';

export interface InventoryItem {
  id: string;
  itemCode: string; // Unique Identifier, e.g., "INV-001"
  invNo?: string; // Invoice / Inventory Serial No.
  warehouse?: string; // Default Warehouse Location
  description: string;
  unit: UnitType;
  initialQty: number; // Opening stock quantity
  pricePerUnit: number;
  department: string; // e.g. "Civil", "Electrical", "Plumbing", "Tools", "Safety"
  remark: string;
  createdAt: string;
  damagedQty?: number;
  rejectedQty?: number;
  expiredQty?: number;
  supplierName?: string;
  supplierContact?: string;
}

export interface IssueTransaction {
  id: string;
  itemCode: string;
  issuedTo: string; // Receiver/Recipient details
  receiverIdType?: 'ID' | 'Mobile No';
  receiverIdValue?: string;
  quantity: number; // Issued quantity
  department: string; // Department receiving the item
  issuedAt: string; // Timestamp of issue (ISO date string)
  issuedByName: string; // Name of person issuing the stock
  issuedById: string; // Employee ID of person issuing the stock
  issuerTitle?: string; // Manager, Supervisor, Incharge, etc.
  remark?: string;
  warehouse?: string; // Multi-warehouse location
  withdrawReceiptNo?: string;
  mdrNo?: string;
}

export interface ReceiveTransaction {
  id: string;
  itemCode: string;
  quantity: number;
  receivedAt: string;
  receivedByName: string;
  receivedById: string;
  remark?: string;
  supplierName?: string;
  pricePerUnit?: number;
  warehouse?: string; // Multi-warehouse location
}

export interface DashboardStats {
  totalItems: number;
  totalStockValue: number;
  lowStockItemsCount: number;
  outOfStockItemsCount: number;
  totalIssuesToday: number;
}
