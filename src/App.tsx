import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  ArrowDownRight, 
  FileText, 
  Search, 
  Database, 
  AlertTriangle, 
  Trash2, 
  History, 
  Edit3, 
  Filter, 
  RefreshCw,
  PlusCircle,
  HelpCircle,
  ShieldAlert,
  CalendarDays,
  LogOut,
  User as UserIcon,
  Download,
  Warehouse,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { 
  itemsColRef, 
  issuesColRef, 
  receivesColRef,
  warehousesColRef,
  departmentsColRef,
  seedDatabaseIfEmpty,
  saveInventoryItem,
  deleteInventoryItem,
  saveIssueTransaction,
  deleteIssueTransaction,
  saveReceiveTransaction,
  deleteReceiveTransaction,
  saveCustomWarehouse,
  saveCustomDepartment,
  deleteCustomWarehouse,
  deleteCustomDepartment,
  resetDatabaseToDefaults,
  auth
} from './firebase';
import { InventoryItem, IssueTransaction, ReceiveTransaction } from './types';
import { INITIAL_ITEMS, INITIAL_ISSUES, INITIAL_RECEIVES } from './data';
import { StatsGrid } from './components/StatsGrid';
import { ItemFormModal } from './components/ItemFormModal';
import { IssueFormModal } from './components/IssueFormModal';
import { ReceiveFormModal } from './components/ReceiveFormModal';
import { PDFReportHubModal } from './components/PDFReportHubModal';
import { LoginScreen } from './components/LoginScreen';
import { MonthlyAnalytics } from './components/MonthlyAnalytics';

