import React, { useState, useEffect } from 'react';
import { 
  Film, ShoppingCart, ClipboardList, Package, Plus, Minus, 
  Trash2, CheckCircle, Clock, Tag, Search, Edit, X, Database, AlertCircle
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
  const [dbError, setDbError] = useState(null);
  
  // State Utama
  const [inventory, setInventory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  
  // State UI
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [rentalDays, setRentalDays] = useState(1);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', price: '', stock: '', category: 'Senjata' });

  // --- FUNGSI NATIVE INDEXEDDB ---
  
  const openDatabase = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORES.INVENTORY)) {
          db.createObjectStore(STORES.INVENTORY, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.TRANSACTIONS)) {
          db.createObjectStore(STORES.TRANSACTIONS, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });
  };

  const getAllFromStore = (db, storeName) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

  const putToStore = (db, storeName, data) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  };

  const clearStore = (db, storeName) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  };

  // --- INITIAL LOAD ---
  useEffect(() => {
    const initApp = async () => {
      try {
        const dbConnection = await openDatabase();
        
        // Load Inventory
        let invData = await getAllFromStore(dbConnection, STORES.INVENTORY);
        if (invData.length === 0) {
          // Fill Initial Data
          for (const item of initialInventory) {
            await putToStore(dbConnection, STORES.INVENTORY, item);
          }
          invData = initialInventory;
        }

        // Load Transactions
        const trxData = await getAllFromStore(dbConnection, STORES.TRANSACTIONS);
        
        setInventory(invData);
        setTransactions(trxData.sort((a, b) => b.timestamp - a.timestamp));
        setIsDbReady(true);
      } catch (err) {
        console.error("Database Error:", err);
        setDbError("Gagal memuat database lokal. Menggunakan mode sementara.");
        setInventory(initialInventory);
        setIsDbReady(true);
      }
    };

    initApp();
  }, []);

  // --- DATABASE SYNC HELPERS ---
  const syncInventory = async (newInventory) => {
    setInventory(newInventory);
    try {
      const db = await openDatabase();
      await clearStore(db, STORES.INVENTORY);
      for (const item of newInventory) {
        await putToStore(db, STORES.INVENTORY, item);
      }
    } catch (e) { console.error("Sync Error", e); }
  };

  const saveNewTransaction = async (trx) => {
    const updated = [trx, ...transactions];
    setTransactions(updated);
    try {
      const db = await openDatabase();
      await putToStore(db, STORES.TRANSACTIONS, trx);
    } catch (e) { console.error("Sync Error", e); }
  };

  const updateExistingTransaction = async (trx) => {
    const updated = transactions.map(t => t.id === trx.id ? trx : t);
    setTransactions(updated);
    try {
      const db = await openDatabase();
      await putToStore(db, STORES.TRANSACTIONS, trx);
    } catch (e) { console.error("Sync Error", e); }
  };

  // --- LOGIKA BISNIS ---
  const addToCart = (item) => {
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      if (existing.quantity < item.stock) {
        setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
      }
    } else {
      if (item.stock > 0) setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const handleCheckout = async () => {
    if (!customerName.trim()) return alert('Nama penyewa harus diisi!');
    
    const subtotal = cart.reduce((s, i) => s + (i.price * i.quantity), 0) * rentalDays;
    const total = subtotal * (1 - discountPercent/100);

    const newTrx = {
      id: `TRX-${Date.now()}`,
      timestamp: Date.now(),
      date: new Date().toLocaleString('id-ID'),
      customerName,
      items: [...cart],
      days: rentalDays,
      total,
      status: 'Dipinjam'
    };

    const updatedInv = inventory.map(invItem => {
      const cItem = cart.find(c => c.id === invItem.id);
      return cItem ? { ...invItem, stock: invItem.stock - cItem.quantity } : invItem;
    });

    await syncInventory(updatedInv);
    await saveNewTransaction(newTrx);
    
    setCart([]);
    setCustomerName('');
    setRentalDays(1);
    setDiscountPercent(0);
  };

  const handleReturn = async (trx) => {
    const updatedInv = [...inventory];
    trx.items.forEach(ritem => {
      const idx = updatedInv.findIndex(i => i.id === ritem.id);
      if (idx !== -1) updatedInv[idx].stock += ritem.quantity;
    });

    const updatedTrx = { ...trx, status: 'Dikembalikan', returnDate: new Date().toLocaleString('id-ID') };
    
    await syncInventory(updatedInv);
    await updateExistingTransaction(updatedTrx);
  };

  const handleInventorySubmit = async (e) => {
    e.preventDefault();
    const itemData = {
      ...formData,
      id: editingItem ? editingItem.id : Date.now(),
      price: Number(formData.price),
      stock: Number(formData.stock)
    };

    const updated = editingItem 
      ? inventory.map(i => i.id === editingItem.id ? itemData : i)
      : [...inventory, itemData];

    await syncInventory(updated);
    setIsModalOpen(false);
  };

  const deleteInventoryItem = async (id) => {
    if (window.confirm('Hapus properti ini?')) {
      const updated = inventory.filter(i => i.id !== id);
      await syncInventory(updated);
    }
  };

  const formatIDR = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

  if (!isDbReady) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="relative">
           <Database className="w-16 h-16 text-amber-500 animate-bounce" />
           <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full animate-ping"></div>
        </div>
        <p className="mt-6 font-bold tracking-widest animate-pulse">MEMUAT DATABASE...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* DB Error Notification */}
      {dbError && (
        <div className="bg-red-500 text-white text-center py-2 px-4 flex items-center justify-center gap-2 text-xs font-bold">
          <AlertCircle className="w-4 h-4" /> {dbError}
        </div>
      )}

      {/* Header */}
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-40 shadow-xl">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <Film className="w-8 h-8 text-amber-500" />
            <h1 className="text-2xl font-black">SEWA<span className="text-amber-500">PROP</span></h1>
          </div>
          <nav className="flex bg-slate-800 p-1 rounded-2xl w-full md:w-auto overflow-hidden">
            {['kasir', 'transaksi', 'inventaris'].map(tab => (
              <button 
                key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-tighter transition-all ${activeTab === tab ? 'bg-amber-500 text-slate-900' : 'text-slate-400'}`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        {activeTab === 'kasir' && (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="relative group">
                <Search className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                <input 
                  type="text" placeholder="Cari perlengkapan film..." 
                  className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-2xl focus:border-amber-500 outline-none shadow-sm transition-all"
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {inventory.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase())).map(item => (
                  <div key={item.id} className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm hover:border-amber-400 transition-all flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-md uppercase tracking-widest">{item.category}</span>
                      <h3 className="text-lg font-black mt-2 text-slate-800 uppercase leading-tight">{item.name}</h3>
                      <p className="text-amber-600 font-black mt-1">{formatIDR(item.price)} <span className="text-slate-400 font-normal text-xs italic">/ hari</span></p>
                    </div>
                    <div className="mt-6 flex items-center justify-between border-t pt-4">
                      <span className={`text-xs font-bold ${item.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>Tersedia: {item.stock}</span>
                      <button 
                        onClick={() => addToCart(item)} disabled={item.stock === 0}
                        className="p-2 bg-slate-900 text-white rounded-xl hover:bg-amber-500 hover:text-slate-900 disabled:bg-slate-100 transition-all shadow-md"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-2xl h-fit sticky top-28">
              <h2 className="text-xl font-black mb-6 flex items-center gap-2 tracking-tight"><ShoppingCart className="text-amber-500" /> KERANJANG</h2>
              <div className="space-y-3 mb-8 max-h-60 overflow-y-auto pr-2">
                {cart.length === 0 ? <p className="text-center text-slate-400 text-sm py-8 italic border-2 border-dashed rounded-2xl">Belum ada pilihan</p> : 
                  cart.map(item => (
                    <div key={item.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black truncate uppercase">{item.name}</p>
                        <p className="text-[10px] text-slate-500">{formatIDR(item.price)}</p>
                      </div>
                      <div className="flex items-center gap-3 bg-white px-2 py-1 rounded-xl shadow-inner border">
                        <button onClick={() => setCart(cart.map(c => c.id === item.id ? {...c, quantity: Math.max(1, c.quantity-1)} : c))} className="text-slate-400 hover:text-red-500"><Minus className="w-3 h-3"/></button>
                        <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                        <button onClick={() => addToCart(item)} className="text-slate-400 hover:text-green-500"><Plus className="w-3 h-3"/></button>
                      </div>
                    </div>
                  ))
                }
              </div>

              <div className="space-y-4 pt-6 border-t">
                <input 
                  type="text" placeholder="NAMA PENYEWA" value={customerName} onChange={e => setCustomerName(e.target.value.toUpperCase())}
                  className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-50 focus:border-amber-500 outline-none text-xs font-black uppercase"
                />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">DURASI (HARI)</label>
                    <input type="number" min="1" value={rentalDays} onChange={e => setRentalDays(Number(e.target.value))} className="w-full p-3 bg-slate-50 rounded-xl border-2 border-slate-50 focus:border-amber-500 outline-none font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">DISKON (%)</label>
                    <input type="number" min="0" max="100" value={discountPercent} onChange={e => setDiscountPercent(Number(e.target.value))} className="w-full p-3 bg-slate-50 rounded-xl border-2 border-slate-50 focus:border-amber-500 outline-none font-bold" />
                  </div>
                </div>

                <div className="bg-slate-900 p-5 rounded-3xl text-white space-y-2 shadow-inner">
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest"><span>Subtotal</span><span>{formatIDR(cart.reduce((s,i)=>s+(i.price*i.quantity),0)*rentalDays)}</span></div>
                  <div className="flex justify-between text-lg font-black border-t border-slate-800 pt-2 mt-2 tracking-tighter uppercase italic"><span>Total</span><span className="text-amber-400">{formatIDR((cart.reduce((s,i)=>s+(i.price*i.quantity),0)*rentalDays)*(1-discountPercent/100))}</span></div>
                </div>

                <button 
                  onClick={handleCheckout} disabled={cart.length === 0}
                  className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 text-slate-900 font-black rounded-3xl shadow-lg shadow-amber-500/20 transition-all uppercase tracking-widest text-xs"
                >
                  Proses Penyewaan
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transaksi' && (
          <div className="space-y-6">
            {transactions.length === 0 ? <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed text-slate-400 font-bold">BELUM ADA DATA TRANSAKSI</div> : 
              transactions.map(trx => (
                <div key={trx.id} className="bg-white rounded-[2rem] border-2 border-slate-100 p-6 md:p-8 flex flex-col md:flex-row justify-between gap-6 shadow-sm group">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-black tracking-tighter">{trx.id}</span>
                      <span className="text-xs text-slate-400 font-bold uppercase">{trx.date}</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{trx.customerName}</h3>
                    <div className="flex flex-wrap gap-2">
                      {trx.items.map((it, idx) => (
                        <span key={idx} className="bg-amber-50 text-amber-700 text-[10px] font-black px-3 py-1 rounded-full border border-amber-100 uppercase italic">
                          {it.name} (x{it.quantity})
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex flex-col md:items-end justify-between gap-4 border-t md:border-t-0 pt-4 md:pt-0">
                    <div className="md:text-right">
                      <p className="text-2xl font-black text-slate-900">{formatIDR(trx.total)}</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{trx.days} Hari • Disc {trx.discountPercent}%</p>
                    </div>
                    {trx.status === 'Dipinjam' ? (
                      <button 
                        onClick={() => handleReturn(trx)}
                        className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 flex items-center gap-2"
                      >
                        <Clock className="w-4 h-4" /> Kembalikan
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 bg-green-50 text-green-700 px-6 py-3 rounded-2xl border border-green-100 font-black text-[10px] uppercase italic">
                        <CheckCircle className="w-4 h-4" /> Dikembalikan {trx.returnDate?.split(',')[0]}
                      </div>
                    )}
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {activeTab === 'inventaris' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl border-2 border-slate-100">
               <h2 className="text-xl font-black tracking-tighter">DATA <span className="text-amber-500">PROPERTI</span></h2>
               <button 
                  onClick={() => { setEditingItem(null); setFormData({name:'', price:'', stock:'', category:'Senjata'}); setIsModalOpen(true); }}
                  className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Item Baru
                </button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {inventory.map(item => (
                <div key={item.id} className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 group relative hover:border-amber-400 transition-all">
                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => { setEditingItem(item); setFormData(item); setIsModalOpen(true); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-500 hover:text-white transition-colors"><Edit className="w-4 h-4"/></button>
                    <button onClick={() => deleteInventoryItem(item.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-500 hover:text-white transition-colors"><Trash2 className="w-4 h-4"/></button>
                  </div>
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 font-black mb-4 uppercase">
                    {item.category[0]}
                  </div>
                  <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg line-clamp-1">{item.name}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{item.category}</p>
                  <div className="flex justify-between items-end border-t pt-4">
                    <div>
                       <p className="text-[9px] font-bold text-slate-400 uppercase">Sewa</p>
                       <p className="font-black text-slate-900">{formatIDR(item.price)}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[9px] font-bold text-slate-400 uppercase">Stok</p>
                       <p className={`text-xl font-black ${item.stock === 0 ? 'text-red-500' : 'text-slate-900'}`}>{item.stock}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 pb-4 flex justify-between items-center border-b-2 border-slate-50">
              <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic">{editingItem ? 'Edit' : 'Tambah'} Item</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6"/></button>
            </div>
            <form onSubmit={handleInventorySubmit} className="p-8 space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Properti</label>
                <input required className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-50 outline-none focus:border-amber-500 font-black text-xs uppercase" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}/>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori</label>
                <select className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-50 outline-none focus:border-amber-500 font-black text-xs uppercase appearance-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  <option>Senjata</option><option>Kostum</option><option>Peralatan</option><option>Kendaraan</option><option>Properti Set</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Harga / Hari</label>
                  <input type="number" required className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-50 outline-none focus:border-amber-500 font-black text-xs" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})}/>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jumlah Stok</label>
                  <input type="number" required className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-50 outline-none focus:border-amber-500 font-black text-xs" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})}/>
                </div>
              </div>
              <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-[0.3em] hover:bg-amber-500 hover:text-slate-900 transition-all shadow-xl text-xs mt-6">Simpan Data</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}