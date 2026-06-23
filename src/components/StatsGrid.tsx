import { InventoryItem, IssueTransaction, ReceiveTransaction } from '../types';
import { Package, AlertTriangle, HelpCircle, ArrowUpRight, TrendingUp, AlertCircle, Layers, Ban, CalendarRange, Trash2 } from 'lucide-react';

interface StatsProps {
  items: InventoryItem[];
  issues: IssueTransaction[];
  receives: ReceiveTransaction[];
  selectedWarehouseFilter?: string; // Multi-warehouse filter
  onLowStockClick?: () => void;
  onOutOfStockClick?: () => void;
  onDamagedStockClick?: () => void;
  onRejectedStockClick?: () => void;
  onExpiredStockClick?: () => void;
}

export function StatsGrid({ 
  items, 
  issues, 
  receives, 
  selectedWarehouseFilter = 'all',
  onLowStockClick, 
  onOutOfStockClick,
  onDamagedStockClick,
  onRejectedStockClick,
  onExpiredStockClick
}: StatsProps) {
  // Helper to calculate total real stock of an item
  const getItemStock = (item: InventoryItem) => {
    const rx = receives
      .filter((r) => r.itemCode === item.itemCode && (selectedWarehouseFilter === 'all' || r.warehouse === selectedWarehouseFilter))
      .reduce((s, r) => s + Number(r.quantity || 0), 0);
    const tx = issues
      .filter((i) => i.itemCode === item.itemCode && (selectedWarehouseFilter === 'all' || i.warehouse === selectedWarehouseFilter))
      .reduce((s, i) => s + Number(i.quantity || 0), 0);
    
    const itemWarehouse = item.warehouse || 'Main Warehouse';
    const isMatchingWarehouse = selectedWarehouseFilter === 'all' || selectedWarehouseFilter === itemWarehouse;
    
    const initQty = isMatchingWarehouse ? Number(item.initialQty || 0) : 0;
    const dmg = isMatchingWarehouse ? Number(item.damagedQty || 0) : 0;
    const rej = isMatchingWarehouse ? Number(item.rejectedQty || 0) : 0;
    const exp = isMatchingWarehouse ? Number(item.expiredQty || 0) : 0;
    
    return Math.max(0, initQty + rx - tx - dmg - rej - exp);
  };

  let totalItemsCount = items.length;
  let totalStockValue = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let totalStockUnits = 0;
  let totalDamagedUnits = 0;
  let totalRejectedUnits = 0;
  let totalExpiredUnits = 0;

  items.forEach((item) => {
    const qty = getItemStock(item);
    totalStockUnits += qty;
    totalStockValue += (qty * item.pricePerUnit);

    const itemWarehouse = item.warehouse || 'Main Warehouse';
    const isMatchingWarehouse = selectedWarehouseFilter === 'all' || selectedWarehouseFilter === itemWarehouse;
    totalDamagedUnits += isMatchingWarehouse ? Number(item.damagedQty || 0) : 0;
    totalRejectedUnits += isMatchingWarehouse ? Number(item.rejectedQty || 0) : 0;
    totalExpiredUnits += isMatchingWarehouse ? Number(item.expiredQty || 0) : 0;

    if (qty === 0) {
      outOfStockCount++;
    } else if (qty <= 10) {
      lowStockCount++;
    }
  });

  const totalReleasedCount = issues
    .filter((i) => selectedWarehouseFilter === 'all' || i.warehouse === selectedWarehouseFilter)
    .reduce((acc, current) => acc + current.quantity, 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
      {/* Dynamic Item Count Card */}
      <div 
        id="stats-total-items"
        className="galaxy-glass rounded-2xl p-5 shadow-lg transition-all hover:scale-[1.02] hover:border-emerald-500/20 flex flex-col justify-between"
      >
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total Registered Items</span>
            <h3 className="text-3xl font-black font-sans text-white mt-1.5 neon-text-sky">{totalItemsCount}</h3>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/25 glow-emerald">
            <Package size={18} />
          </div>
        </div>
        <div className="text-[11px] text-slate-400 mt-4 border-t border-white/5 pt-2 flex items-center gap-1.5">
          <span className="font-extrabold text-emerald-400">Active Catalog</span> Registered parts
        </div>
      </div>

      {/* Dynamic Total Stock Units Card */}
      <div 
        id="stats-total-stock-units"
        className="galaxy-glass rounded-2xl p-5 shadow-lg transition-all hover:scale-[1.02] hover:border-indigo-500/20 flex flex-col justify-between"
      >
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total All Item Stock</span>
            <h3 className="text-3xl font-black font-sans text-white mt-1.5 neon-text-sky">{totalStockUnits}</h3>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/25 glow-indigo">
            <Layers size={18} />
          </div>
        </div>
        <div className="text-[11px] text-slate-400 mt-4 border-t border-white/5 pt-2 flex items-center gap-1.5">
          <span className="font-extrabold text-indigo-400">Available Qty</span> in warehouse
        </div>
      </div>

      {/* Dynamic Total Stock Value Card */}
      <div 
        id="stats-valuation"
        className="galaxy-glass rounded-2xl p-5 shadow-lg transition-all hover:scale-[1.02] hover:border-amber-500/20 flex flex-col justify-between"
      >
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Net Stock Valuation (SAR)</span>
            <h3 className="text-2xl font-black font-sans text-white mt-1.5 neon-text-orange">
              SAR {totalStockValue.toLocaleString('en-US')}
            </h3>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/25 glow-orange">
            <TrendingUp size={18} />
          </div>
        </div>
        <div className="text-[11px] text-slate-400 mt-4 border-t border-white/5 pt-2 flex items-center gap-1.5">
          <span className="font-extrabold text-amber-400">Liquid Valuation</span> active in store
        </div>
      </div>

      {/* Dynamic Low Stock Warning Card */}
      <div 
        id="stats-low-stock"
        onClick={onLowStockClick}
        className={`galaxy-glass rounded-2xl p-5 shadow-lg transition-all hover:scale-[1.04] active:scale-95 flex flex-col justify-between border cursor-pointer select-none ${
          lowStockCount > 0 
            ? 'border-amber-500/60 shadow-amber-500/10 shadow-lg hover:border-amber-400 bg-amber-500/[0.02]' 
            : 'border-white/5 hover:border-white/10'
        }`}
        title="Click to view Low Stock summary and filter"
      >
        <div className="flex justify-between items-start">
          <div>
            <span className={`text-[11px] font-extrabold uppercase tracking-wider ${lowStockCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
              Low Stock Alert (≤10)
            </span>
            <h3 className="text-3xl font-black font-sans text-white mt-1.5">{lowStockCount}</h3>
          </div>
          <div className={`p-3 rounded-xl border ${lowStockCount > 0 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse' : 'bg-slate-500/10 text-slate-400 border-white/5'}`}>
            <AlertTriangle size={18} />
          </div>
        </div>
        <div className="text-[11px] mt-4 border-t border-white/5 pt-2 flex justify-between items-center">
          {lowStockCount > 0 ? (
            <span className="font-extrabold text-amber-400">Refill requested immediately</span>
          ) : (
            <span className="text-slate-400 font-medium">All levels healthy</span>
          )}
          <span className="text-[9px] text-amber-500/80 font-bold tracking-wider uppercase border border-amber-500/20 px-1 py-0.5 rounded bg-amber-500/5 hover:bg-amber-500/10">Click to View</span>
        </div>
      </div>

      {/* Dynamic Out of Stock Card */}
      <div 
        id="stats-out-of-stock"
        onClick={onOutOfStockClick}
        className={`galaxy-glass rounded-2xl p-5 shadow-lg transition-all hover:scale-[1.04] active:scale-95 flex flex-col justify-between border cursor-pointer select-none ${
          outOfStockCount > 0 
            ? 'border-red-500/60 shadow-red-500/10 shadow-lg hover:border-red-400 bg-red-500/[0.02]' 
            : 'border-white/5 hover:border-white/10'
        }`}
        title="Click to view Out of Stock summary and filter"
      >
        <div className="flex justify-between items-start">
          <div>
            <span className={`text-[11px] font-extrabold uppercase tracking-wider ${outOfStockCount > 0 ? 'text-red-400 font-black' : 'text-slate-400'}`}>
              Not In Stock (Zero)
            </span>
            <h3 className="text-3xl font-black font-sans text-white mt-1.5">{outOfStockCount}</h3>
          </div>
          <div className={`p-3 rounded-xl border ${outOfStockCount > 0 ? 'bg-red-500/20 text-red-400 border-red-500/30 font-bold' : 'bg-slate-500/10 text-slate-400 border-white/5'}`}>
            <AlertCircle size={18} />
          </div>
        </div>
        <div className="text-[11px] mt-4 border-t border-white/5 pt-2 flex justify-between items-center">
          {outOfStockCount > 0 ? (
            <span className="font-extrabold text-red-400">Warning: Blocked releases</span>
          ) : (
            <span className="text-slate-400 font-medium">No empty columns</span>
          )}
          <span className="text-[9px] text-red-500/80 font-bold tracking-wider uppercase border border-red-500/20 px-1 py-0.5 rounded bg-red-500/5 hover:bg-red-500/10">Click to View</span>
        </div>
      </div>

      {/* Dynamic Issues Released Qty Card */}
      <div 
        id="stats-total-released"
        className="galaxy-glass rounded-2xl p-5 shadow-lg transition-all hover:scale-[1.02] hover:border-violet-500/20 flex flex-col justify-between"
      >
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total Released Units</span>
            <h3 className="text-3xl font-black font-sans text-white mt-1.5 neon-text-sky">{totalReleasedCount}</h3>
          </div>
          <div className="p-3 bg-violet-500/10 text-violet-400 rounded-xl border border-violet-500/25 glow-purple">
            <ArrowUpRight size={18} />
          </div>
        </div>
        <div className="text-[11px] text-slate-400 mt-4 border-t border-white/5 pt-2 flex items-center gap-1.5">
          <span className="font-extrabold text-violet-400">{issues.length} issuances</span> executed
        </div>
      </div>

      {/* Total Damaged Stock Card */}
      <div 
        id="stats-total-damaged"
        onClick={onDamagedStockClick}
        className={`galaxy-glass rounded-2xl p-5 shadow-lg transition-all hover:scale-[1.04] active:scale-95 flex flex-col justify-between border cursor-pointer select-none ${
          totalDamagedUnits > 0 
            ? 'border-amber-500/60 shadow-amber-500/10 shadow-lg hover:border-amber-400 bg-amber-500/[0.02]' 
            : 'border-white/5 hover:border-white/10'
        }`}
        title="Click to view/filter damaged items"
      >
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total Damaged Stock</span>
            <h3 className={`text-3xl font-black font-sans mt-1.5 ${totalDamagedUnits > 0 ? 'text-amber-400 neon-text-orange' : 'text-slate-300'}`}>
              {totalDamagedUnits}
            </h3>
          </div>
          <div className={`p-3 rounded-xl border ${totalDamagedUnits > 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/25 glow-orange' : 'bg-slate-500/5 text-slate-500 border-white/5'}`}>
            <Trash2 size={18} />
          </div>
        </div>
        <div className="text-[11px] text-slate-400 mt-4 border-t border-white/5 pt-2 flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            {totalDamagedUnits > 0 ? (
              <span className="font-extrabold text-amber-400">Excluded</span>
            ) : (
              <span className="font-extrabold text-slate-500">No damage</span>
            )}
            <span>from active inventory</span>
          </div>
          {totalDamagedUnits > 0 && (
            <span className="text-[9px] text-amber-500/80 font-bold tracking-wider uppercase border border-amber-500/20 px-1 py-0.5 rounded bg-amber-500/5">Click to View</span>
          )}
        </div>
      </div>

      {/* Total Rejected Stock Card */}
      <div 
        id="stats-total-rejected"
        onClick={onRejectedStockClick}
        className={`galaxy-glass rounded-2xl p-5 shadow-lg transition-all hover:scale-[1.04] active:scale-95 flex flex-col justify-between border cursor-pointer select-none ${
          totalRejectedUnits > 0 
            ? 'border-rose-500/60 shadow-rose-500/10 shadow-lg hover:border-rose-400 bg-rose-500/[0.02]' 
            : 'border-white/5 hover:border-white/10'
        }`}
        title="Click to view/filter rejected items"
      >
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total Rejected Stock</span>
            <h3 className={`text-3xl font-black font-sans mt-1.5 ${totalRejectedUnits > 0 ? 'text-rose-400 neon-text-red' : 'text-slate-300'}`}>
              {totalRejectedUnits}
            </h3>
          </div>
          <div className={`p-3 rounded-xl border ${totalRejectedUnits > 0 ? 'bg-rose-500/10 text-rose-400 border-rose-500/25 glow-rose' : 'bg-slate-500/5 text-slate-500 border-white/5'}`}>
            <Ban size={18} />
          </div>
        </div>
        <div className="text-[11px] text-slate-400 mt-4 border-t border-white/5 pt-2 flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            {totalRejectedUnits > 0 ? (
              <span className="font-extrabold text-rose-400">Deducted</span>
            ) : (
              <span className="font-extrabold text-slate-500">Zero rejected</span>
            )}
            <span>parts on entry</span>
          </div>
          {totalRejectedUnits > 0 && (
            <span className="text-[9px] text-rose-500/80 font-bold tracking-wider uppercase border border-rose-500/20 px-1 py-0.5 rounded bg-rose-500/5">Click to View</span>
          )}
        </div>
      </div>

      {/* Total Expired Stock Card */}
      <div 
        id="stats-total-expired"
        onClick={onExpiredStockClick}
        className={`galaxy-glass rounded-2xl p-5 shadow-lg transition-all hover:scale-[1.04] active:scale-95 flex flex-col justify-between border cursor-pointer select-none ${
          totalExpiredUnits > 0 
            ? 'border-red-500/60 shadow-red-500/10 shadow-lg hover:border-red-400 bg-red-500/[0.02]' 
            : 'border-white/5 hover:border-white/10'
        }`}
        title="Click to view/filter expired items"
      >
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total Expired Stock</span>
            <h3 className={`text-3xl font-black font-sans mt-1.5 ${totalExpiredUnits > 0 ? 'text-red-400 neon-text-red' : 'text-slate-300'}`}>
              {totalExpiredUnits}
            </h3>
          </div>
          <div className={`p-3 rounded-xl border ${totalExpiredUnits > 0 ? 'bg-red-500/10 text-red-400 border-red-500/25 glow-red' : 'bg-slate-500/5 text-slate-500 border-white/5'}`}>
            <CalendarRange size={18} />
          </div>
        </div>
        <div className="text-[11px] text-slate-400 mt-4 border-t border-white/5 pt-2 flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            {totalExpiredUnits > 0 ? (
              <span className="font-extrabold text-red-400">Expired</span>
            ) : (
              <span className="font-extrabold text-slate-500">Safe/Fresh</span>
            )}
            <span>shelf life stock</span>
          </div>
          {totalExpiredUnits > 0 && (
            <span className="text-[9px] text-red-500/80 font-bold tracking-wider uppercase border border-red-500/20 px-1 py-0.5 rounded bg-red-500/5">Click to View</span>
          )}
        </div>
      </div>
    </div>
  );
}
