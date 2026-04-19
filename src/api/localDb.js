// localDb.js — tres adaptadores: Electron IPC / HTTP REST / localStorage

// ─── localStorage (fallback dev) ──────────────────────────────────────────────
function lsRead(e) { try { return JSON.parse(localStorage.getItem(`db_${e}`) || '[]'); } catch { return []; } }
function lsWrite(e, d) { localStorage.setItem(`db_${e}`, JSON.stringify(d)); }
function lsId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function lsSort(r, s) {
  if (!s) return r; const d = s.startsWith('-'); const k = d ? s.slice(1) : s;
  return [...r].sort((a,b) => { const av=a[k]??'',bv=b[k]??''; return av<bv?(d?1:-1):av>bv?(d?-1:1):0; });
}
function lsFilter(r, q) { if (!q||!Object.keys(q).length) return r; return r.filter(x=>Object.entries(q).every(([k,v])=>x[k]===v)); }
const lsAdapter = {
  list:      async (e,s,l) => { let r=lsSort(lsRead(e),s); return l?r.slice(0,l):r; },
  filter:    async (e,q,s,l) => { let r=lsFilter(lsRead(e),q); r=lsSort(r,s); return l?r.slice(0,l):r; },
  create:    async (e,d) => { const r=lsRead(e),now=new Date().toISOString(),n={...d,id:lsId(),created_date:now,updated_date:now}; r.push(n); lsWrite(e,r); return n; },
  update:    async (e,id,d) => { const r=lsRead(e),i=r.findIndex(x=>x.id===id); if(i<0)throw new Error('no found'); r[i]={...r[i],...d,id,updated_date:new Date().toISOString()}; lsWrite(e,r); return r[i]; },
  delete:    async (e,id) => { lsWrite(e,lsRead(e).filter(r=>r.id!==id)); return {success:true}; },
  deleteAll: async (e) => { lsWrite(e,[]); return {success:true}; },
  exportAll: async () => { alert('Solo en escritorio'); return {success:false}; },
};

// ─── HTTP adapter ─────────────────────────────────────────────────────────────
function getToken() { return localStorage.getItem('auth_token') || ''; }
function httpCall(action, payload) {
  return fetch(`/api/db/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
    body: JSON.stringify(payload),
  }).then(r => r.json());
}
const httpAdapter = {
  list:      (e,s,l)   => httpCall('list',      {entity:e,sort:s,limit:l}),
  filter:    (e,q,s,l) => httpCall('filter',    {entity:e,query:q,sort:s,limit:l}),
  create:    (e,d)     => httpCall('create',    {entity:e,data:d}),
  update:    (e,id,d)  => httpCall('update',    {entity:e,id,data:d}),
  delete:    (e,id)    => httpCall('delete',    {entity:e,id}),
  deleteAll: (e)       => httpCall('deleteAll', {entity:e}),
  exportAll: ()        => Promise.resolve({success:false}),
};

// ─── Selección de adaptador ───────────────────────────────────────────────────
const isElectron = typeof window !== 'undefined' && !!window.electronDB;
const isHttp     = typeof window !== 'undefined' && !isElectron && window.location.protocol === 'http:';

const db = isElectron ? {
  list:      (e,s,l)   => window.electronDB.list(e,s,l),
  filter:    (e,q,s,l) => window.electronDB.filter(e,q,s,l),
  create:    (e,d)     => window.electronDB.create(e,d),
  update:    (e,id,d)  => window.electronDB.update(e,id,d),
  delete:    (e,id)    => window.electronDB.delete(e,id),
  deleteAll: (e)       => window.electronDB.deleteAll(e),
  exportAll: ()        => window.electronDB.exportAll(),
} : isHttp ? httpAdapter : lsAdapter;

function createEntity(name) {
  return {
    list:      (sort, limit)         => db.list(name, sort, limit),
    filter:    (query, sort, limit)  => db.filter(name, query, sort, limit),
    create:    (data)                => db.create(name, data),
    update:    (id, data)            => db.update(name, id, data),
    delete:    (id)                  => db.delete(name, id),
    deleteAll: ()                    => db.deleteAll(name),
  };
}

export const localEntities = {
  Product:              createEntity('Product'),
  CashRegister:         createEntity('CashRegister'),
  CashSale:             createEntity('CashSale'),
  InventoryTransaction: createEntity('InventoryTransaction'),
};

export const exportAllData = () => db.exportAll();
