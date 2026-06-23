import React, { useState, useEffect } from 'react';
import { InventoryItem, ReceiveTransaction } from '../types';
import { X, Plus, Info, CheckCircle } from 'lucide-react';

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReceive: (transaction: Omit<ReceiveTransaction, 'id'> & { updateMaster?: boolean }) => void;
  items: InventoryItem[];
  warehouses: string[];
  onAddWarehouse?: (name: string) => Promise<void>;
}

export function ReceiveFormModal({ 
  isOpen, 
  onClose, 
  onReceive, 
  items,
  warehouses,
  onAddWarehouse
}: ReceiveModalProps) {
  const [selectedItemCode, setSelectedItemCode] = useState('');
  const [warehouse, setWarehouse] = useState('Main Warehouse');
  const [quantity, setQuantity] = useState<number>(0);
  const [receivedAt, setReceivedAt] = useState('');
  const [receivedByName, setReceivedByName] = useState('');
  const [receivedById, setReceivedById] = useState('');
  const [remark, setRemark] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Sourcing & dynamic pricing fields during refill
  const [supplierName, setSupplierName] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState<number>(0);
  const [updateMaster, setUpdateMaster] = useState(true);

  // Custom states for dynamic inline warehouse additions
  const [showAddWarehouseForm, setShowAddWarehouseForm] = useState(false);
  const [newWarehouseName, setNewWarehouseName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setWarehouse('Main Warehouse');
      if (items.length > 0) {
        const defaultItem = items[0];
        setSelectedItemCode(defaultItem.itemCode);
        setSupplierName(defaultItem.supplierName || '');
        setPricePerUnit(defaultItem.pricePerUnit || 0);
      } else {
        setSelectedItemCode('');
        setSupplierName('');
        setPricePerUnit(0);
      }
      setQuantity(0);

      const now = new Date();
      const tzOffset = now.getTimezoneOffset() * 60000;
      const localISOTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
      setReceivedAt(localISOTime);

      // Read default values from store/history
      const savedIssuerName = localStorage.getItem('last_issuer_name') || '';
      const savedIssuerId = localStorage.getItem('last_issuer_id') || '';
      setReceivedByName(savedIssuerName);
      setReceivedById(savedIssuerId);

      setRemark('');
      setErrorMsg('');
      setUpdateMaster(true);
      setShowAddWarehouseForm(false);
      setNewWarehouseName('');
    }
  }, [isOpen, items]);

  useEffect(() => {
    if (selectedItemCode) {
      const match = items.find(it => it.itemCode === selectedItemCode);
      if (match) {
        setSupplierName(match.supplierName || '');
        setPricePerUnit(match.pricePerUnit || 0);
      }
    }
  }, [selectedItemCode, items]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedItemCode) {
      setErrorMsg('Please select an item.');
      return;
    }

    if (!warehouse) {
      setErrorMsg('Please select a warehouse.');
      return;
    }

    if (quantity <= 0) {
      setErrorMsg('Added quantity must be greater than 0.');
      return;
    }

    if (!receivedByName.trim() || !receivedById.trim()) {
      setErrorMsg('Receiver details (Name & Employee ID) are required.');
      return;
    }

    onReceive({
      itemCode: selectedItemCode,
      quantity,
      receivedAt: new Date(receivedAt).toISOString(),
      receivedByName: receivedByName.trim(),
      receivedById: receivedById.trim(),
      remark: remark.trim() || undefined,
      supplierName: supplierName.trim() || undefined,
      pricePerUnit: pricePerUnit > 0 ? pricePerUnit : undefined,
      updateMaster,
      warehouse
    } as any);

    onClose();
  };

  const selectedItem = items.find((it) => it.itemCode === selectedItemCode);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div 
        id="receive-stock-modal"
        className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in-50 duration-200"
      >
        <div className="bg-slate-950/80 border-b border-white/5 px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Plus className="text-emerald-400" size={20} />
            <h3 className="font-bold text-slate-200">
              Add / Receive Supplier Stock
            </h3>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800/50 transition-colors animate-pulse"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold rounded-lg">
              ⚠️ {errorMsg}
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-slate-400 uppercase font-sans">Select Active Warehouse Location *</label>
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
                  className="flex-1 text-xs border border-slate-800 rounded-lg px-2.5 py-2.5 bg-slate-950 text-slate-100 font-semibold focus:border-semibold outline-none"
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
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-550 text-white font-bold text-xs rounded-lg transition-all"
                >
                  Save
                </button>
              </div>
            ) : (
              <select
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
                className="w-full text-sm border border-slate-800 rounded-lg px-3 py-2.5 bg-slate-950 font-extrabold text-amber-400 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {warehouses.map((wh) => (
                  <option 
                    key={wh} 
                    value={wh} 
                    className="bg-slate-950 text-slate-100 font-semibold"
                    style={{ color: '#fbbf24', backgroundColor: '#090d16' }}
                  >
                    🏬 {wh}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1 font-sans">Select Item *</label>
            <select
              value={selectedItemCode}
              onChange={(e) => setSelectedItemCode(e.target.value)}
              className="w-full text-sm border border-slate-800 rounded-lg px-3 py-2.5 bg-slate-950 font-bold text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              {items.map((it) => (
                <option 
                  key={it.id} 
                  value={it.itemCode} 
                  className="bg-slate-950 text-slate-200 font-semibold"
                  style={{ color: '#f8fafc', backgroundColor: '#090d16' }}
                >
                  [{it.itemCode}] {it.description} ({it.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">New Received Quantity *</label>
              <input 
                type="number" 
                min="1"
                value={quantity === 0 ? '' : quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full text-sm border border-slate-800 bg-slate-950 text-slate-100 font-bold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                placeholder="e.g. 50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Received Date & Time *</label>
              <input 
                type="datetime-local" 
                value={receivedAt}
                onChange={(e) => setReceivedAt(e.target.value)}
                className="w-full text-sm border border-slate-800 bg-slate-950 text-slate-200 font-semibold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Supplier & Price (With editable inputs) */}
          <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              🏢 Supplier & Pricing Details
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Supplier Name</label>
                <input 
                  type="text" 
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full text-sm border border-slate-800 bg-slate-950 text-slate-200 font-semibold rounded-lg px-3 py-1.5 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  placeholder="e.g. Durga Enterprises"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Purchase Price per Unit (SAR)</label>
                <input 
                  type="number" 
                  step="any"
                  min="0"
                  value={pricePerUnit === 0 ? '' : pricePerUnit}
                  onChange={(e) => setPricePerUnit(Number(e.target.value))}
                  className="w-full text-sm border border-slate-800 bg-slate-950 text-slate-200 font-semibold rounded-lg px-3 py-1.5 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  placeholder="e.g. 450"
                />
              </div>
            </div>
            
            <label className="flex items-center gap-2 cursor-pointer mt-1.5 pt-1.5 border-t border-white/5">
              <input 
                type="checkbox" 
                checked={updateMaster}
                onChange={(e) => setUpdateMaster(e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-emerald-500/20 h-4 w-4"
              />
              <span className="text-[11px] text-slate-400 font-medium select-none">
                Update master item details with this Supplier & Price
              </span>
            </label>
          </div>

          {/* Receiver Info */}
          <div className="bg-slate-950/40 p-4 rounded-xl space-y-3 border border-white/5 text-xs text-slate-300">
            <h4 className="font-bold text-slate-200 flex items-center gap-1">
              <Info size={13} className="text-slate-400" />
              Receiver Details (Received By)
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Receiver Name *</label>
                <input 
                  type="text" 
                  value={receivedByName}
                  onChange={(e) => setReceivedByName(e.target.value)}
                  className="w-full text-sm border border-slate-800 bg-slate-950 text-slate-200 font-semibold rounded-lg px-3 py-1.5 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  placeholder="e.g. Amit Sharma"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Receiver Employee ID *</label>
                <input 
                  type="text" 
                  value={receivedById}
                  onChange={(e) => setReceivedById(e.target.value)}
                  className="w-full text-sm border border-slate-800 bg-slate-950 text-slate-200 font-semibold rounded-lg px-3 py-1.5 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none font-mono"
                  placeholder="e.g. ST-082"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Vendor/Delivery Remark</label>
            <input 
              type="text" 
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="w-full text-sm border border-slate-800 bg-slate-950 text-slate-200 font-semibold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              placeholder="e.g. Vendor Supplier Invoice #V-2391"
            />
          </div>

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
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <CheckCircle size={15} />
              Add Stock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
