import React, { useState, useEffect, useMemo } from 'react';
import { 
  Film, ShoppingCart, ClipboardList, Package, Plus, Minus, 
  Trash2, CheckCircle, Clock, Tag, Search, Edit, X, Database, AlertCircle, RotateCcw, Phone, Info
} from 'lucide-react';

// Konfigurasi Database
const DB_NAME = 'SewaPropDB_V2';
const DB_VERSION = 1;
const STORES = {
  INVENTORY: 'inventory',
  TRANSACTIONS: 'transactions'
};

const initialInventory = [
  { id: 1, name: 'Pedang Lightsaber (Replika)', price: 50000, stock: 5, category: 'Senjata' },
  { id: 2, name: 'Topeng Batman', price: 35000, stock: 3, category: 'Kostum' },
  { id: 3, name: 'Kamera Vintage 16mm', price: 150000, stock: 2, category: 'Peralatan' },
  { id: 4, name: 'Revolver (Properti Kosong)', price: 40000, stock: 8, category: 'Senjata' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('kasir');
  const [isDbReady, setIsDbReady] = useState(false);
  
  // State Utama
  const [inventory, setInventory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  
  // State UI Kasir
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [rentalDays, setRentalDays] = useState('1');
  const [discountPercent, setDiscountPercent] = useState('0');
  
  // State Modal & Notifikasi
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', price: '', stock: '', category: 'Senjata' });
  const [alertModal, setAlertModal] = useState({ open: false, title: '', message: '', type: 'info' });

  // --- NATIVE INDEXEDDB HELPERS ---
  const openDatabase = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORES.INVENTORY)) db.createObjectStore(STORES.INVENTORY, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(STORES.TRANSACTIONS)) db.createObjectStore(STORES.TRANSACTIONS, { keyPath: 'id' });
      };
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });
  };

  const dbOps = {
    getAll: async (storeName) => {
      const db = await openDatabase();
      return new Promise((resolve) => {
        const req = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result);
      });
    },
    put: async (storeName, data) => {
      const db = await openDatabase();
      return new Promise((resolve) => {
        const req = db.transaction(storeName, 'readwrite').objectStore(storeName).put(data);
        req.onsuccess = () => resolve();
      });
    },
    clear: async (storeName) => {
      const db = await openDatabase();
      return new Promise((resolve) => {
        const req = db.transaction(storeName, 'readwrite').objectStore(storeName).clear();
        req.onsuccess = () => resolve();
      });
    }
  };

  // --- INITIAL LOAD ---
  useEffect(() => {
    const initApp = async () => {
      try {
        let invData = await dbOps.getAll(STORES.INVENTORY);
        if (invData.length === 0) {
          for (const item of initialInventory) await dbOps.put(STORES.INVENTORY, item);
          invData = initialInventory;
        }
        const trxData = await dbOps.getAll(STORES.TRANSACTIONS);
        setInventory(invData);
        setTransactions(trxData.sort((a, b) => b.timestamp - a.timestamp));
        setIsDbReady(true);
      } catch (err) {
        setInventory(initialInventory);
        setIsDbReady(true);
      }
    };
    initApp();
  }, []);

  // --- SYNC FUNCTIONS ---
  const syncInventory = async (newInv) => {
    setInventory(newInv);
    await dbOps.clear(STORES.INVENTORY);
    for (const item of newInv) await dbOps.put(STORES.INVENTORY, item);
  };

  const showAlert = (title, message, type = 'info') => {
    setAlertModal({ open: true, title, message, type });
  };

  // --- LOGIKA BISNIS ---
  const filteredInventory = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const result = inventory.filter(i => i.name.toLowerCase().includes(query));
    // Batasi 12 item jika tidak sedang mencari secara spesifik
    return query === '' ? result.slice(0, 12) : result;
  }, [inventory, searchQuery]);

  const addToCart = (item) => {
    const invItem = inventory.find(i => i.id === item.id);
    const existing = cart.find(c => c.id === item.id);
    const currentQty = existing ? existing.quantity : 0;

    if (invItem.stock > currentQty) {
      if (existing) {
        setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
      } else {
        setCart([...cart, { ...item, quantity: 1 }]);
      }
    } else {
      showAlert("Stok Habis", `Maaf, stok ${item.name} sudah mencapai batas maksimum.`, "warning");
    }
  };

  const handleCheckout = async () => {
    if (!customerName.trim()) return showAlert("Data Kurang", "Harap isi nama penyewa!", "error");
    if (!customerPhone.trim()) return showAlert("Data Kurang", "Harap isi nomor HP penyewa!", "error");
    
    const days = parseInt(rentalDays) || 1;
    const disc = parseFloat(discountPercent) || 0;
    const subtotal = cart.reduce((s, i) => s + (i.price * i.quantity), 0) * days;
    const total = subtotal * (1 - (disc / 100));

    const newTrx = {
      id: `TRX-${Date.now()}`,
      timestamp: Date.now(),
      date: new Date().toLocaleString('id-ID'),
      customerName: customerName.toUpperCase(),
      customerPhone,
      items: JSON.parse(JSON.stringify(cart)),
      days,
      discountPercent: disc,
      total,
      status: 'Dipinjam'
    };

    const updatedInv = inventory.map(invItem => {
      const cItem = cart.find(c => c.id === invItem.id);
      return cItem ? { ...invItem, stock: invItem.stock - cItem.quantity } : invItem;
    });

    await syncInventory(updatedInv);
    setTransactions([newTrx, ...transactions]);
    await dbOps.put(STORES.TRANSACTIONS, newTrx);
    
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setRentalDays('1');
    setDiscountPercent('0');
    showAlert("Berhasil", "Transaksi penyewaan telah disimpan.", "success");
  };

  const handleReturn = async (trx) => {
    const updatedInv = inventory.map(invItem => {
      const rItem = trx.items.find(ri => ri.id === invItem.id);
      return rItem ? { ...invItem, stock: invItem.stock + rItem.quantity } : invItem;
    });
    
    const updatedTrx = { ...trx, status: 'Dikembalikan', returnDate: new Date().toLocaleString('id-ID') };
    
    await syncInventory(updatedInv);
    setTransactions(transactions.map(t => t.id === trx.id ? updatedTrx : t));
    await dbOps.put(STORES.TRANSACTIONS, updatedTrx);
  };

  const handleUndoReturn = async (trx) => {
    // 1. Validasi kecukupan stok di inventaris saat ini
    const updatedInv = [...inventory];
    let canUndo = true;

    for (const rItem of trx.items) {
      const invIdx = updatedInv.findIndex(i => i.id === rItem.id);
      if (invIdx === -1) {
        showAlert("Error", `Barang ${rItem.name} tidak ditemukan di inventaris.`, "error");
        return;
      }
      if (updatedInv[invIdx].stock < rItem.quantity) {
        canUndo = false;
        break;
      }
      updatedInv[invIdx].stock -= rItem.quantity;
    }

    if (!canUndo) {
      showAlert("Gagal Batal", "Stok di gudang tidak cukup untuk ditarik kembali ke peminjaman.", "error");
      return;
    }

    // 2. Jika valid, update status dan inventaris
    const updatedTrx = { ...trx, status: 'Dipinjam', returnDate: null };
    
    await syncInventory(updatedInv);
    setTransactions(transactions.map(t => t.id === trx.id ? updatedTrx : t));
    await dbOps.put(STORES.TRANSACTIONS, updatedTrx);
    showAlert("Berhasil", "Pengembalian dibatalkan, status kembali 'Dipinjam'.", "success");
  };

  const handleInventorySubmit = async (e) => {
    e.preventDefault();
    const itemData = {
      ...formData,
      id: editingItem ? editingItem.id : Date.now(),
      price: Number(formData.price),
      stock: Number(formData.stock)
    };
    const updated = editingItem ? inventory.map(i => i.id === editingItem.id ? itemData : i) : [...inventory, itemData];
    await syncInventory(updated);
    setIsModalOpen(false);
  };

  const formatIDR = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

  if (!isDbReady) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-40 shadow-xl border-b border-amber-500/20">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <Film className="w-8 h-8 text-amber-500" />
            <h1 className="text-2xl font-black italic tracking-tighter">SEWA<span className="text-amber-500">PROP</span></h1>
          </div>
          <nav className="flex bg-slate-800 p-1 rounded-2xl w-full md:w-auto">
            {['kasir', 'transaksi', 'inventaris'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-amber-500 text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        {activeTab === 'kasir' && (
          <div className="grid lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
            <div className="lg:col-span-2 space-y-6">
              <div className="relative group">
                <Search className="absolute left-4 top-4 w-5 h-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                <input type="text" placeholder="Cari perlengkapan film..." className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-amber-500 shadow-sm transition-all" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              
              <div className="grid sm:grid-cols-2 gap-4">
                {filteredInventory.map(item => (
                  <div key={item.id} className="bg-white p-6 rounded-3xl border-2 border-slate-100 flex flex-col justify-between hover:border-amber-400 transition-all shadow-sm hover:shadow-md">
                    <div>
                      <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-md uppercase tracking-tighter">{item.category}</span>
                      <h3 className="text-lg font-black mt-2 uppercase leading-tight line-clamp-1">{item.name}</h3>
                      <p className="text-amber-600 font-black mt-1">{formatIDR(item.price)}</p>
                    </div>
                    <div className="mt-6 flex items-center justify-between border-t pt-4">
                      <span className={`text-xs font-bold ${item.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>Tersedia: {item.stock}</span>
                      <button onClick={() => addToCart(item)} disabled={item.stock === 0} className="p-2 bg-slate-900 text-white rounded-xl hover:bg-amber-500 hover:text-slate-900 disabled:opacity-20 transition-all">
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
                {inventory.length > 12 && searchQuery === '' && (
                  <div className="sm:col-span-2 text-center py-4 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                      <Info className="w-3 h-3" /> Gunakan pencarian untuk melihat item lainnya
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-xl h-fit sticky top-28">
              <h2 className="text-xl font-black mb-6 flex items-center gap-2 uppercase tracking-tighter border-b pb-4"><ShoppingCart className="text-amber-500" /> Checkout</h2>
              <div className="space-y-3 mb-8 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {cart.length === 0 ? <p className="text-center text-slate-400 py-10 italic border-2 border-dashed rounded-3xl">Keranjang Kosong</p> : 
                  cart.map(item => (
                    <div key={item.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black truncate uppercase">{item.name}</p>
                        <p className="text-[10px] text-slate-500 font-bold">{formatIDR(item.price)}</p>
                      </div>
                      <div className="flex items-center gap-3 bg-white px-2 py-1 rounded-xl border border-slate-200 shadow-sm">
                        <button onClick={() => setCart(cart.map(c => c.id === item.id ? {...c, quantity: Math.max(1, c.quantity-1)} : c))} className="text-slate-400 hover:text-red-500"><Minus className="w-3 h-3"/></button>
                        <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                        <button onClick={() => addToCart(item)} className="text-slate-400 hover:text-amber-500"><Plus className="w-3 h-3"/></button>
                      </div>
                    </div>
                  ))
                }
              </div>

              <div className="space-y-4 pt-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Penyewa</label>
                  <input type="text" placeholder="CONTOH: BUDI SUDARSONO" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-50 outline-none focus:border-amber-500 text-xs font-black placeholder:text-slate-300" />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nomor WhatsApp</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                    <input type="tel" placeholder="0812XXXXXXXX" value={customerPhone} onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, ''))} className="w-full pl-10 pr-4 py-3.5 bg-slate-50 rounded-2xl border-2 border-slate-50 outline-none focus:border-amber-500 text-xs font-black" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Durasi</label>
                    <div className="relative">
                      <input type="number" value={rentalDays} onChange={e => setRentalDays(e.target.value)} onBlur={() => rentalDays === "" && setRentalDays("1")} className="w-full p-3 bg-slate-50 rounded-xl outline-none font-bold text-center border-2 border-slate-50 focus:border-amber-500" />
                      <span className="absolute right-3 top-3.5 text-[10px] font-black text-slate-400 uppercase">Hari</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Diskon (%)</label>
                    <input type="number" value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} onBlur={() => discountPercent === "" && setDiscountPercent("0")} className="w-full p-3 bg-slate-50 rounded-xl outline-none font-bold text-center border-2 border-slate-50 focus:border-amber-500" />
                  </div>
                </div>

                <div className="bg-slate-900 p-5 rounded-3xl text-white mt-4 shadow-lg border-t-4 border-amber-500">
                  <div className="flex justify-between items-center text-lg font-black italic uppercase">
                    <span>Total Bayar</span>
                    <span className="text-amber-400 text-xl font-black">{formatIDR(cart.reduce((s, i) => s + (i.price * i.quantity), 0) * (parseInt(rentalDays) || 1) * (1 - (parseFloat(discountPercent) || 0) / 100))}</span>
                  </div>
                </div>

                <button onClick={handleCheckout} disabled={cart.length === 0} className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 text-slate-900 font-black rounded-3xl transition-all uppercase text-xs tracking-[0.2em] shadow-lg active:scale-95">
                  Simpan Transaksi
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transaksi' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {transactions.length === 0 ? <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed text-slate-400 font-bold uppercase tracking-widest">Data Transaksi Kosong</div> : 
              transactions.map(trx => (
                <div key={trx.id} className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-6 flex flex-col md:flex-row justify-between gap-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-2 h-full ${trx.status === 'Dipinjam' ? 'bg-amber-500' : 'bg-green-500'}`}></div>
                  <div className="space-y-4 flex-1 pl-4">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 bg-slate-900 text-white rounded text-[10px] font-black">{trx.id}</span>
                      <span className="text-xs text-slate-400 uppercase font-bold tracking-tighter">{trx.date}</span>
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter leading-none">{trx.customerName}</h3>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1 uppercase"><Phone className="w-3 h-3 text-amber-500"/> {trx.customerPhone}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {trx.items.map((it, idx) => (
                        <span key={idx} className="bg-slate-50 text-slate-600 text-[10px] font-black px-3 py-1.5 rounded-xl border border-slate-100 uppercase italic">{it.name} (x{it.quantity})</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col md:items-end justify-between gap-4 border-t md:border-t-0 pt-4 md:pt-0">
                    <div className="md:text-right">
                      <p className="text-2xl font-black text-slate-900 tracking-tighter">{formatIDR(trx.total)}</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{trx.days} Hari • Diskon {trx.discountPercent}%</p>
                    </div>
                    <div className="flex flex-col gap-2 min-w-[180px]">
                      {trx.status === 'Dipinjam' ? (
                        <button onClick={() => handleReturn(trx)} className="w-full px-6 py-3 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"><Clock className="w-4 h-4" /> Kembalikan</button>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-full flex items-center justify-center gap-2 bg-green-50 text-green-700 px-4 py-3 rounded-2xl border border-green-100 font-black text-[10px] uppercase italic">
                            <CheckCircle className="w-4 h-4" /> Sudah Kembali
                          </div>
                          <button 
                            onClick={() => handleUndoReturn(trx)} 
                            className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-amber-600 flex items-center gap-1.5 transition-colors p-2"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Batal Kembalikan
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {activeTab === 'inventaris' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-6 rounded-3xl border-2 border-slate-100 gap-4">
               <h2 className="text-xl font-black tracking-tighter uppercase italic">Inventaris <span className="text-amber-500">Properti</span></h2>
               <button onClick={() => { setEditingItem(null); setFormData({name:'', price:'', stock:'', category:'Senjata'}); setIsModalOpen(true); }} className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-amber-500 hover:text-slate-900 transition-all shadow-xl"><Plus className="w-4 h-4" /> Tambah Properti</button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {inventory.map(item => (
                <div key={item.id} className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-100 group relative hover:border-amber-400 transition-all shadow-sm">
                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => { setEditingItem(item); setFormData(item); setIsModalOpen(true); }} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Edit className="w-4 h-4"/></button>
                    <button onClick={() => { if(window.confirm('Hapus?')) deleteInventoryItem(item.id) }} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"><Trash2 className="w-4 h-4"/></button>
                  </div>
                  <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg truncate pr-12">{item.name}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{item.category}</p>
                  <div className="flex justify-between items-end border-t pt-4">
                    <div>
                      <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Harga</p>
                      <p className="font-black text-slate-900">{formatIDR(item.price)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Stok</p>
                      <p className={`text-xl font-black ${item.stock === 0 ? 'text-red-500' : 'text-slate-900'}`}>{item.stock}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL FORM INVENTARIS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl overflow-hidden border-4 border-white">
            <div className="p-8 pb-4 flex justify-between items-center border-b-2 border-slate-50">
              <h3 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter">{editingItem ? 'Edit' : 'Tambah'} Item</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400"/></button>
            </div>
            <form onSubmit={handleInventorySubmit} className="p-8 space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Properti</label>
                <input required className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:border-amber-500 font-black text-xs uppercase" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}/>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kategori</label>
                <select className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:border-amber-500 font-black text-xs uppercase appearance-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  <option>Senjata</option><option>Kostum</option><option>Peralatan</option><option>Kendaraan</option><option>Properti Set</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Harga / Hari</label>
                  <input type="number" required className="w-full p-4 bg-slate-50 rounded-2xl font-black text-xs outline-none focus:border-amber-500" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})}/>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Stok Awal</label>
                  <input type="number" required className="w-full p-4 bg-slate-50 rounded-2xl font-black text-xs outline-none focus:border-amber-500" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})}/>
                </div>
              </div>
              <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-[0.4em] hover:bg-amber-500 hover:text-slate-900 transition-all shadow-xl text-[10px] mt-6 italic">Simpan Data</button>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM ALERT MODAL */}
      {alertModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in zoom-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl p-8 text-center border-t-8 border-amber-500">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              {alertModal.type === 'error' ? <AlertCircle className="w-8 h-8 text-red-500" /> : <Info className="w-8 h-8 text-amber-500" />}
            </div>
            <h4 className="text-xl font-black uppercase italic tracking-tighter mb-2">{alertModal.title}</h4>
            <p className="text-sm text-slate-500 font-bold leading-relaxed mb-6">{alertModal.message}</p>
            <button onClick={() => setAlertModal({ ...alertModal, open: false })} className="w-full py-3.5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}