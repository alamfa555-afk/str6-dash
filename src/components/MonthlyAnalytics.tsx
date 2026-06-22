import React, { useMemo, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { InventoryItem, IssueTransaction, ReceiveTransaction } from '../types';
import { BarChart3, TrendingUp, PieChart as PieIcon, HelpCircle, Briefcase, RefreshCw, Warehouse } from 'lucide-react';

interface MonthlyAnalyticsProps {
  items: InventoryItem[];
  issues: IssueTransaction[];
  receives: ReceiveTransaction[];
  selectedWarehouseFilter: string;
}

export function MonthlyAnalytics({ 
  items, 
  issues, 
  receives, 
  selectedWarehouseFilter 
}: MonthlyAnalyticsProps) {
  const [activeChartTab, setActiveChartTab] = useState<'volume' | 'frequency' | 'departments'>('volume');

  // 1. Process Monthly Transactions Data
  const monthlyData = useMemo(() => {
    const dataMap: { 
      [key: string]: { 
        monthKey: string; 
        monthLabel: string; 
        receivesQty: number; 
        issuesQty: number; 
        receivesCount: number; 
        issuesCount: number; 
      } 
    } = {};

    // Filtered transaction items
    const filteredReceives = receives.filter(
      (r) => selectedWarehouseFilter === 'all' || r.warehouse === selectedWarehouseFilter
    );
    const filteredIssues = issues.filter(
      (i) => selectedWarehouseFilter === 'all' || i.warehouse === selectedWarehouseFilter
    );

    // Initial seed months if no transactions exist, to ensure clean layout
    const prefillMonths = ['2026-05', '2026-06', '2026-07'];
    prefillMonths.forEach(mk => {
      const parts = mk.split('-');
      const dummyDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 15);
      dataMap[mk] = {
        monthKey: mk,
        monthLabel: dummyDate.toLocaleString('en-US', { month: 'short', year: '2-digit' }),
        receivesQty: 0,
        issuesQty: 0,
        receivesCount: 0,
        issuesCount: 0
      };
    });

    // Accumulate Refills (Receives)
    filteredReceives.forEach((rc) => {
      const date = new Date(rc.receivedAt);
      if (isNaN(date.getTime())) return;
      
      const year = date.getFullYear();
      const month = date.getMonth();
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleString('en-US', { month: 'short', year: '2-digit' });

      if (!dataMap[monthKey]) {
        dataMap[monthKey] = {
          monthKey,
          monthLabel,
          receivesQty: 0,
          issuesQty: 0,
          receivesCount: 0,
          issuesCount: 0
        };
      }
      dataMap[monthKey].receivesQty += rc.quantity;
      dataMap[monthKey].receivesCount += 1;
    });

    // Accumulate Stock Releases (Issues)
    filteredIssues.forEach((is) => {
      const date = new Date(is.issuedAt);
      if (isNaN(date.getTime())) return;

      const year = date.getFullYear();
      const month = date.getMonth();
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleString('en-US', { month: 'short', year: '2-digit' });

      if (!dataMap[monthKey]) {
        dataMap[monthKey] = {
          monthKey,
          monthLabel,
          receivesQty: 0,
          issuesQty: 0,
          receivesCount: 0,
          issuesCount: 0
        };
      }
      dataMap[monthKey].issuesQty += is.quantity;
      dataMap[monthKey].issuesCount += 1;
    });

    // Convert to sorted array
    return Object.values(dataMap).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [receives, issues, selectedWarehouseFilter]);

  // 2. Process Department Allocation data (current month / all-time)
  const departmentData = useMemo(() => {
    const deptTotals: { [key: string]: number } = {};
    
    issues
      .filter((is) => selectedWarehouseFilter === 'all' || is.warehouse === selectedWarehouseFilter)
      .forEach((is) => {
        const dept = is.department || 'Other';
        deptTotals[dept] = (deptTotals[dept] || 0) + is.quantity;
      });

    const colors = [
      '#6366f1', // Indigo
      '#f59e0b', // Amber
      '#10b981', // Emerald
      '#ec4899', // Pink
      '#06b6d4', // Cyan
      '#a855f7', // Purple
      '#ef4444'  // Red
    ];

    return Object.entries(deptTotals).map(([name, value], idx) => ({
      name,
      value,
      color: colors[idx % colors.length]
    })).sort((a, b) => b.value - a.value);
  }, [issues, selectedWarehouseFilter]);

  // Overall calculations for stats header
  const totalVolumeIn = useMemo(() => {
    return monthlyData.reduce((sum, item) => sum + item.receivesQty, 0);
  }, [monthlyData]);

  const totalVolumeOut = useMemo(() => {
    return monthlyData.reduce((sum, item) => sum + item.issuesQty, 0);
  }, [monthlyData]);

  return (
    <div 
      id="analytics-dashboard-section"
      className="galaxy-glass rounded-2xl border border-white/5 shadow-2xl p-6 overflow-hidden transition-all duration-300"
    >
      {/* Tab Control / Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-white/5 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="text-amber-400 font-bold" size={20} />
            <h3 className="font-extrabold text-slate-100 uppercase tracking-tight text-sm flex items-center gap-1.5">
              Monthly Inventory Insights
              <span className="text-[10px] bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/20 font-black">
                {selectedWarehouseFilter === 'all' ? 'All Warehouses' : selectedWarehouseFilter}
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">Real-time charts showcasing supply levels, material flow, and department release volumes.</p>
        </div>

        {/* Buttons to switch charts */}
        <div className="flex items-center bg-slate-950/80 p-1.5 rounded-xl border border-white/5 gap-1 self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveChartTab('volume')}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all font-bold ${
              activeChartTab === 'volume'
                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <TrendingUp size={14} />
            Flow Volume
          </button>
          <button
            type="button"
            onClick={() => setActiveChartTab('frequency')}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all font-bold ${
              activeChartTab === 'frequency'
                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <RefreshCw size={14} className="animate-spin-slow" />
            Trip Frequency
          </button>
          <button
            type="button"
            onClick={() => setActiveChartTab('departments')}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all font-bold ${
              activeChartTab === 'departments'
                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <PieIcon size={14} />
            Dept Allocation
          </button>
        </div>
      </div>

      {/* Grid: Chart representation + Micro numeric overview cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
        
        {/* Left sidebar widgets (numeric values) */}
        <div className="lg:col-span-1 flex flex-col gap-4 justify-between">
          <div className="bg-slate-950/50 p-4 rounded-xl border border-white/5">
            <span className="text-[9.5px] font-black uppercase text-slate-500 tracking-wider">Total Received (In)</span>
            <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
              +{totalVolumeIn} <span className="text-[11px] font-normal text-slate-500">units</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 border-t border-white/5 pt-1">Refills into active locations</p>
          </div>

          <div className="bg-slate-950/50 p-4 rounded-xl border border-white/5">
            <span className="text-[9.5px] font-black uppercase text-slate-500 tracking-wider">Total Issued (Out)</span>
            <div className="text-2xl font-black text-indigo-400 font-mono mt-1">
              -{totalVolumeOut} <span className="text-[11px] font-normal text-slate-500">units</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 border-t border-white/5 pt-1">Releases to request departments</p>
          </div>

          <div className="bg-slate-950/50 p-4 rounded-xl border border-white/5 flex-grow flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <Warehouse className="text-amber-400" size={16} />
              <span className="text-[10px] font-black uppercase text-slate-300 tracking-wide">Multi-Warehouse Net</span>
            </div>
            <div className="text-xs text-slate-400 space-y-1.5">
              <div className="flex justify-between items-center bg-slate-900/40 p-1.5 rounded">
                <span>Main Wh:</span>
                <span className="font-bold text-amber-400 font-mono">
                  {monthlyData.reduce((acc, cr) => acc + (cr.receivesQty), 0) > 0 ? 'Active' : 'Seeded'}
                </span>
              </div>
              <div className="flex justify-between items-center bg-slate-900/40 p-1.5 rounded">
                <span>Shed A:</span>
                <span className="font-bold text-amber-400 font-mono">Managed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Recharts container block */}
        <div className="lg:col-span-3 min-h-[300px] h-[320px] bg-slate-950/30 rounded-2xl p-4 border border-white/5 flex flex-col justify-center relative">
          
          {activeChartTab === 'volume' && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="rcvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="isdGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis 
                  dataKey="monthLabel" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  dx={-5}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#090d16', 
                    borderRadius: '12px', 
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    fontFamily: 'sans-serif',
                    fontSize: '11px',
                    color: '#f8fafc'
                  }}
                  itemStyle={{ margin: '2px 0' }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  name="Qty Received (+)" 
                  dataKey="receivesQty" 
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill="url(#rcvGrad)" 
                  strokeWidth={2.5}
                />
                <Area 
                  type="monotone" 
                  name="Qty Issued (-)" 
                  dataKey="issuesQty" 
                  stroke="#6366f1" 
                  fillOpacity={1} 
                  fill="url(#isdGrad)" 
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {activeChartTab === 'frequency' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis 
                  dataKey="monthLabel" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  dx={-5}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#090d16', 
                    borderRadius: '12px', 
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    fontFamily: 'sans-serif',
                    fontSize: '11px'
                  }} 
                />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                />
                <Bar name="Refills Trips" dataKey="receivesCount" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={18} />
                <Bar name="Release Trips" dataKey="issuesCount" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {activeChartTab === 'departments' && (
            departmentData.length === 0 ? (
              <div className="text-center text-slate-500 italic text-xs py-16">
                No issued items found to show department allocation charts yet.
              </div>
            ) : (
              <div className="flex flex-col md:flex-row items-center w-full h-full gap-4">
                <div className="w-full md:w-3/5 h-full relative" style={{ minHeight: '180px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={departmentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {departmentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#090d16', 
                          borderRadius: '12px', 
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          fontSize: '11px'
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                    <span className="text-[9px] font-extrabold uppercase text-slate-500 tracking-wider block">Total Released</span>
                    <strong className="text-lg font-black font-mono text-slate-200 block mt-0.5">{totalVolumeOut}</strong>
                  </div>
                </div>

                <div className="w-full md:w-2/5 flex flex-col gap-2 overflow-y-auto pr-2 max-h-[220px]">
                  <strong className="text-[10px] uppercase font-bold text-slate-400 tracking-wider border-b border-white/5 pb-1">Department Split (Units)</strong>
                  {departmentData.map((dept, idx) => (
                    <div key={dept.name} className="flex items-center justify-between text-xs py-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: dept.color }} />
                        <span className="text-slate-300 font-semibold">{dept.name}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-100">{dept.value} units</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}

        </div>

      </div>
    </div>
  );
}
