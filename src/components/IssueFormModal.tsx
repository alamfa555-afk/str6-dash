import React, { useState, useEffect } from 'react';
import { InventoryItem, IssueTransaction, ReceiveTransaction } from '../types';
import { X, ArrowDownRight, Info, AlertTriangle, CheckCircle, Plus } from 'lucide-react';

interface IssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIssue: (transaction: Omit<IssueTransaction, 'id'>) => void;
  items: InventoryItem[];
  getCurrentStock: (itemCode: string, warehouseFilter?: string) => number;
  warehouses: string[];
  departments: string[];
  onAddWarehouse?: (name: string) => Promise<void>;
  onAddDepartment?: (name: string) => Promise<void>;
}

export function IssueFormModal({ 
  isOpen, 
  onClose, 
  onIssue, 
  items, 
  getCurrentStock,
  warehouses,
  departments,
  onAddWarehouse,
  onAddDepartment
}: IssueModalProps) {
  // Fields
  const [selectedItemCode, setSelectedItemCode] = useState('');
  const [warehouse, setWarehouse] = useState('Main Warehouse');
  const [issuedTo, setIssuedTo] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [issuedAt, setIssuedAt] = useState('');
  const [issuedByName, setIssuedByName] = useState('');
  const [issuedById, setIssuedById] = useState('');
  const [department, setDepartment] = useState('Civil');
  const [remark, setRemark] = useState('');
  
  // Custom tracking for newly added issue fields
  const [withdrawReceiptNo, setWithdrawReceiptNo] = useState('');
  const [mdrNo, setMdrNo] = useState('');

  // Inline additions
  const [showAddWarehouseForm, setShowAddWarehouseForm] = useState(false);
  const [newWarehouseName, setNewWarehouseName] = useState('');
  const [showAddDeptForm, setShowAddDeptForm] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');

  // Status controls
  const [errorMsg, setErrorMsg] = useState('');
  const [lowStockWarning, setLowStockWarning] = useState(false);

  // Initialize values when opened
  useEffect(() => {
    if (isOpen) {
      setWarehouse('Main Warehouse');
      // Pick first item by default if available
      if (items.length > 0) {
        setSelectedItemCode(items[0].itemCode);
      } else {
        setSelectedItemCode('');
      }
      setIssuedTo('');
      setQuantity(0);
      
      // Auto-set current local datetime in ISO-like format for input value (YYYY-MM-DDTHH:MM)
      const now = new Date();
      // Adjust timezone offset
      const tzOffset = now.getTimezoneOffset() * 60000;
      const localISOTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
      setIssuedAt(localISOTime);

      // Read default issuer from localStorage if previously stored
      const savedIssuerName = localStorage.getItem('last_issuer_name') || '';
      const savedIssuerId = localStorage.getItem('last_issuer_id') || '';
      setIssuedByName(savedIssuerName);
      setIssuedById(savedIssuerId);
      
      setRemark('');
      setErrorMsg('');
      setLowStockWarning(false);
      
      setWithdrawReceiptNo('');
      setMdrNo('');
      setShowAddWarehouseForm(false);
      setNewWarehouseName('');
      setShowAddDeptForm(false);
      setNewDeptName('');
    }
  }, [isOpen, items]);

  // Track dynamic stock changes based on selected item, selected warehouse or typed quantity
  const currentStock = selectedItemCode ? getCurrentStock(selectedItemCode, warehouse) : 0;
  const selectedItem = items.find((it) => it.itemCode === selectedItemCode);

  useEffect(() => {
    if (selectedItem) {
      setDepartment(selectedItem.department || 'Civil');
    }
  }, [selectedItemCode, items]);

  useEffect(() => {
    if (selectedItemCode && quantity > 0) {
      const remaining = currentStock - quantity;
      if (remaining >= 0 && remaining <= 10) {
        setLowStockWarning(true);
      } else {
        setLowStockWarning(false);
      }
    } else {
      setLowStockWarning(false);
    }
  }, [selectedItemCode, quantity, currentStock]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedItemCode) {
      setErrorMsg('Please select an item to issue.');
      return;
    }

    if (!warehouse) {
      setErrorMsg('Please select a warehouse to issue from.');
      return;
    }

    if (!issuedTo.trim()) {
      setErrorMsg('Receiver name (Issued To) is mandatory.');
      return;
    }

    if (quantity <= 0) {
      setErrorMsg('Issue quantity must be greater than 0.');
      return;
    }

    if (!issuedAt) {
      setErrorMsg('Date and Time value is mandatory.');
      return;
    }

    if (!issuedByName.trim() || !issuedById.trim()) {
      setErrorMsg('Issuer name and employee ID are required.');
      return;
    }

    // --- CRITICAL RULE: NOT IN STOCK VALIDATIONS ---
    if (currentStock <= 0) {
      setErrorMsg(`ERROR: This item is Out of Stock in ${warehouse}!`);
      return;
    }

    if (quantity > currentStock) {
      setErrorMsg(`ERROR: Not enough stock in ${warehouse}! Available: ${currentStock} ${selectedItem?.unit}`);
      return;
    }

    // Process Issuance
    onIssue({
      itemCode: selectedItemCode,
      issuedTo: issuedTo.trim(),
      quantity,
      department,
      issuedAt: new Date(issuedAt).toISOString(),
      issuedByName: issuedByName.trim(),
      issuedById: issuedById.trim(),
      remark: remark.trim() || undefined,
      warehouse,
      withdrawReceiptNo: withdrawReceiptNo.trim() || undefined,
      mdrNo: mdrNo.trim() || undefined,
    });

    // Save issuer details locally for user convenience on next transaction
    localStorage.setItem('last_issuer_name', issuedByName.trim());
    localStorage.setItem('last_issuer_id', issuedById.trim());

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div 
        id="issue-stock-modal"
        className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in-50 duration-200"
      >
        {/* Header */}
        <div className="bg-slate-950/80 border-b border-white/5 px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <ArrowDownRight className="text-red-400 font-bold" size={20} />
            <h3 className="font-bold text-slate-200">
              Issue Item / Stock Release Form
            </h3>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800/50 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 max-h-[75vh]">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-lg flex items-start gap-2 animate-bounce animate-duration-500">
              <span className="text-lg">❌</span>
              <div>
                <p className="font-bold uppercase tracking-wide text-red-300">Issue Denied!</p>
                <p className="mt-0.5 text-red-400">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Select Warehouse */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-slate-400 uppercase">Select Warehouse Location *</label>
              {onAddWarehouse && (
                <button
                  type="button"
                  onClick={() => setShowAddWarehouseForm(!showAddWarehouseForm)}
                  className="text-[10px] text-emerald-400 hover:text-emerald-350 font-extrabold flex items-center gap-0.5 focus:outline-none"
                >
                  <Plus size={10} strokeWidth={3} /> {showAddWarehouseForm ? "Cancel" : "Add New"}
                </button>
              )}
            </div>

            {showAddWarehouseForm ? (
              <div className="flex gap-1.5 animate-in fade-in duration-200">
                <input
                  type="text"
                  value={newWarehouseName}
                  onChange={(e) => setNewWarehouseName(e.target.value)}
                  placeholder="e.g. Yard C Warehouse"
                  className="flex-1 text-xs border border-slate-800 rounded-lg px-2.5 py-2.5 outline-none bg-slate-950 text-slate-105 font-semibold"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (newWarehouseName.trim() && onAddWarehouse) {
                      try {
                        await onAddWarehouse(newWarehouseName.trim());
                        setWarehouse(newWarehouseName.trim());
                        setNewWarehouseName('');
                        setShowAddWarehouseForm(false);
                      } catch (err) {
                        console.error("Failed to add warehouse:", err);
                      }
                    }
                  }}
                  className="px-3 py-2 bg-emerald-650 hover:bg-emerald-550 text-white font-bold text-xs rounded-lg transition-all"
                >
                  Save
                </button>
              </div>
            ) : (
              <select
                value={warehouse}
                onChange={(e) => {
                  setWarehouse(e.target.value);
                  setQuantity(0);
                }}
                className="w-full text-sm border border-slate-800 rounded-lg px-3 py-2.5 bg-slate-950 font-extrabold text-amber-400 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              >
                {warehouses.map((wh) => (
                  <option 
                    key={wh} 
                    value={wh} 
                    className="bg-slate-950 text-slate-101 font-semibold"
                    style={{ color: '#fbbf24', backgroundColor: '#090d16' }}
                  >
                    🏬 {wh}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Select Item */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Select Inventory Item *</label>
            <select
              value={selectedItemCode}
              onChange={(e) => {
                setSelectedItemCode(e.target.value);
                setQuantity(0);
              }}
              className="w-full text-sm border border-slate-800 rounded-lg px-3 py-2.5 bg-slate-950 font-bold text-slate-200 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            >
              {items.map((it) => {
                const stock = getCurrentStock(it.itemCode, warehouse);
                return (
                  <option 
                    key={it.id} 
                    value={it.itemCode} 
                    className="bg-slate-950 text-slate-200 font-semibold"
                    style={{ color: '#f8fafc', backgroundColor: '#090d16' }}
                  >
                    [{it.itemCode}] {it.description} — ({stock} {it.unit} {it.unit === 'pcs' || it.unit === 'box' ? 'In Stock' : 'available'})
                  </option>
                );
              })}
            </select>
            {selectedItem && (
              <div className="mt-1.5 flex justify-between items-center text-[10.5px] px-2 text-slate-400 bg-slate-950/50 py-1.5 rounded-md border border-white/5">
                <span>Unit Category: <strong className="text-slate-200">{selectedItem.unit.toUpperCase()}</strong></span>
                <span>Stock in {warehouse}: <strong className={currentStock <= 0 ? 'text-red-400 font-black' : currentStock <= 10 ? 'text-amber-400 font-black' : 'text-emerald-400 font-black'}>{currentStock} {selectedItem.unit}</strong></span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Quantity */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Quantity to Issue *</label>
              <input 
                type="number" 
                min="1"
                value={quantity === 0 ? '' : quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full text-sm border border-slate-800 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none font-bold bg-slate-950 text-slate-100"
                placeholder="Enter count"
              />
            </div>

            {/* When Issued */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Issue Date & Time *</label>
              <input 
                type="datetime-local" 
                value={issuedAt}
                onChange={(e) => setIssuedAt(e.target.value)}
                className="w-full text-sm border border-slate-800 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none bg-slate-950 text-slate-200 font-semibold"
              />
            </div>
          </div>

          {/* Low stock preview alert */}
          {lowStockWarning && selectedItem && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs rounded-lg flex gap-2 items-start">
              <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
              <div>
                <p className="font-bold text-amber-200">⚠️ Warning: Stock will reach Low Levels!</p>
                <p className="mt-0.5 text-[11px] text-amber-400">
                  Warning: remaining stock for <strong>{selectedItem.description}</strong> will drop to <strong>{currentStock - quantity} {selectedItem.unit}</strong> (Low Stock threshold of ≤ 10 units).
                </p>
              </div>
            </div>
          )}

          {/* Given To & Department Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Issued To / Receiver Name *</label>
              <input 
                type="text" 
                value={issuedTo}
                onChange={(e) => setIssuedTo(e.target.value)}
                className="w-full text-sm border border-slate-800 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none bg-slate-950 text-slate-100 font-semibold"
                placeholder="e.g. Rajesh Kumar (Electrician)"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-400 uppercase">Requesting Department *</label>
                {onAddDepartment && (
                  <button
                    type="button"
                    onClick={() => setShowAddDeptForm(!showAddDeptForm)}
                    className="text-[10px] text-emerald-400 hover:text-emerald-350 font-extrabold flex items-center gap-0.5 focus:outline-none"
                  >
                    <Plus size={10} strokeWidth={3} /> {showAddDeptForm ? "Cancel" : "Add New"}
                  </button>
                )}
              </div>

              {showAddDeptForm ? (
                <div className="flex gap-1.5 animate-in fade-in duration-200">
                  <input
                    type="text"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    placeholder="e.g. Mechanical"
                    className="flex-1 text-xs border border-slate-800 rounded-lg px-2.5 py-2.5 outline-none bg-slate-950 text-slate-100 font-semibold"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (newDeptName.trim() && onAddDepartment) {
                        try {
                          await onAddDepartment(newDeptName.trim());
                          setDepartment(newDeptName.trim());
                          setNewDeptName('');
                          setShowAddDeptForm(false);
                        } catch (err) {
                          console.error("Failed to add department:", err);
                        }
                      }
                    }}
                    className="px-3 py-2 bg-emerald-650 hover:bg-emerald-550 text-white font-bold text-xs rounded-lg transition-all"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full text-sm border border-slate-800 rounded-lg px-3 py-2.5 bg-slate-950 font-bold text-slate-205 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none animate-in fade-in duration-200"
                >
                  {departments.map((d) => (
                    <option 
                      key={d} 
                      value={d} 
                      className="bg-slate-950 text-slate-201 font-semibold"
                      style={{ color: '#f8fafc', backgroundColor: '#090d16' }}
                    >
                      🛠️ {d} Department
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Reference Document Identifiers */}
          <div className="bg-slate-950/30 p-4 rounded-xl space-y-3 border border-white/5 text-xs text-slate-300">
            <h4 className="font-bold text-slate-200 flex items-center gap-1">
              <span>📋 Transmittal Reference Numbers</span>
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Withdraw Receipt No.</label>
                <input 
                  type="text" 
                  value={withdrawReceiptNo}
                  onChange={(e) => setWithdrawReceiptNo(e.target.value)}
                  className="w-full text-sm border border-slate-800 bg-slate-950 text-slate-200 font-semibold rounded-lg px-3 py-1.5 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  placeholder="e.g. WR-8891"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">MDR No. (Materials Delivery Report)</label>
                <input 
                  type="text" 
                  value={mdrNo}
                  onChange={(e) => setMdrNo(e.target.value)}
                  className="w-full text-sm border border-slate-800 bg-slate-950 text-slate-200 font-semibold rounded-lg px-3 py-1.5 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none font-mono"
                  placeholder="e.g. MDR-4022"
                />
              </div>
            </div>
          </div>

          {/* Issue Coordinator Details */}
          <div className="bg-slate-950/40 p-4 rounded-xl space-y-3 border border-white/5 text-xs text-slate-300">
            <h4 className="font-bold text-slate-200 flex items-center gap-1">
              <Info size={13} className="text-slate-400" />
              Issuer Credentials (Released By)
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Issuer Name *</label>
                <input 
                  type="text" 
                  value={issuedByName}
                  onChange={(e) => setIssuedByName(e.target.value)}
                  className="w-full text-sm border border-slate-800 bg-slate-950 text-slate-200 font-semibold rounded-lg px-3 py-1.5 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none"
                  placeholder="e.g. Amit Sharma"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Issuer Employee ID *</label>
                <input 
                  type="text" 
                  value={issuedById}
                  onChange={(e) => setIssuedById(e.target.value)}
                  className="w-full text-sm border border-slate-800 bg-slate-950 text-slate-200 font-semibold rounded-lg px-3 py-1.5 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none font-mono"
                  placeholder="e.g. ST-082"
                />
              </div>
            </div>
          </div>

          {/* Optional remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Issue Remarks / Purpose</label>
            <input 
              type="text" 
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="w-full text-sm border border-slate-800 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none bg-slate-950 text-slate-100 font-semibold"
              placeholder="e.g. Worksite Floor-B wiring assembly phase"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-800 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-950 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={currentStock <= 0}
              className={`px-4 py-2 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all ${
                currentStock <= 0 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              <CheckCircle size={15} />
              Confirm Stock Issue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
