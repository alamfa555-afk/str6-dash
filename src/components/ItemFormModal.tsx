import React, { useState, useEffect } from 'react';
import { InventoryItem, UnitType } from '../types';
import { X, PlusCircle, CheckCircle, Plus, Trash2, UserPlus } from 'lucide-react';

interface ItemFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<InventoryItem, 'id' | 'createdAt'> & { id?: string }) => void;
  existingItem?: InventoryItem;
  allItems: InventoryItem[];
}

const UNITS: UnitType[] = ['kg', 'pcs', 'box', 'ltr', 'mtr', 'roll', 'sheet', 'ho'];

export function ItemFormModal({ isOpen, onClose, onSave, existingItem, allItems }: ItemFormProps) {
  const [itemCode, setItemCode] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState<UnitType>('pcs');
  const [qty, setQty] = useState<number>(0);
  const [price, setPrice] = useState<number>(0);
  const [department, setDepartment] = useState('Civil');
  const [remark, setRemark] = useState('');
  
  // Custom tracking for damage, reject, expired
  const [damagedQty, setDamagedQty] = useState<number>(0);
  const [rejectedQty, setRejectedQty] = useState<number>(0);
  const [expiredQty, setExpiredQty] = useState<number>(0);
  
  // Supplier fields
  const [supplierName, setSupplierName] = useState('');
  const [supplierContact, setSupplierContact] = useState('');

  // Dynamic supplier presets from localStorage
  const [customSuppliers, setCustomSuppliers] = useState<{name: string, contact: string}[]>([]);
  const [showAddSupplierForm, setShowAddSupplierForm] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierContact, setNewSupplierContact] = useState('');

  useEffect(() => {
    if (isOpen) {
      try {
        const stored = localStorage.getItem('ajanta_custom_suppliers_presets');
        if (stored) {
          setCustomSuppliers(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Error loading custom suppliers:', e);
      }
    }
  }, [isOpen]);

  const handleAddCustomSupplier = () => {
    if (!newSupplierName.trim()) return;
    const updated = [
      ...customSuppliers,
      { name: newSupplierName.trim(), contact: newSupplierContact.trim() }
    ];
    setCustomSuppliers(updated);
    try {
      localStorage.setItem('ajanta_custom_suppliers_presets', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    // Auto-select the newly added supplier!
    setSupplierName(newSupplierName.trim());
    setSupplierContact(newSupplierContact.trim());
    // Reset and close
    setNewSupplierName('');
    setNewSupplierContact('');
    setShowAddSupplierForm(false);
  };

  const handleRemoveCustomSupplier = (indexToRemove: number, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent selecting the supplier
    const updated = customSuppliers.filter((_, idx) => idx !== indexToRemove);
    setCustomSuppliers(updated);
    try {
      localStorage.setItem('ajanta_custom_suppliers_presets', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const [errorMsg, setErrorMsg] = useState('');

  // Populate form fields on edit
  useEffect(() => {
    if (existingItem) {
      setItemCode(existingItem.itemCode);
      setDescription(existingItem.description);
      setUnit(existingItem.unit);
      setQty(existingItem.initialQty);
      setPrice(existingItem.pricePerUnit);
      setDepartment(existingItem.department || 'Civil');
      setRemark(existingItem.remark);
      setDamagedQty(existingItem.damagedQty || 0);
      setRejectedQty(existingItem.rejectedQty || 0);
      setExpiredQty(existingItem.expiredQty || 0);
      setSupplierName(existingItem.supplierName || '');
      setSupplierContact(existingItem.supplierContact || '');
      setErrorMsg('');
    } else {
      // Clear fields for new item, auto-generate next code
      const nextNum = allItems.length + 1001;
      setItemCode(`INV-${nextNum}`);
      setDescription('');
      setUnit('pcs');
      setQty(0);
      setPrice(0);
      setDepartment('Civil');
      setRemark('');
      setDamagedQty(0);
      setRejectedQty(0);
      setExpiredQty(0);
      setSupplierName('');
      setSupplierContact('');
      setErrorMsg('');
    }
  }, [existingItem, isOpen, allItems]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validation
    const trimmedCode = itemCode.trim().toUpperCase();
    if (!trimmedCode) {
      setErrorMsg('Item code is required.');
      return;
    }

    if (!description.trim()) {
      setErrorMsg('Item description is required.');
      return;
    }

    if (qty < 0) {
      setErrorMsg('Opening quantity cannot be negative.');
      return;
    }

    if (price < 0) {
      setErrorMsg('Price per unit cannot be negative.');
      return;
    }

    if (damagedQty < 0 || rejectedQty < 0 || expiredQty < 0) {
      setErrorMsg('Damage, Reject, and Expired counts cannot be negative.');
      return;
    }

    // Check code uniqueness (only for new items or code edits)
    const isDuplicate = allItems.some(
      (it) => it.itemCode.toUpperCase() === trimmedCode && it.id !== existingItem?.id
    );
    if (isDuplicate) {
      setErrorMsg(`Item code "${trimmedCode}" already exists. Please use a unique code.`);
      return;
    }

    onSave({
      id: existingItem?.id,
      itemCode: trimmedCode,
      description: description.trim(),
      unit,
      initialQty: qty,
      pricePerUnit: price,
      department: department,
      remark: remark.trim(),
      damagedQty,
      rejectedQty,
      expiredQty,
      supplierName: supplierName.trim(),
      supplierContact: supplierContact.trim(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div 
        id="item-form-modal"
        className="bg-white text-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <PlusCircle className="text-emerald-700" size={20} />
            <h3 className="font-bold text-slate-800">
              {existingItem ? 'Edit Item Details' : 'Register New Item'}
            </h3>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 max-h-[75vh]">
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-lg border border-red-100">
              ⚠️ {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Item Code *</label>
              <input 
                type="text" 
                value={itemCode}
                onChange={(e) => setItemCode(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono uppercase bg-white text-slate-950 font-semibold"
                placeholder="INV-1001"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Unit Type * (Dropdown)</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as UnitType)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white text-slate-950 font-bold"
              >
                {UNITS.map((u) => (
                  <option 
                    key={u} 
                    value={u} 
                    className="bg-white text-slate-950 font-semibold"
                    style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                  >
                    {u.toUpperCase()} - ({u})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Description / Product Name *</label>
            <input 
              type="text" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white text-slate-950 font-semibold"
              placeholder="e.g. Copper Wire 1.5 SQ mm, LED Bulb, etc."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Primary Department *</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white text-slate-950 font-bold"
              >
                {['Civil', 'Electrical', 'Plumbing', 'Safety', 'Machinery', 'Tools', 'Other'].map((dept) => (
                  <option 
                    key={dept} 
                    value={dept} 
                    className="bg-white text-slate-950 font-semibold"
                    style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                  >
                    🛠️ {dept} Department
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Price per unit (INR ₹) *</label>
              <input 
                type="number" 
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white text-slate-950 font-semibold"
                placeholder="e.g. 150"
              />
            </div>
          </div>

          {/* Quantity Layout Section */}
          <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 space-y-3">
            <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">Stock Calculations Inventory (Qty)</span>
            
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Opening *</label>
                <input 
                  type="number" 
                  min="0"
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  className="w-full text-xs font-semibold border border-slate-200 rounded px-2 py-1.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-950"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-amber-600 uppercase mb-0.5">⚠️ Damaged</label>
                <input 
                  type="number" 
                  min="0"
                  value={damagedQty}
                  onChange={(e) => setDamagedQty(Number(e.target.value))}
                  className="w-full text-xs font-semibold border border-amber-200 rounded px-2 py-1.5 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-amber-50/20 text-slate-950"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-red-600 uppercase mb-0.5">⚠️ Rejected</label>
                <input 
                  type="number" 
                  min="0"
                  value={rejectedQty}
                  onChange={(e) => setRejectedQty(Number(e.target.value))}
                  className="w-full text-xs font-semibold border border-red-200 rounded px-2 py-1.5 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-red-50/20 text-slate-950"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-violet-600 uppercase mb-0.5">⚠️ Expired</label>
                <input 
                  type="number" 
                  min="0"
                  value={expiredQty}
                  onChange={(e) => setExpiredQty(Number(e.target.value))}
                  className="w-full text-xs font-semibold border border-violet-200 rounded px-2 py-1.5 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-violet-50/20 text-slate-950"
                />
              </div>
            </div>
            <p className="text-[9.5px] text-slate-400 mt-0.5 leading-snug">
              Actual Stock will automatically subtract Damaged, Rejected, and Expired units from sum of (Opening + Refills - Issues).
            </p>
          </div>

          {/* Supplier Dynamic Layout */}
          <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-2">
              <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                Supplier Registration Info
              </span>
              <button
                type="button"
                onClick={() => setShowAddSupplierForm(!showAddSupplierForm)}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded text-[9.5px] font-bold transition-all cursor-pointer shadow-xs self-start sm:self-auto"
              >
                <UserPlus size={10} />
                Add New Preset Supplier
              </button>
            </div>

            {/* Inlined Add Custom Preset Supplier Input Form */}
            {showAddSupplierForm && (
              <div className="p-2.5 bg-slate-100 rounded-lg border border-slate-200 space-y-2 animate-in slide-in-from-top-1 duration-150">
                <span className="text-[10px] font-bold text-slate-700 block uppercase">🚀 Register New Supplier Preset</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input 
                      type="text"
                      placeholder="Supplier Name"
                      value={newSupplierName}
                      onChange={(e) => setNewSupplierName(e.target.value)}
                      className="w-full text-xs font-semibold border border-slate-300 rounded px-2 py-1.5 bg-white text-slate-950 focus:border-emerald-600 outline-none"
                    />
                  </div>
                  <div>
                    <input 
                      type="text"
                      placeholder="Contact / Phone"
                      value={newSupplierContact}
                      onChange={(e) => setNewSupplierContact(e.target.value)}
                      className="w-full text-xs font-semibold border border-slate-300 rounded px-2 py-1.5 bg-white text-slate-950 focus:border-emerald-600 outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      setNewSupplierName('');
                      setNewSupplierContact('');
                      setShowAddSupplierForm(false);
                    }}
                    className="px-2 py-1 border border-slate-300 rounded font-medium text-slate-500 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCustomSupplier}
                    className="px-2 py-1 bg-emerald-700 text-white rounded font-bold hover:bg-emerald-800"
                  >
                    Save & Apply
                  </button>
                </div>
              </div>
            )}

            {/* Presetted quick buttons list */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[9.5px] font-bold text-slate-400 capitalize mr-1">Quick Select:</span>
              
              {/* Core Built-in presets */}
              <button
                type="button"
                onClick={() => {
                  setSupplierName("Ajanta Steel Corp");
                  setSupplierContact("+91 94433-22110");
                }}
                className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold transition-all cursor-pointer border ${
                  supplierName === "Ajanta Steel Corp" 
                    ? "bg-sky-600 text-white border-sky-600 shadow-xs" 
                    : "bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-100"
                }`}
              >
                🟢 Ajanta Steel
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setSupplierName("Polycab Cables Ltd");
                  setSupplierContact("+91 91100-22334");
                }}
                className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold transition-all cursor-pointer border ${
                  supplierName === "Polycab Cables Ltd"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100"
                }`}
              >
                🟢 Polycab Ltd
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setSupplierName("UltraTech Supply");
                  setSupplierContact("+91 98888-77766");
                }}
                className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold transition-all cursor-pointer border ${
                  supplierName === "UltraTech Supply"
                    ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                    : "bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-100"
                }`}
              >
                🟢 UltraTech
              </button>

              {/* Dynamic custom-stored user presets */}
              {customSuppliers.map((sup, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSupplierName(sup.name);
                    setSupplierContact(sup.contact);
                  }}
                  className={`inline-flex items-center gap-1 pl-1.5 pr-0.5 py-0.5 rounded text-[9.5px] font-bold border transition-all cursor-pointer ${
                    supplierName === sup.name 
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs" 
                      : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100"
                  }`}
                >
                  <span>⭐ {sup.name}</span>
                  <button
                    type="button"
                    onClick={(e) => handleRemoveCustomSupplier(idx, e)}
                    className="p-0.5 hover:bg-red-500 hover:text-white rounded transition-colors"
                    title="Delete Preset"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>

            {/* Current Manual Input fields */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Supplier Name</label>
                <input 
                  type="text" 
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-200 rounded px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-950 font-sans"
                  placeholder="e.g. Tata Steel Distributor"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Supplier Contact / Phone</label>
                <input 
                  type="text" 
                  value={supplierContact}
                  onChange={(e) => setSupplierContact(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-200 rounded px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-950 font-sans"
                  placeholder="e.g. +91 99887 76655"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Remark / Warehouse Location</label>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none h-16 resize-none bg-white text-slate-950 font-semibold"
              placeholder="e.g. Main Store Rack A2, Shelf B3, etc."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <CheckCircle size={15} />
              Save Item Details
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