export default function App() {
  // --- Auth States ---
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // --- Core States ---
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [issues, setIssues] = useState<IssueTransaction[]>([]);
  const [receives, setReceives] = useState<ReceiveTransaction[]>([]);
  const [warehouses, setWarehouses] = useState<string[]>([
    'Main Warehouse', 
    'Shed A Warehouse', 
    'Sub-Depot Warehouse'
  ]);
  const [departments, setDepartments] = useState<string[]>([
    'Civil', 
    'Electrical', 
    'Plumbing', 
    'Safety', 
    'Machinery', 
    'Tools', 
    'Other'
  ]);

  // Auth observer
  useEffect(() => {
    const savedUser = localStorage.getItem('cosmic_bypass_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('cosmic_bypass_user');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // Only set user from Firebase if we don't have an active easy session
      const hasBypass = localStorage.getItem('cosmic_bypass_user');
      if (!hasBypass) {
        setUser(currentUser);
      }
      setAuthLoading(false);
    });

    if (savedUser) {
      setAuthLoading(false);
    }

    return () => unsubscribe();
  }, []);

  // --- Modal Open States ---
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isPDFHubOpen, setIsPDFHubOpen] = useState(false);

  // --- Active Selected Edit States ---
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'inventory' | 'issues' | 'receives' | 'settings'>('inventory');

  // --- Search & Filters ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnit, setFilterUnit] = useState('all');
  const [filterStockStatus, setFilterStockStatus] = useState<'all' | 'low' | 'out' | 'damaged' | 'rejected' | 'expired'>('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState('all');

  // --- Custom Global notification banners (e.g., critical low stock triggers) ---
  const [showLowStockNotification, setShowLowStockNotification] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // --- Loading State for initial fetch ---
  const [isLoading, setIsLoading] = useState(true);

  // 1. Initial Load, Seeding, and Real-time Listeners synchronized via Firestore
  useEffect(() => {
    let unsubscribeItems: () => void;
    let unsubscribeIssues: () => void;
    let unsubscribeReceives: () => void;
    let unsubscribeWarehouses: () => void;
    let unsubscribeDepartments: () => void;

    const setupRealtimeSync = async () => {
      try {
        // Seed first if database has no entries
        await seedDatabaseIfEmpty();

        const defaultsWh = ['Main Warehouse', 'Shed A Warehouse', 'Sub-Depot Warehouse'];
        const defaultsDept = ['Civil', 'Electrical', 'Plumbing', 'Safety', 'Machinery', 'Tools', 'Other'];

        // Listen to inv_items
        unsubscribeItems = onSnapshot(itemsColRef, (snapshot) => {
          const list: InventoryItem[] = [];
          snapshot.forEach((doc) => {
            list.push(doc.data() as InventoryItem);
          });
          // Sort items by createdAt desc for consistency
          list.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
          setItems(list);
        }, (error) => {
          console.error("Firebase Items Sync Error:", error);
        });

        // Listen to inv_issues
        unsubscribeIssues = onSnapshot(issuesColRef, (snapshot) => {
          const list: IssueTransaction[] = [];
          snapshot.forEach((doc) => {
            list.push(doc.data() as IssueTransaction);
          });
          list.sort((a, b) => new Date(b.issuedAt || '').getTime() - new Date(a.issuedAt || '').getTime());
          setIssues(list);
        }, (error) => {
          console.error("Firebase Issues Sync Error:", error);
        });

        // Listen to inv_receives
        unsubscribeReceives = onSnapshot(receivesColRef, (snapshot) => {
          const list: ReceiveTransaction[] = [];
          snapshot.forEach((doc) => {
            list.push(doc.data() as ReceiveTransaction);
          });
          list.sort((a, b) => new Date(b.receivedAt || '').getTime() - new Date(a.receivedAt || '').getTime());
          setReceives(list);
          setIsLoading(false);
        }, (error) => {
          console.error("Firebase Receives Sync Error:", error);
          setIsLoading(false);
        });

        // Listen to warehouses list
        unsubscribeWarehouses = onSnapshot(warehousesColRef, (snapshot) => {
          const list: string[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            if (data && data.name) {
              list.push(data.name);
            }
          });
          const merged = Array.from(new Set([...defaultsWh, ...list]));
          setWarehouses(merged);
        }, (error) => {
          console.error("Firebase Warehouses Sync Error:", error);
        });

        // Listen to departments list
        unsubscribeDepartments = onSnapshot(departmentsColRef, (snapshot) => {
          const list: string[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            if (data && data.name) {
              list.push(data.name);
            }
          });
          const merged = Array.from(new Set([...defaultsDept, ...list]));
          setDepartments(merged);
        }, (error) => {
          console.error("Firebase Departments Sync Error:", error);
        });

      } catch (err) {
        console.error("Firebase Initialization Error:", err);
        setIsLoading(false);
      }
    };

    setupRealtimeSync();

    return () => {
      if (unsubscribeItems) unsubscribeItems();
      if (unsubscribeIssues) unsubscribeIssues();
      if (unsubscribeReceives) unsubscribeReceives();
      if (unsubscribeWarehouses) unsubscribeWarehouses();
      if (unsubscribeDepartments) unsubscribeDepartments();
    };
  }, []);

  const [settingsNewWh, setSettingsNewWh] = useState('');
  const [settingsNewDept, setSettingsNewDept] = useState('');

  const handleAddWarehouse = async (name: string) => {
    const id = `wh_${Date.now()}`;
    await saveCustomWarehouse(id, name);
  };

  const handleAddDepartment = async (name: string) => {
    const id = `dept_${Date.now()}`;
    await saveCustomDepartment(id, name);
  };

  const handleDeleteWarehouse = async (name: string) => {
    const defaults = ['Main Warehouse', 'Shed A Warehouse', 'Sub-Depot Warehouse'];
    if (defaults.includes(name)) {
      window.alert("Cannot delete default system warehouse locations.");
      return;
    }
    const confirmDelete = window.confirm(`Are you sure you want to delete warehouse option: "${name}"?`);
    if (confirmDelete) {
      try {
        await deleteCustomWarehouse(name);
      } catch (err) {
        console.error("Error deleting warehouse:", err);
      }
    }
  };

  const handleDeleteDepartment = async (name: string) => {
    const defaults = ['Civil', 'Electrical', 'Plumbing', 'Safety', 'Machinery', 'Tools', 'Other'];
    if (defaults.includes(name)) {
      window.alert("Cannot delete default system departments.");
      return;
    }
    const confirmDelete = window.confirm(`Are you sure you want to delete department option: "${name}"?`);
    if (confirmDelete) {
      try {
        await deleteCustomDepartment(name);
      } catch (err) {
        console.error("Error deleting department:", err);
      }
    }
  };

  // 2. Automated Quantity Stock Balance calculation for relative items
  // Real-time Current Stock = Initial Opening Qty + Sum(Receives) - Sum(Issues) - Damaged - Rejected - Expired (by Warehouse if specified)
  const getCurrentStock = (itemCode: string, warehouseFilter?: string): number => {
    const parent = items.find((it) => it.itemCode === itemCode);
    if (!parent) return 0;

    const totalRcv = receives
      .filter((r) => r.itemCode === itemCode && (!warehouseFilter || warehouseFilter === 'all' || r.warehouse === warehouseFilter))
      .reduce((sum, r) => sum + r.quantity, 0);

    const totalIsd = issues
      .filter((i) => i.itemCode === itemCode && (!warehouseFilter || warehouseFilter === 'all' || i.warehouse === warehouseFilter))
      .reduce((sum, i) => sum + i.quantity, 0);

    const isMainOrAll = !warehouseFilter || warehouseFilter === 'all' || warehouseFilter === 'Main Warehouse';
    const initQty = isMainOrAll ? parent.initialQty : 0;
    const dmg = isMainOrAll ? (parent.damagedQty || 0) : 0;
    const rej = isMainOrAll ? (parent.rejectedQty || 0) : 0;
    const exp = isMainOrAll ? (parent.expiredQty || 0) : 0;

    return Math.max(0, initQty + totalRcv - totalIsd - dmg - rej - exp);
  };

  // --- Core CRUD Form Handlers ---
  const handleSaveItem = async (itemData: Omit<InventoryItem, 'id' | 'createdAt'> & { id?: string }) => {
    try {
      if (itemData.id) {
        // Edit Mode
        const currentItem = items.find((it) => it.id === itemData.id);
        const updatedItem: InventoryItem = {
          id: itemData.id,
          itemCode: itemData.itemCode,
          description: itemData.description,
          unit: itemData.unit,
          initialQty: itemData.initialQty,
          pricePerUnit: itemData.pricePerUnit,
          department: itemData.department || 'Civil',
          remark: itemData.remark,
          createdAt: currentItem?.createdAt || new Date().toISOString(),
          damagedQty: itemData.damagedQty,
          rejectedQty: itemData.rejectedQty,
          expiredQty: itemData.expiredQty,
          supplierName: itemData.supplierName,
          supplierContact: itemData.supplierContact,
        };
        await saveInventoryItem(updatedItem);
      } else {
        // New Registry
        const newItem: InventoryItem = {
          id: `item-${Date.now()}`,
          itemCode: itemData.itemCode,
          description: itemData.description,
          unit: itemData.unit,
          initialQty: itemData.initialQty,
          pricePerUnit: itemData.pricePerUnit,
          department: itemData.department || 'Civil',
          remark: itemData.remark,
          createdAt: new Date().toISOString(),
          damagedQty: itemData.damagedQty,
          rejectedQty: itemData.rejectedQty,
          expiredQty: itemData.expiredQty,
          supplierName: itemData.supplierName,
          supplierContact: itemData.supplierContact,
        };
        await saveInventoryItem(newItem);
      }
    } catch (e) {
      console.error("Firestore Save Error:", e);
    }
    setEditingItem(undefined);
  };

  const handleIssueItem = async (issueData: Omit<IssueTransaction, 'id'>) => {
    try {
      const newIssue: IssueTransaction = {
        id: `issue-${Date.now()}`,
        ...issueData,
      };
      await saveIssueTransaction(newIssue);
    } catch (e) {
      console.error("Firestore Issue Error:", e);
    }
  };

  const handleReceiveItem = async (receiveData: Omit<ReceiveTransaction, 'id'> & { updateMaster?: boolean }) => {
    try {
      const { updateMaster, ...transactionFields } = receiveData;
      const newReceive: ReceiveTransaction = {
        id: `receive-${Date.now()}`,
        ...transactionFields,
      };
      await saveReceiveTransaction(newReceive);

      if (updateMaster) {
        const item = items.find((it) => it.itemCode === receiveData.itemCode);
        if (item) {
          const updatedItem: InventoryItem = {
            ...item,
            supplierName: receiveData.supplierName || item.supplierName,
            pricePerUnit: (receiveData.pricePerUnit !== undefined && receiveData.pricePerUnit > 0) ? receiveData.pricePerUnit : item.pricePerUnit,
          };
          await saveInventoryItem(updatedItem);
        }
      }
    } catch (e) {
      console.error("Firestore Receive Error:", e);
    }
  };

  const handleDeleteItem = async (id: string, itemCode: string) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete ${itemCode}? It will completely remove the item registry and corresponding histories across all devices.`);
    if (confirmDelete) {
      try {
        await deleteInventoryItem(id);
        
        // Clean related logs in Firestore
        const relatedIssues = issues.filter((is) => is.itemCode === itemCode);
        for (const issue of relatedIssues) {
          await deleteIssueTransaction(issue.id);
        }
        
        const relatedReceives = receives.filter((rc) => rc.itemCode === itemCode);
        for (const rcv of relatedReceives) {
          await deleteReceiveTransaction(rcv.id);
        }
      } catch (e) {
        console.error("Firestore Delete Error:", e);
      }
    }
  };

  const handleClearHistory = async () => {
    const confirmClear = window.confirm('DANGER! Do you want to wipe out the database and restore default construction store items across all devices?');
    if (confirmClear) {
      try {
        setIsLoading(true);
        await resetDatabaseToDefaults();
      } catch (e) {
        console.error("Firestore Wiping Error:", e);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // --- Filter Logic ---
  const filteredItemsList = useMemo(() => {
    return items.filter((item) => {
      // Search
      const textToSearch = `${item.itemCode} ${item.description} ${item.remark}`.toLowerCase();
      const matchesSearch = textToSearch.includes(searchTerm.toLowerCase());

      // Unit
      const matchesUnit = filterUnit === 'all' || item.unit === filterUnit;

      // Department
      const matchesDept = filterDepartment === 'all' || (item.department || 'Civil') === filterDepartment;

      // Stock level status (Alert values) - respects selected warehouse!
      const stockVal = getCurrentStock(item.itemCode, selectedWarehouseFilter);
      let matchesStock = true;
      if (filterStockStatus === 'low') {
        matchesStock = stockVal > 0 && stockVal <= 10;
      } else if (filterStockStatus === 'out') {
        matchesStock = stockVal === 0;
      } else if (filterStockStatus === 'damaged') {
        const isMainOrAll = selectedWarehouseFilter === 'all' || selectedWarehouseFilter === 'Main Warehouse';
        matchesStock = isMainOrAll ? ((item.damagedQty || 0) > 0) : false;
      } else if (filterStockStatus === 'rejected') {
        const isMainOrAll = selectedWarehouseFilter === 'all' || selectedWarehouseFilter === 'Main Warehouse';
        matchesStock = isMainOrAll ? ((item.rejectedQty || 0) > 0) : false;
      } else if (filterStockStatus === 'expired') {
        const isMainOrAll = selectedWarehouseFilter === 'all' || selectedWarehouseFilter === 'Main Warehouse';
        matchesStock = isMainOrAll ? ((item.expiredQty || 0) > 0) : false;
      }

      return matchesSearch && matchesUnit && matchesStock && matchesDept;
    });
  }, [items, searchTerm, filterUnit, filterStockStatus, filterDepartment, selectedWarehouseFilter, issues, receives]);

  // Total count of critical low stock items
  const criticalLowStockItems = useMemo(() => {
    return items.filter((it) => {
      const stock = getCurrentStock(it.itemCode, selectedWarehouseFilter);
      return stock > 0 && stock <= 10;
    });
  }, [items, selectedWarehouseFilter, issues, receives]);

  // --- CSV Export Functionality ---
  const handleCSVDownload = () => {
    let csvContent = "";
    let fileName = "";

    if (activeTab === 'inventory') {
      fileName = `Inventory_Report_${selectedWarehouseFilter === 'all' ? 'All_Warehouses' : selectedWarehouseFilter}_${new Date().toISOString().slice(0, 10)}.csv`;
      
      const headers = ["Serial No", "Item Code", "Description", "Department", "Unit Category", "Price Per Unit (SAR)", "Current In-Stock Quantity", "Estimated Valuation (SAR)", "Damaged", "Rejected", "Expired", "Primary Supplier"];
      csvContent += headers.map(h => `"${h}"`).join(",") + "\n";

      filteredItemsList.forEach((item, index) => {
        const stock = getCurrentStock(item.itemCode, selectedWarehouseFilter);
        const valuation = stock * item.pricePerUnit;
        const row = [
          index + 1,
          item.itemCode,
          item.description,
          item.department || 'Civil',
          item.unit,
          item.pricePerUnit,
          stock,
          valuation,
          item.damagedQty || 0,
          item.rejectedQty || 0,
          item.expiredQty || 0,
          item.supplierName || 'N/A'
        ];
        csvContent += row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",") + "\n";
      });
    } else if (activeTab === 'issues') {
      fileName = `Stock_Issues_Report_${selectedWarehouseFilter === 'all' ? 'All_Warehouses' : selectedWarehouseFilter}_${new Date().toISOString().slice(0, 10)}.csv`;
      const headers = ["Serial No", "Item Code", "Item Description", "Receiver / Issued To", "Requesting Department", "Quantity Released", "Date & Time", "Released By Name", "Released By ID", "Warehouse Location", "Purpose / Remark", "Withdraw Receipt No", "MDR No"];
      csvContent += headers.map(h => `"${h}"`).join(",") + "\n";

      const filteredIssues = issues.filter(is => {
        const matchesDept = filterDepartment === 'all' || is.department === filterDepartment;
        const matchesSearch = searchTerm === '' || 
          `${is.itemCode} ${is.issuedTo} ${is.issuedByName}`.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesWarehouse = selectedWarehouseFilter === 'all' || is.warehouse === selectedWarehouseFilter;
        return matchesDept && matchesSearch && matchesWarehouse;
      });

      filteredIssues.forEach((is, index) => {
        const itemDesc = items.find((it) => it.itemCode === is.itemCode)?.description || 'Unregistered';
        const row = [
          index + 1,
          is.itemCode,
          itemDesc,
          is.issuedTo,
          is.department || 'Civil',
          is.quantity,
          new Date(is.issuedAt).toLocaleString('en-US'),
          is.issuedByName,
          is.issuedById,
          is.warehouse || 'Main Warehouse',
          is.remark || 'N/A',
          is.withdrawReceiptNo || '',
          is.mdrNo || ''
        ];
        csvContent += row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",") + "\n";
      });
    } else if (activeTab === 'receives') {
      fileName = `Stock_Receives_Report_${selectedWarehouseFilter === 'all' ? 'All_Warehouses' : selectedWarehouseFilter}_${new Date().toISOString().slice(0, 10)}.csv`;
      const headers = ["Serial No", "Item Code", "Item Description", "Refill Quantity", "Supplier / Vendor Name", "Price Per Unit (SAR)", "Received Date & Time", "Received By Name", "Received By ID", "Warehouse Location", "Invoice / Remark"];
      csvContent += headers.map(h => `"${h}"`).join(",") + "\n";

      const filteredReceives = receives.filter(rc => {
        const matchedItem = items.find(it => it.itemCode === rc.itemCode);
        const matchesDept = filterDepartment === 'all' || matchedItem?.department === filterDepartment;
        const matchesSearch = searchTerm === '' ||
          `${rc.itemCode} ${rc.receivedByName} ${rc.remark || ''} ${rc.supplierName || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesWarehouse = selectedWarehouseFilter === 'all' || rc.warehouse === selectedWarehouseFilter;
        return matchesDept && matchesSearch && matchesWarehouse;
      });

      filteredReceives.forEach((rc, index) => {
        const matchedItem = items.find((it) => it.itemCode === rc.itemCode);
        const itemDesc = matchedItem?.description || 'Unregistered';
        const row = [
          index + 1,
          rc.itemCode,
          itemDesc,
          rc.quantity,
          rc.supplierName || matchedItem?.supplierName || 'Default Vendor',
          rc.pricePerUnit || matchedItem?.pricePerUnit || 0,
          new Date(rc.receivedAt).toLocaleString('en-US'),
          rc.receivedByName,
          rc.receivedById,
          rc.warehouse || 'Main Warehouse',
          rc.remark || 'N/A'
        ];
        csvContent += row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",") + "\n";
      });
    }

    // Trigger download with BOM header so Excel opens it with proper UTF-8 mapping
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200">
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-amber-500/20 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin absolute"></div>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-black tracking-widest text-amber-500 uppercase">Verifying Session...</h2>
            <p className="text-xs text-slate-400 mt-2">Checking secure credential keys...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginScreen 
        onLoginSuccess={(customUser) => {
          if (customUser) {
            localStorage.setItem('cosmic_bypass_user', JSON.stringify(customUser));
            setUser(customUser);
          }
        }} 
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200">
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-amber-500/20 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin absolute"></div>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-black tracking-widest text-amber-500 uppercase">Syncing Cloud Database</h2>
            <p className="text-xs text-slate-400 mt-2">Connecting to real-time warehouse data tunnel across devices...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-950 via-slate-900 to-black text-slate-100 font-sans pb-12 flex flex-col antialiased relative overflow-hidden">
      {/* Informative top banner showing login status */}
      <div className="bg-gradient-to-r from-amber-500/20 via-indigo-600/10 to-transparent border-b border-amber-500/30 text-xs px-4 py-3 relative z-50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 font-medium">
          <div className="flex items-center gap-2 text-slate-200">
            <span className="bg-amber-400 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">
              🛡️ Dashboard Secure
            </span>
            <span>
              Device is Unlocked! Aap safety PIN lock bypass ke sath active hain. 
              <span className="hidden md:inline"> Screen lock karne ke liye side wala button dabayein!</span>
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              localStorage.removeItem('cosmic_bypass_user');
              setUser(null);
              try {
                await signOut(auth);
              } catch (e) {
                console.error("SignOut error:", e);
              }
            }}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black uppercase text-[10px] tracking-widest px-3 py-1.5 rounded-lg transition-all active:scale-95 flex items-center gap-1 cursor-pointer shrink-0"
          >
            <LogOut size={11} />
            🔐 Lock Screen / Log Out
          </button>
        </div>
      </div>

      {/* Dynamic ambient star fields or deep space glows */}
      <div className="absolute top-[-10%] left-[5%] w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[400px] h-[400px] bg-sky-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* 1. Header Block */}
      <header className="galaxy-glass text-white shadow-2xl relative overflow-hidden border-b border-white/10">
        {/* Subtle animated orbital glow */}
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-16 -left-16 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl animate-pulse" />

        <div className="max-w-7xl mx-auto px-4 py-6 md:py-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            
            {/* Ajanta Construction Company Brand Logo & Titles */}
            <div className="flex items-center gap-4">
              <div className="bg-white/10 p-2.5 rounded-2xl flex items-center justify-center shrink-0 shadow-2xl border border-white/15 backdrop-blur-md">
                <svg viewBox="0 0 21 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-9">
                  {/* Left Leg: Grey */}
                  <polygon points="9,0 12.5,0 5,15 0,15" fill="#E5E7EB" />
                  {/* Right Leg: Dark Blue */}
                  <polygon points="12.5,0 16,0 21,15 15,15" fill="#38BDF8" />
                  {/* Crossbar: Orange */}
                  <polygon points="5.5,9.5 18,9.5 19,12 4.5,12" fill="#F27215" />
                  {/* Belt Buckle: White outer frame */}
                  <rect x="13.5" y="10" width="2.5" height="1.6" fill="#FFFFFF" />
                  {/* Inner buckle: Orange */}
                  <rect x="14.3" y="10.4" width="0.9" height="0.8" fill="#F27215" />
                </svg>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-mono tracking-wider text-slate-400 uppercase">
                  <span className="font-extrabold text-amber-500 tracking-widest leading-none">Ajanta Build Hub</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-[10px] text-slate-300">Strength • Trust • Innovation</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black font-sans tracking-tight text-white mt-1 neon-text-sky">
                  Ajanta Construction Company
                </h1>
                <p className="text-xs text-slate-400 mt-1 max-w-xl font-medium">
                  Galaxy Digital Operations Control. Infinite real-time item synchronization, automated release matrices, and custom multi-format outputs.
                </p>
              </div>
            </div>

            {/* Header Action Row */}
            <div className="flex flex-wrap items-center gap-2 md:self-center">
              {/* User Profile Badge */}
              <div id="user-profile-badge" className="flex items-center gap-2 border border-white/10 bg-slate-900/50 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-mono select-none">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-slate-300 font-bold truncate max-w-[120px] sm:max-w-[160px]" title={user?.email || 'Anonymous Guest'}>
                    {user?.email ? user.email.split('@')[0] : 'Guest'}
                  </span>
                </div>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={async () => {
                    localStorage.removeItem('cosmic_bypass_user');
                    setUser(null);
                    try {
                      await signOut(auth);
                    } catch (e) {
                      console.error("SignOut error:", e);
                    }
                  }}
                  className="hover:text-rose-400 text-slate-400 active:scale-95 transition-all font-bold cursor-pointer text-[11px] flex items-center gap-1 focus:outline-none"
                >
                  <LogOut size={12} />
                  Exit
                </button>
              </div>

              <button
                type="button"
                id="btn-regist-item"
                onClick={() => {
                  setEditingItem(undefined);
                  setIsItemModalOpen(true);
                }}
                className="px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 active:bg-emerald-500/30 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 rounded-xl text-xs font-extrabold shadow-md glow-emerald transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle size={15} />
                Register New Item
              </button>

              <button
                type="button"
                id="btn-issue-stock"
                onClick={() => setIsIssueModalOpen(true)}
                className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 text-rose-300 hover:text-rose-200 border border-rose-500/30 rounded-xl text-xs font-extrabold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowDownRight size={15} />
                Issue Stock
              </button>

              <button
                type="button"
                id="btn-receive-stock"
                onClick={() => setIsReceiveModalOpen(true)}
                className="px-3.5 py-2.5 bg-slate-800/50 hover:bg-slate-800 hover:text-white text-slate-300 rounded-xl text-xs font-extrabold border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={15} />
                Refill/Add Stock
              </button>

              <button
                type="button"
                id="btn-pdf-hub"
                onClick={() => setIsPDFHubOpen(true)}
                className="px-4 py-2.5 bg-sky-500/15 hover:bg-sky-500/25 active:bg-sky-500/35 text-sky-300 hover:text-sky-200 border border-sky-500/30 rounded-xl text-xs font-extrabold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FileText size={15} />
                Report Center (PDF)
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Primary Layout wrapper */}
      <main className="max-w-7xl mx-auto px-4 mt-6 flex-grow w-full space-y-6">
        
        {/* Low Stock Warning Alert Area */}
        {criticalLowStockItems.length > 0 && showLowStockNotification && (
          <div 
            id="low-stock-global-alert"
            className="bg-amber-500/10 border border-amber-500/25 text-slate-100 rounded-2xl p-4 flex gap-3 shadow-2xl items-start animate-pulse"
          >
            <AlertTriangle className="text-amber-400 shrink-0 mt-0.5 animate-bounce" size={20} />
            <div className="flex-1">
              <span className="font-extrabold text-sm uppercase text-amber-400 tracking-wide block">
                ⚠️ Low Stock Alert (Quantity ≤ 10 units)
              </span>
              <p className="text-xs text-slate-300 mt-0.5 font-medium leading-relaxed">
                The stock levels for the following items have reached critically low thresholds (under 10 units). Please initiate restocking: {' '}
                <strong className="text-amber-300">
                  {criticalLowStockItems.map((it) => `${it.description} (${getCurrentStock(it.itemCode)} ${it.unit} left)`).join(', ')}
                </strong>
              </p>
            </div>
            <button 
              type="button"
              onClick={() => setShowLowStockNotification(false)}
              className="text-xs text-amber-400 hover:text-amber-200 font-bold uppercase shrink-0 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              Suppress
            </button>
          </div>
        )}

        {/* Collapsible live metrics & analytics section to fit the screen */}
        <div className="galaxy-glass border border-white/5 rounded-2xl overflow-hidden shadow-xl transition-all duration-300">
          <div 
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 backdrop-blur-md cursor-pointer hover:bg-slate-900/80 transition-all select-none"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Database size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase text-amber-300 tracking-wider font-sans flex items-center gap-2">
                  📈 Live Inventory Analytics & Trends 
                  {!showAnalytics && (
                    <span className="text-[10px] lowercase text-slate-500 font-semibold font-mono hidden md:inline-block">
                      (click to view charts & breakdowns)
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5">
                  Comprehensive monthly graphs, total valuations, stock warnings, and status tracking matrices.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 self-end sm:self-auto">
              {/* Compact collapsed stats preview */}
              {!showAnalytics && (
                <div className="flex items-center gap-2.5 text-[11px] font-mono font-black text-slate-400 mr-2 bg-slate-950/40 px-3 py-1.5 rounded-lg border border-white/5">
                  <span className="flex items-center gap-1">
                    📦 <span className="text-slate-200">{items.length} Distinct Items</span>
                  </span>
                  <span className="text-slate-700">|</span>
                  <span className="flex items-center gap-1">
                    ⚠️ <span className={criticalLowStockItems.length > 0 ? "text-amber-400 font-black animate-pulse" : "text-slate-300"}>{criticalLowStockItems.length} Low Stock</span>
                  </span>
                </div>
              )}

              <button
                type="button"
                className={`py-1.5 px-3 rounded-lg text-[10.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer select-none ${
                  showAnalytics 
                    ? "bg-amber-600/20 text-amber-300 border border-amber-500/30 hover:bg-amber-600/30" 
                    : "bg-amber-500 hover:bg-amber-400 text-slate-950"
                }`}
              >
                <span>{showAnalytics ? "Collapse" : "Expand"}</span>
                {showAnalytics ? <ChevronUp size={13} strokeWidth={3} /> : <ChevronDown size={13} strokeWidth={3} />}
              </button>
            </div>
          </div>

          {showAnalytics && (
            <div className="p-5 border-t border-white/5 space-y-6 animate-in slide-in-from-top duration-300">
              {/* Dashboard Stats Section */}
              <StatsGrid 
                items={items} 
                issues={issues} 
                receives={receives} 
                selectedWarehouseFilter={selectedWarehouseFilter}
                onLowStockClick={() => {
                  setActiveTab('inventory');
                  setFilterStockStatus('low');
                  setTimeout(() => {
                    const sec = document.getElementById('inventory-table-section');
                    if (sec) sec.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
                onOutOfStockClick={() => {
                  setActiveTab('inventory');
                  setFilterStockStatus('out');
                  setTimeout(() => {
                    const sec = document.getElementById('inventory-table-section');
                    if (sec) sec.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
                onDamagedStockClick={() => {
                  setActiveTab('inventory');
                  setFilterStockStatus('damaged');
                  setTimeout(() => {
                    const sec = document.getElementById('inventory-table-section');
                    if (sec) sec.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
                onRejectedStockClick={() => {
                  setActiveTab('inventory');
                  setFilterStockStatus('rejected');
                  setTimeout(() => {
                    const sec = document.getElementById('inventory-table-section');
                    if (sec) sec.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
                onExpiredStockClick={() => {
                  setActiveTab('inventory');
                  setFilterStockStatus('expired');
                  setTimeout(() => {
                    const sec = document.getElementById('inventory-table-section');
                    if (sec) sec.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
              />

              {/* Real-time Interactive Monthly Analytics Graphs */}
              <div className="border-t border-white/5 pt-5">
                <MonthlyAnalytics 
                  items={items} 
                  issues={issues} 
                  receives={receives} 
                  selectedWarehouseFilter={selectedWarehouseFilter}
                />
              </div>
            </div>
          )}
        </div>

        {/* Real-time Warning Stock Summary Panel */}
        {filterStockStatus !== 'all' && activeTab === 'inventory' && (
          <div className="galaxy-glass rounded-2xl p-4 mt-4 border border-indigo-500/20 bg-slate-900/60 backdrop-blur-md animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  filterStockStatus === 'low' ? 'bg-amber-500 animate-ping' : 
                  filterStockStatus === 'out' ? 'bg-red-500 animate-ping' : 
                  filterStockStatus === 'damaged' ? 'bg-orange-500 animate-ping' : 
                  filterStockStatus === 'rejected' ? 'bg-rose-500 animate-ping' : 'bg-red-500 animate-ping'
                }`}></span>
                <span className={`w-2 h-2 rounded-full absolute ${
                  filterStockStatus === 'low' ? 'bg-amber-500' : 
                  filterStockStatus === 'out' ? 'bg-red-500' : 
                  filterStockStatus === 'damaged' ? 'bg-orange-500' : 
                  filterStockStatus === 'rejected' ? 'bg-rose-500' : 'bg-red-500'
                }`}></span>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-100 pl-3">
                  {filterStockStatus === 'low' && '⚙️ Low Stock Summary Breakdown (≤10 Items)'}
                  {filterStockStatus === 'out' && '⚠️ Out of Stock Summary Breakdown (0 Items)'}
                  {filterStockStatus === 'damaged' && '🗑️ Damaged Materials Summary Breakdown'}
                  {filterStockStatus === 'rejected' && '🚫 Rejected Materials Summary Breakdown'}
                  {filterStockStatus === 'expired' && '📅 Expired Materials Summary Breakdown'}
                </h4>
              </div>
              <button 
                type="button" 
                onClick={() => setFilterStockStatus('all')}
                className="text-[10px] font-bold text-slate-300 hover:text-white uppercase transition-colors px-2 py-0.5 rounded bg-white/5 border border-white/10"
              >
                Show All Items (Clear Filter)
              </button>
            </div>
            
            <p className="text-[11px] text-slate-400 mb-2 font-medium">
              Below are the products under warning. Click on any product below to instantly locate and scroll down to its detailed record inside the catalog table:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {items.map(item => {
                const stock = getCurrentStock(item.itemCode);
                const match = 
                  filterStockStatus === 'low' ? (stock > 0 && stock <= 10) :
                  filterStockStatus === 'out' ? (stock === 0) :
                  filterStockStatus === 'damaged' ? ((item.damagedQty || 0) > 0) :
                  filterStockStatus === 'rejected' ? ((item.rejectedQty || 0) > 0) :
                  filterStockStatus === 'expired' ? ((item.expiredQty || 0) > 0) : false;

                if (!match) return null;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      const rowEl = document.getElementById(`row-item-${item.id}`);
                      if (rowEl) {
                        rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        rowEl.classList.add('bg-white/20', 'ring-2', 'ring-amber-500/50');
                        setTimeout(() => {
                          rowEl.classList.remove('bg-white/20', 'ring-2', 'ring-amber-500/50');
                        }, 2500);
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all hover:scale-[1.03] active:scale-95 cursor-pointer hover:shadow-md ${
                      filterStockStatus === 'low'
                        ? 'bg-amber-500/[0.04] text-amber-200 border-amber-500/25 hover:border-amber-400'
                        : filterStockStatus === 'out'
                        ? 'bg-red-500/[0.04] text-red-200 border-red-500/25 hover:border-red-400'
                        : filterStockStatus === 'damaged'
                        ? 'bg-orange-500/[0.04] text-orange-200 border-orange-500/25 hover:border-orange-400'
                        : filterStockStatus === 'rejected'
                        ? 'bg-rose-500/[0.04] text-rose-200 border-rose-500/25 hover:border-rose-400'
                        : 'bg-red-500/[0.04] text-red-200 border-red-500/25 hover:border-red-400'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <span className="font-mono text-[9px] block text-slate-400 tracking-wider font-extrabold truncate">[{item.itemCode}]</span>
                      <span className="text-[11px] font-black truncate block text-slate-100">{item.description}</span>
                    </div>
                    <span className={`text-[10px] font-black min-w-max px-2 py-0.5 rounded font-mono ${
                      filterStockStatus === 'low' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/10' :
                      filterStockStatus === 'out' ? 'bg-red-500/20 text-red-300 border border-red-500/10' :
                      filterStockStatus === 'damaged' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/10' :
                      filterStockStatus === 'rejected' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/10' :
                      'bg-red-500/20 text-red-300 border border-red-500/10'
                    }`}>
                      {filterStockStatus === 'low' || filterStockStatus === 'out' ? (
                        `${stock} ${item.unit}`
                      ) : filterStockStatus === 'damaged' ? (
                        `${item.damagedQty || 0} Damaged`
                      ) : filterStockStatus === 'rejected' ? (
                        `${item.rejectedQty || 0} Rejected`
                      ) : (
                        `${item.expiredQty || 0} Expired`
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Filter Panel & Table Container */}
        <div id="inventory-table-section" className="galaxy-glass rounded-3xl border border-white/5 shadow-2xl overflow-hidden flex flex-col mt-4">
          
          {/* Section Controller bar / Tabs */}
          <div className="border-b border-white/5 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 backdrop-blur-md">
            <div className="flex gap-2 p-1 bg-slate-950/40 rounded-xl max-w-md md:max-w-2xl w-full border border-white/5">
              {[
                { id: 'inventory', label: 'Registered Catalog', count: items.length },
                { id: 'issues', label: 'Issues History (Log)', count: issues.length },
                { id: 'receives', label: 'Supplier In-Flow', count: receives.length },
                { id: 'settings', label: '⚙️ Warehouses & Depts', count: warehouses.length + departments.length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setSearchTerm('');
                  }}
                  className={`flex-1 py-1.5 px-2 text-center rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <span className="truncate">{tab.label}</span>
                  <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-mono shrink-0 ${activeTab === tab.id ? 'bg-amber-700 text-white' : 'bg-slate-900 text-slate-400'}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCSVDownload}
                className="px-3 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 py-1.5 text-[10px] font-black rounded-lg border border-emerald-500/30 transition-shadow transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-md hover:shadow-emerald-500/5"
              >
                <Download size={11} />
                Export CSV (Excel)
              </button>
              <span className="text-[10px] font-mono text-slate-600 hidden sm:inline">|</span>
              <button
                type="button"
                onClick={handleClearHistory}
                className="px-3 py-1.5 text-[10px] font-bold text-slate-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg border border-white/5 hover:border-red-500/20 transition-all cursor-pointer"
              >
                Reset Database
              </button>
            </div>
          </div>

          {/* Universal Filtering Logic widgets */}
          <div className="p-5 border-b border-white/5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 bg-slate-900/40 backdrop-blur-lg">
            {/* Global Warehouse Selection Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-950/70 border border-amber-500/30 rounded-xl px-2.5 shadow-md">
              <Warehouse size={13} className="text-amber-400 shrink-0" />
              <select
                value={selectedWarehouseFilter}
                onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
                className="w-full text-xs font-black py-3 outline-none bg-transparent text-amber-300 border-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-slate-100 font-bold">📍 All Warehouses (Global)</option>
                {warehouses.map((wh) => (
                  <option key={wh} value={wh} className="bg-slate-900 text-slate-100 font-bold">🏢 {wh}</option>
                ))}
              </select>
            </div>

            {/* Search text input */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search description, code, etc..."
                className="w-full text-xs font-semibold pl-9 pr-3 py-3 border border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-slate-950/65 text-slate-100 placeholder-slate-500"
              />
            </div>

            {/* Department Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-950/50 border border-white/10 rounded-xl px-2.5">
              <Database size={13} className="text-amber-500 shrink-0" />
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="w-full text-xs font-bold py-3 outline-none bg-transparent text-slate-200 border-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-slate-100">Dept: All Departments</option>
                {departments.map((deptName) => (
                  <option key={deptName} value={deptName} className="bg-slate-900 text-slate-100">
                    Dept: {deptName}
                  </option>
                ))}
              </select>
            </div>

            {/* Unit Dropdown restriction */}
            <div className="flex items-center gap-1.5 bg-slate-950/50 border border-white/10 rounded-xl px-2.5">
              <Filter size={13} className="text-sky-400 shrink-0" />
              <select
                value={filterUnit}
                onChange={(e) => setFilterUnit(e.target.value)}
                className="w-full text-xs font-bold py-3 outline-none bg-transparent text-slate-200 border-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-slate-100">Unit: All Units</option>
                {['kg', 'pcs', 'box', 'ltr', 'mtr', 'roll', 'sheet', 'ho'].map((u) => (
                  <option key={u} value={u} className="bg-slate-900 text-slate-100">
                    Unit: {u.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Stock levels filter */}
            <div className="flex items-center gap-1.5 bg-slate-950/50 border border-white/10 rounded-xl px-2.5 opacity-90">
              <ShieldAlert size={13} className="text-rose-400 shrink-0" />
              <select
                value={filterStockStatus}
                onChange={(e) => setFilterStockStatus(e.target.value as any)}
                disabled={activeTab !== 'inventory'}
                className="w-full text-xs font-bold py-3 outline-none bg-transparent text-slate-200 border-none cursor-pointer disabled:opacity-50"
              >
                <option value="all" className="bg-slate-900 text-slate-100">Stock: All Levels</option>
                <option value="low" className="bg-slate-900 text-slate-100">Low Stock (≤10)</option>
                <option value="out" className="bg-slate-900 text-slate-100">Out of Stock (Zero)</option>
                <option value="damaged" className="bg-slate-900 text-slate-100">Damaged Items</option>
                <option value="rejected" className="bg-slate-900 text-slate-100">Rejected Items</option>
                <option value="expired" className="bg-slate-900 text-slate-100">Expired Items</option>
              </select>
            </div>

            {/* Real-time sync badge */}
            <div className="text-[10.5px] text-slate-400 bg-slate-950/40 px-3 py-2.5 rounded-xl flex items-center gap-2 border border-white/5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="leading-tight truncate">
                {activeTab === 'inventory' ? (
                  <span>Showing <strong>{filteredItemsList.length} items</strong></span>
                ) : activeTab === 'issues' ? (
                  <span>Showing <strong>{issues.length} release logs</strong></span>
                ) : (
                  <span>Showing <strong>{receives.length} refill logs</strong></span>
                )}
              </span>
            </div>
          </div>

          {/* 5. Core Content Renderer */}
          <div className="overflow-x-auto max-h-[580px] overflow-y-auto scrollbar-thin">
            {activeTab === 'inventory' && (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-950">
                  <tr className="border-b border-white/5 text-slate-300 text-[10px] font-black tracking-wider uppercase">
                    <th className="py-4 px-6 w-16">No.</th>
                    <th className="py-4 px-6 w-28">Item Code</th>
                    <th className="py-4 px-6 w-96">Description</th>
                    <th className="py-4 px-6">Unit</th>
                    <th className="py-4 px-6 text-right">Price/Unit</th>
                    <th className="py-4 px-6 text-center bg-white/5">Opening Stock</th>
                    <th className="py-4 px-6 text-center bg-white/10">Current Stock</th>
                    <th className="py-4 px-6 text-right">Stock Valuation</th>
                    <th className="py-4 px-6">Remark / Cabin Position</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {filteredItemsList.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500 italic">
                        No registered inventory items match. Register an item to start fresh.
                      </td>
                    </tr>
                  ) : (
                    filteredItemsList.map((item, index) => {
                      const computedStock = getCurrentStock(item.itemCode);
                      const isOutOfStock = computedStock === 0;
                      const isLowStock = computedStock > 0 && computedStock <= 10;
                      const totalValuation = computedStock * item.pricePerUnit;

                      return (
                        <tr 
                          key={item.id} 
                          id={`row-item-${item.id}`}
                          className={`hover:bg-white/[0.06] transition-all duration-300 border-l-4 ${
                            isOutOfStock 
                              ? 'bg-red-500/10 border-l-red-500' 
                              : isLowStock 
                              ? 'bg-amber-500/10 border-l-amber-500' 
                              : 'border-l-transparent'
                          }`}
                        >
                          <td className="py-3 px-6 text-slate-400 font-mono">{index + 1}</td>
                          <td className="py-3 px-6 font-extrabold text-slate-200 font-mono tracking-wide">
                            {item.itemCode}
                          </td>
                          <td className="py-3 px-6 font-medium text-slate-300">
                            <div>
                              <p className="font-bold text-white flex flex-wrap items-center gap-1.5">
                                <span>{item.description}</span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                  {item.department || 'Civil'}
                                </span>
                              </p>

                              {/* Supplier Space display */}
                              {item.supplierName && (
                                <div className="text-[10px] text-slate-400 font-medium flex flex-wrap items-center gap-1 mt-1 bg-white/5 py-0.5 px-1.5 rounded w-max border border-white/5">
                                  <span>🏢 Supplier: <strong className="text-slate-300 font-bold">{item.supplierName}</strong></span>
                                  {item.supplierContact && <span className="text-slate-500">({item.supplierContact})</span>}
                                </div>
                              )}

                              {/* Damage, Reject, Expired indicators */}
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {isOutOfStock && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-300 border border-red-500/25">
                                    ⚠️ OUT OF STOCK
                                  </span>
                                )}
                                {isLowStock && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/25">
                                    ⚠️ LOW STOCK ALERT
                                  </span>
                                )}
                                {item.damagedQty ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/25">
                                    🚨 Damaged: {item.damagedQty} {item.unit}
                                  </span>
                                ) : null}
                                {item.rejectedQty ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/25">
                                    🚫 Rejected: {item.rejectedQty} {item.unit}
                                  </span>
                                ) : null}
                                {item.expiredQty ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/25">
                                    ⏳ Expired: {item.expiredQty} {item.unit}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-6">
                            <span className="px-2 py-1 rounded-md bg-white/10 text-[10px] font-bold uppercase text-slate-300">
                              {item.unit}
                            </span>
                          </td>
                          <td className="py-3 px-6 text-right font-mono font-medium text-slate-300">
                            SAR {item.pricePerUnit.toFixed(2)}
                          </td>
                          <td className="py-3 px-6 text-center font-mono text-slate-400 bg-white/5">
                            {item.initialQty}
                          </td>
                          <td className="py-3 px-6 text-center bg-white/10">
                            <span className={`px-3 py-1.5 rounded-xl font-black font-mono text-sm ${
                              isOutOfStock 
                                ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                                : isLowStock 
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              {computedStock}
                            </span>
                          </td>
                          <td className="py-3 px-6 text-right font-mono font-bold text-slate-100">
                            SAR {totalValuation.toLocaleString('en-SA')}
                          </td>
                          <td className="py-3 px-6 text-slate-400 font-medium">
                            {item.remark || '-'}
                          </td>
                          <td className="py-3 px-6">
                            <div className="flex items-center justify-center gap-2">
                              {/* Direct issue key */}
                              <button
                                type="button"
                                title="Issue Stock directly"
                                onClick={() => {
                                  setIsIssueModalOpen(true);
                                }}
                                className="p-2.5 bg-red-500/10 text-red-300 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/20 cursor-pointer"
                              >
                                <ArrowDownRight size={13} />
                              </button>

                              {/* Direct refill key */}
                              <button
                                type="button"
                                title="Refill Stock"
                                onClick={() => {
                                  setIsReceiveModalOpen(true);
                                }}
                                className="p-2.5 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 rounded-lg transition-colors border border-emerald-500/20 cursor-pointer"
                              >
                                <Plus size={13} />
                              </button>

                              {/* Edit details */}
                              <button
                                type="button"
                                title="Edit Item definitions"
                                onClick={() => {
                                  setEditingItem(item);
                                  setIsItemModalOpen(true);
                                }}
                                className="p-2.5 bg-slate-50 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                              >
                                <Edit3 size={12} />
                              </button>

                              {/* Erase */}
                              <button
                                type="button"
                                title="Erase item registry"
                                onClick={() => handleDeleteItem(item.id, item.itemCode)}
                                className="p-2.5 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {/* Released Stock History Table */}
            {activeTab === 'issues' && (
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead className="sticky top-0 z-10 bg-slate-950">
                  <tr className="border-b border-white/5 text-slate-300 text-[10px] uppercase font-black tracking-wider">
                    <th className="py-4 px-6">Sl No.</th>
                    <th className="py-4 px-6">Released Item Code</th>
                    <th className="py-4 px-6">Issued To / Receiver</th>
                    <th className="py-4 px-6 text-center">Released Quantity</th>
                    <th className="py-4 px-6">Issued Date & Time</th>
                    <th className="py-4 px-6">Released By (Name / Employee ID)</th>
                    <th className="py-4 px-6">Operational Purpose / Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {issues.filter(is => {
                    const matchesDept = filterDepartment === 'all' || is.department === filterDepartment;
                    const matchesSearch = searchTerm === '' || 
                      `${is.itemCode} ${is.issuedTo} ${is.issuedByName}`.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesWarehouse = selectedWarehouseFilter === 'all' || is.warehouse === selectedWarehouseFilter;
                    return matchesDept && matchesSearch && matchesWarehouse;
                  }).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 italic">
                        No released issue transactions match filter query.
                      </td>
                    </tr>
                  ) : (
                    issues.filter(is => {
                      const matchesDept = filterDepartment === 'all' || is.department === filterDepartment;
                      const matchesSearch = searchTerm === '' || 
                        `${is.itemCode} ${is.issuedTo} ${is.issuedByName}`.toLowerCase().includes(searchTerm.toLowerCase());
                      const matchesWarehouse = selectedWarehouseFilter === 'all' || is.warehouse === selectedWarehouseFilter;
                      return matchesDept && matchesSearch && matchesWarehouse;
                    }).map((is, index) => {
                      const itemDesc = items.find((it) => it.itemCode === is.itemCode)?.description || 'Unregistered Registry';
                      const unitCat = items.find((it) => it.itemCode === is.itemCode)?.unit || '';

                      return (
                        <tr key={is.id} className="hover:bg-white/[0.03] transition-colors font-sans">
                          <td className="py-3 px-6 text-slate-500 font-mono">{index + 1}</td>
                          <td className="py-3 px-6 font-bold font-mono text-slate-100">
                            <div>
                              <span className="text-amber-400 font-black">{is.itemCode}</span>
                              <span className="block text-[10.5px] font-normal text-slate-400 leading-tight mt-0.5">
                                {itemDesc}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-6 font-bold text-slate-200">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span>{is.issuedTo}</span>
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30">
                                {is.department || 'Civil'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-6 text-center bg-red-500/5">
                            <span className="px-3 py-1 bg-red-500/15 border border-red-500/20 text-red-300 rounded-lg font-bold font-mono">
                              -{is.quantity} {unitCat}
                            </span>
                          </td>
                          <td className="py-3 px-6 font-medium text-slate-300">
                            {new Date(is.issuedAt).toLocaleString('en-US')}
                          </td>
                          <td className="py-3 px-6 text-slate-300">
                            <div className="text-slate-100 font-bold">{is.issuedByName}</div>
                            <div className="text-[10px] font-mono text-slate-400">ID: {is.issuedById}</div>
                            <div className="text-[10px] font-mono text-amber-400 font-bold mt-1">🏬 {is.warehouse || 'Main Warehouse'}</div>
                          </td>
                          <td className="py-3 px-6 text-slate-400 italic">
                            {is.remark || 'N/A'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {/* Received Stock In Flow logs */}
            {activeTab === 'receives' && (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-950">
                  <tr className="border-b border-white/5 text-slate-300 text-[10px] uppercase font-black tracking-wider">
                    <th className="py-4 px-6">Sl No.</th>
                    <th className="py-4 px-6">Received Item Code</th>
                    <th className="py-4 px-6 text-center font-bold">Qty Added</th>
                    <th className="py-4 px-6">Supplier Details</th>
                    <th className="py-4 px-6">Unit Price</th>
                    <th className="py-4 px-6">Received On</th>
                    <th className="py-4 px-6">Received By (Name / ID)</th>
                    <th className="py-4 px-6">Vendor / Delivery Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {receives.filter(rc => {
                    const matchedItem = items.find(it => it.itemCode === rc.itemCode);
                    const matchesDept = filterDepartment === 'all' || matchedItem?.department === filterDepartment;
                    const matchesSearch = searchTerm === '' ||
                      `${rc.itemCode} ${rc.receivedByName} ${rc.remark || ''} ${rc.supplierName || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesWarehouse = selectedWarehouseFilter === 'all' || rc.warehouse === selectedWarehouseFilter;
                    return matchesDept && matchesSearch && matchesWarehouse;
                  }).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500 italic">
                        No received log transactions found.
                      </td>
                    </tr>
                  ) : (
                    receives.filter(rc => {
                      const matchedItem = items.find(it => it.itemCode === rc.itemCode);
                      const matchesDept = filterDepartment === 'all' || matchedItem?.department === filterDepartment;
                      const matchesSearch = searchTerm === '' ||
                        `${rc.itemCode} ${rc.receivedByName} ${rc.remark || ''} ${rc.supplierName || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
                      const matchesWarehouse = selectedWarehouseFilter === 'all' || rc.warehouse === selectedWarehouseFilter;
                      return matchesDept && matchesSearch && matchesWarehouse;
                    }).map((rc, index) => {
                      const matchedItem = items.find((it) => it.itemCode === rc.itemCode);
                      const itemDesc = matchedItem?.description || 'Unregistered';
                      const unitCat = matchedItem?.unit || '';

                      return (
                        <tr key={rc.id} className="hover:bg-white/[0.03] transition-colors">
                          <td className="py-3 px-6 text-slate-500 font-mono">{index + 1}</td>
                          <td className="py-3 px-6 font-bold font-mono text-slate-100">
                            <div>
                              <span>{rc.itemCode}</span>
                              <span className="block text-[10.5px] font-normal text-slate-400">
                                {itemDesc}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-6 text-center bg-emerald-500/5">
                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-300 rounded-lg border border-emerald-500/20 font-bold font-mono">
                              +{rc.quantity} {unitCat}
                            </span>
                          </td>
                          <td className="py-3 px-6 text-slate-300">
                            <span className="font-semibold text-slate-200">
                              {rc.supplierName || matchedItem?.supplierName || 'Default Vendor'}
                            </span>
                          </td>
                          <td className="py-3 px-6 text-slate-300 font-mono font-bold">
                            {rc.pricePerUnit ? (
                              <span className="text-emerald-400">SAR {rc.pricePerUnit}</span>
                            ) : matchedItem?.pricePerUnit ? (
                              <span className="text-slate-400">SAR {matchedItem.pricePerUnit}</span>
                            ) : (
                              <span className="text-slate-600">N/A</span>
                            )}
                          </td>
                          <td className="py-3 px-6 font-medium text-slate-300">
                            {new Date(rc.receivedAt).toLocaleString('en-US')}
                          </td>
                          <td className="py-3 px-6 text-slate-300">
                            <div className="text-slate-100 font-semibold">{rc.receivedByName}</div>
                            <div className="text-[10px] font-mono text-slate-400">ID: {rc.receivedById}</div>
                            <div className="text-[10px] font-mono text-amber-400 font-bold mt-1">🏬 {rc.warehouse || 'Main Warehouse'}</div>
                          </td>
                          <td className="py-3 px-6 text-slate-400">
                            {rc.remark || 'N/A'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'settings' && (
              <div className="p-6 text-slate-100 bg-slate-950/25 border-t border-white/5 max-w-full">
                <div className="mb-6 bg-slate-900/30 p-4 rounded-xl border border-white/5">
                  <h3 className="text-sm font-black uppercase text-amber-400 tracking-wider flex items-center gap-2 font-sans">
                    ⚙️ Master Configuration & Operating Settings
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-semibold">
                    Manage active store Warehouse Locations and Requesting Departments in real-time. Added options are immediately synchronized with the Firestore database and become available instantly in all forms (Register, Issue, Refill) and filters across all devices.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Column 1: Warehouses */}
                  <div className="bg-slate-900/40 p-5 rounded-2xl border border-white/5 flex flex-col space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="font-extrabold text-xs text-slate-200 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                        🏢 Warehouse Locations ({warehouses.length})
                      </span>
                    </div>

                    {/* Inline Form to Add Warehouse */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={settingsNewWh}
                        onChange={(e) => setSettingsNewWh(e.target.value)}
                        placeholder="e.g. Yard C Sub-Depot"
                        className="flex-1 text-xs border border-white/10 rounded-xl px-3 py-2.5 bg-slate-950 text-slate-100 placeholder-slate-600 outline-none focus:border-amber-500 font-semibold"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const val = settingsNewWh.trim();
                          if (!val) return;
                          if (warehouses.includes(val)) {
                            window.alert("This warehouse location is already registered.");
                            return;
                          }
                          await handleAddWarehouse(val);
                          setSettingsNewWh('');
                        }}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-550 text-white font-extrabold text-xs rounded-xl active:scale-95 transition-all cursor-pointer shadow-md select-none shrink-0"
                      >
                        Add Location
                      </button>
                    </div>

                    {/* Warehouses list */}
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {warehouses.map((wh) => {
                        const isDefault = ['Main Warehouse', 'Shed A Warehouse', 'Sub-Depot Warehouse'].includes(wh);
                        return (
                          <div 
                            key={wh} 
                            className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-white/5 hover:border-white/10 transition-colors"
                          >
                            <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5 font-sans">
                              🏢 {wh}
                            </span>
                            {isDefault ? (
                              <span className="text-[9px] font-extrabold text-slate-500 uppercase flex items-center gap-1 tracking-wider mr-2">
                                🔒 Locked
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDeleteWarehouse(wh)}
                                className="p-1.5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer mr-1"
                                title="Delete Custom Warehouse"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Column 2: Departments */}
                  <div className="bg-slate-900/40 p-5 rounded-2xl border border-white/5 flex flex-col space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="font-extrabold text-xs text-slate-200 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                        🛠️ Requesting Departments ({departments.length})
                      </span>
                    </div>

                    {/* Inline Form to Add Department */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={settingsNewDept}
                        onChange={(e) => setSettingsNewDept(e.target.value)}
                        placeholder="e.g. Landscaping & Civil"
                        className="flex-1 text-xs border border-white/10 rounded-xl px-3 py-2.5 bg-slate-950 text-slate-100 placeholder-slate-600 outline-none focus:border-amber-500 font-semibold"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const val = settingsNewDept.trim();
                          if (!val) return;
                          if (departments.includes(val)) {
                            window.alert("This requesting department is already registered.");
                            return;
                          }
                          await handleAddDepartment(val);
                          setSettingsNewDept('');
                        }}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-550 text-white font-extrabold text-xs rounded-xl active:scale-95 transition-all cursor-pointer shadow-md select-none shrink-0"
                      >
                        Add Dept
                      </button>
                    </div>

                    {/* Departments list */}
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {departments.map((deptName) => {
                        const isDefault = ['Civil', 'Electrical', 'Plumbing', 'Safety', 'Machinery', 'Tools', 'Other'].includes(deptName);
                        return (
                          <div 
                            key={deptName} 
                            className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-white/5 hover:border-white/10 transition-colors"
                          >
                            <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5 font-sans">
                              🛠️ {deptName}
                            </span>
                            {isDefault ? (
                              <span className="text-[9px] font-extrabold text-slate-500 uppercase flex items-center gap-1 tracking-wider mr-2">
                                🔒 Locked
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDeleteDepartment(deptName)}
                                className="p-1.5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer mr-1"
                                title="Delete Custom Department"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Table Footer */}
          <div className="border-t border-white/5 p-4 bg-slate-950/40 flex justify-between items-center text-xs text-slate-400">
            <span>Showing filtered active store logs.</span>
            <span className="font-mono text-[9px] text-slate-500">Ajanta Construction Company • Real-Time Database Sync</span>
          </div>

        </div>

      </main>

      {/* 6. Dynamic Modals orchestration block */}
      <ItemFormModal
        isOpen={isItemModalOpen}
        onClose={() => {
          setIsItemModalOpen(false);
          setEditingItem(undefined);
        }}
        onSave={handleSaveItem}
        existingItem={editingItem}
        allItems={items}
        departments={departments}
        onAddDepartment={handleAddDepartment}
      />

      <IssueFormModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        onIssue={handleIssueItem}
        items={items}
        getCurrentStock={getCurrentStock}
        warehouses={warehouses}
        departments={departments}
        onAddWarehouse={handleAddWarehouse}
        onAddDepartment={handleAddDepartment}
      />

      <ReceiveFormModal
        isOpen={isReceiveModalOpen}
        onClose={() => setIsReceiveModalOpen(false)}
        onReceive={handleReceiveItem}
        items={items}
        warehouses={warehouses}
        onAddWarehouse={handleAddWarehouse}
      />

      <PDFReportHubModal
        isOpen={isPDFHubOpen}
        onClose={() => setIsPDFHubOpen(false)}
        items={items}
        issues={issues}
        receives={receives}
      />
    </div>
  );
}
