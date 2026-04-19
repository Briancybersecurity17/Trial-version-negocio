import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { User, Plus, Trash2, Key, Shield, ShieldOff, Eye, EyeOff, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

function PasswordInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input type={show ? 'text' : 'password'} value={value} onChange={onChange} placeholder={placeholder}
        className="w-full pr-9 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition" />
      <button type="button" onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function ChangePasswordForm({ onClose, auth }) {
  const [cur, setCur]       = useState('');
  const [next, setNext]     = useState('');
  const [confirm, setConf]  = useState('');
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (next !== confirm) { setError('Las contraseñas no coinciden'); return; }
    setLoading(true);
    // Guardar si era cambio obligatorio ANTES de llamar a la API
    const wasForcedChange = !!auth.user?.mustChangePassword;
    const result = await auth.changePassword(cur, next);
    setLoading(false);
    if (result.success) {
      setSuccess(true);
      if (wasForcedChange) {
        // Cierra sesión para que el usuario ingrese con la contraseña nueva
        setTimeout(() => auth.logout(), 1800);
      } else {
        setTimeout(onClose, 1500);
      }
    }
    else setError(result.error);
  }

  if (success) return (
    <div className="text-center py-6">
      <div className="text-green-500 text-4xl mb-2">✓</div>
      <p className="text-sm font-medium text-foreground">Contraseña actualizada</p>
      {auth.user?.mustChangePassword && (
        <p className="text-xs text-muted-foreground mt-1">Redirigiendo al inicio de sesión…</p>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="text-xs font-medium mb-1 block">Contraseña actual</label>
        <PasswordInput value={cur} onChange={e => setCur(e.target.value)} placeholder="••••••••" />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block">Nueva contraseña</label>
        <PasswordInput value={next} onChange={e => setNext(e.target.value)} placeholder="Min. 8 chars, 1 mayús, 1 número, 1 especial" />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block">Confirmar contraseña</label>
        <PasswordInput value={confirm} onChange={e => setConf(e.target.value)} placeholder="••••••••" />
      </div>
      {error && <p className="text-xs text-red-500 bg-red-500/10 rounded px-2 py-1">{error}</p>}
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" className="flex-1" onClick={onClose}>Cancelar</Button>
        <Button type="submit" size="sm" className="flex-1" disabled={loading}
          style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)', color: 'white', border: 'none' }}>
          {loading ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </form>
  );
}

export default function Account() {
  const auth = useAuth();
  const [users, setUsers]           = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPw, setNewPw]           = useState('');
  const [form, setForm]             = useState({ username: '', name: '', password: '', role: 'employee' });
  const [formError, setFormError]   = useState('');
  const [loading, setLoading]       = useState(false);
  const [msg, setMsg]               = useState('');

  useEffect(() => { if (auth.isAdmin) loadUsers(); }, [auth.isAdmin]);

  async function loadUsers() {
    const result = await auth.getUsers();
    if (result.success) setUsers(result.users);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setFormError(''); setLoading(true);
    const result = await auth.createUser(form);
    setLoading(false);
    if (result.success) {
      setShowCreate(false);
      setForm({ username: '', name: '', password: '', role: 'employee' });
      loadUsers();
      setMsg('Usuario creado');
      setTimeout(() => setMsg(''), 3000);
    } else setFormError(result.error);
  }

  async function handleDelete(userId, name) {
    if (!confirm(`¿Eliminar al usuario "${name}"?`)) return;
    await auth.deleteUser(userId);
    loadUsers();
  }

  async function handleResetPw(e) {
    e.preventDefault();
    if (!newPw) return;
    const result = await auth.resetUserPassword(resetTarget.id, newPw);
    if (result.success) {
      setResetTarget(null); setNewPw('');
      setMsg('Contraseña reseteada');
      setTimeout(() => setMsg(''), 3000);
    }
  }

  const roleBadge = (role) => role === 'admin'
    ? <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 font-medium"><Shield className="w-3 h-3" />Admin</span>
    : <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 font-medium"><ShieldOff className="w-3 h-3" />Empleado</span>;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-foreground">Mi cuenta</h1>

      {/* Info usuario actual */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)' }}>
          <User className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{auth.user?.name}</p>
          <p className="text-xs text-muted-foreground">@{auth.user?.username}</p>
        </div>
        {roleBadge(auth.user?.role)}
      </div>

      {/* Mensaje flash */}
      {msg && <div className="text-sm text-green-600 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-2">{msg}</div>}

      {/* Alerta cambio contraseña obligatorio */}
      {auth.user?.mustChangePassword && (
        <div className="text-sm text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-2">
          ⚠️ Por seguridad, cambiá tu contraseña por defecto.
        </div>
      )}

      {/* Cambiar mi contraseña */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm text-foreground">Cambiar contraseña</h2>
          </div>
          {!showChangePw && (
            <Button size="sm" variant="outline" onClick={() => setShowChangePw(true)}>Cambiar</Button>
          )}
        </div>
        {showChangePw && <ChangePasswordForm onClose={() => setShowChangePw(false)} auth={auth} />}
      </div>

      {/* Gestión de usuarios (solo admin) */}
      {auth.isAdmin && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm text-foreground flex items-center gap-2"><User className="w-4 h-4" />Usuarios</h2>
            <Button size="sm" onClick={() => setShowCreate(!showCreate)}
              style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)', color: 'white', border: 'none' }}>
              <Plus className="w-4 h-4 mr-1" /> Nuevo
            </Button>
          </div>

          {/* Formulario nuevo usuario */}
          {showCreate && (
            <form onSubmit={handleCreate} className="border border-dashed border-border rounded-xl p-4 space-y-3 bg-muted/30">
              <p className="text-xs font-semibold text-foreground">Nuevo usuario</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Usuario</label>
                  <input value={form.username} onChange={e => setForm({...form, username: e.target.value})} required placeholder="ej: juan"
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Nombre</label>
                  <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="Juan Pérez"
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Contraseña</label>
                <PasswordInput value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Min. 8, 1 may, 1 núm, 1 especial" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Rol</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none">
                  <option value="employee">Empleado (acceso limitado)</option>
                  <option value="admin">Administrador (acceso total)</option>
                </select>
              </div>
              {formError && <p className="text-xs text-red-500 bg-red-500/10 rounded px-2 py-1">{formError}</p>}
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setShowCreate(false)}>Cancelar</Button>
                <Button type="submit" size="sm" className="flex-1" disabled={loading}
                  style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)', color: 'white', border: 'none' }}>
                  {loading ? 'Creando...' : 'Crear usuario'}
                </Button>
              </div>
            </form>
          )}

          {/* Lista de usuarios */}
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-muted">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                  <p className="text-xs text-muted-foreground">@{u.username}</p>
                </div>
                {roleBadge(u.role)}
                {u.id !== auth.user?.id && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => { setResetTarget(u); setNewPw(''); }}
                      className="p-1.5 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground" title="Resetear contraseña">
                      <Key className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(u.id, u.name)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 transition text-muted-foreground hover:text-red-500" title="Eliminar usuario">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal reset password */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-foreground mb-1">Resetear contraseña</h3>
            <p className="text-xs text-muted-foreground mb-4">Nueva contraseña para <strong>{resetTarget.name}</strong></p>
            <form onSubmit={handleResetPw} className="space-y-3">
              <PasswordInput value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Nueva contraseña" />
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setResetTarget(null)}>Cancelar</Button>
                <Button type="submit" size="sm" className="flex-1"
                  style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)', color: 'white', border: 'none' }}>Resetear</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
