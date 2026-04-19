import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from '@/lib/ThemeContext';
import { User, Plus, Trash2, Key, Shield, ShieldOff, Eye, EyeOff, Lock, UserCog, Crown, ChevronRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function PasswordInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input type={show ? 'text' : 'password'} value={value} onChange={onChange} placeholder={placeholder}
        className="w-full pr-9 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition" />
      <button type="button" onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function ChangePasswordForm({ onClose, auth }) {
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConf] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (next !== confirm) { setError('Las contraseñas no coinciden'); return; }
    setLoading(true);
    const wasForcedChange = !!auth.user?.mustChangePassword;
    const result = await auth.changePassword(cur, next);
    setLoading(false);
    if (result.success) {
      setSuccess(true);
      if (wasForcedChange) setTimeout(() => auth.logout(), 1800);
      else setTimeout(onClose, 1500);
    } else setError(result.error);
  }

  if (success) return (
    <div className="text-center py-6">
      <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
        <div className="text-green-500 text-2xl">✓</div>
      </div>
      <p className="text-sm font-medium text-foreground">Contraseña actualizada</p>
      {auth.user?.mustChangePassword && (
        <p className="text-xs text-muted-foreground mt-1">Redirigiendo al inicio de sesión…</p>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-2">
      <div>
        <label className="text-xs font-medium mb-1 block text-muted-foreground">Contraseña actual</label>
        <PasswordInput value={cur} onChange={e => setCur(e.target.value)} placeholder="••••••••" />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block text-muted-foreground">Nueva contraseña</label>
        <PasswordInput value={next} onChange={e => setNext(e.target.value)} placeholder="Min. 8 chars, 1 mayús, 1 número, 1 especial" />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block text-muted-foreground">Confirmar contraseña</label>
        <PasswordInput value={confirm} onChange={e => setConf(e.target.value)} placeholder="••••••••" />
      </div>
      {error && <p className="text-xs text-red-500 bg-red-500/10 rounded-lg px-3 py-2 flex items-center gap-2"><span>⚠</span>{error}</p>}
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" className="flex-1" onClick={onClose}>Cancelar</Button>
        <Button type="submit" size="sm" className="flex-1" disabled={loading}
          style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)', color: 'white', border: 'none' }}>
          {loading ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </form>
  );
}

export default function Account() {
  const auth = useAuth();
  const { currentTheme } = useTheme();
  const [users, setUsers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [newPw, setNewPw] = useState('');
  const [form, setForm] = useState({ username: '', name: '', password: '', role: 'employee' });
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

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
      setMsg('Usuario creado exitosamente');
      setTimeout(() => setMsg(''), 3000);
    } else setFormError(result.error);
  }

  async function handleDelete(userId) {
    await auth.deleteUser(userId);
    setDeleteTarget(null);
    loadUsers();
    setMsg('Usuario eliminado');
    setTimeout(() => setMsg(''), 3000);
  }

  async function handleResetPw(e) {
    e.preventDefault();
    if (!newPw) return;
    const result = await auth.resetUserPassword(resetTarget.id, newPw);
    if (result.success) {
      setResetTarget(null); setNewPw('');
      setMsg('Contraseña reseteada correctamente');
      setTimeout(() => setMsg(''), 3000);
    }
  }

  const isAdmin = (role) => role === 'admin';

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: currentTheme?.heroGradient || 'linear-gradient(135deg,#f97316,#fb923c)', boxShadow: `0 4px 14px ${currentTheme?.glowColor || 'rgba(249,115,22,0.3)'}` }}>
          <UserCog className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Mi cuenta</h1>
          <p className="text-xs text-muted-foreground">Gestioná tu perfil y usuarios</p>
        </div>
      </div>

      {/* Mensaje flash */}
      {msg && (
        <div className="text-sm text-green-600 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
          <span className="text-green-500">✓</span> {msg}
        </div>
      )}

      {/* Alerta cambio contraseña obligatorio */}
      {auth.user?.mustChangePassword && (
        <div className="text-sm text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
          <span>⚠️</span> Por seguridad, cambiá tu contraseña por defecto.
        </div>
      )}

      {/* Tarjeta perfil */}
      <div className="relative rounded-2xl overflow-hidden border border-border"
        style={{ background: `linear-gradient(135deg, rgb(var(--theme-from) / 0.08) 0%, rgb(var(--theme-to) / 0.03) 100%)` }}>
        {/* Decoración fondo */}
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: currentTheme?.heroGradient, transform: 'translate(30%,-30%)' }} />
        <div className="relative p-5 flex items-center gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: currentTheme?.heroGradient || 'linear-gradient(135deg,#f97316,#fb923c)', boxShadow: `0 6px 20px ${currentTheme?.glowColor || 'rgba(249,115,22,0.35)'}` }}>
              <User className="w-8 h-8 text-white" />
            </div>
            {/* Badge admin */}
            {isAdmin(auth.user?.role) && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center shadow"
                style={{ boxShadow: `0 2px 8px rgba(249,115,22,0.5)` }}>
                <Crown className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-lg text-foreground truncate leading-tight">{auth.user?.name}</p>
            <p className="text-sm text-muted-foreground">@{auth.user?.username}</p>
          </div>
          {/* Role badge */}
          <div className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
            isAdmin(auth.user?.role)
              ? 'bg-orange-500/15 text-orange-500 border border-orange-500/20'
              : 'bg-blue-500/15 text-blue-500 border border-blue-500/20'
          }`}>
            {isAdmin(auth.user?.role)
              ? <><Shield className="w-3 h-3" /> Admin</>
              : <><ShieldOff className="w-3 h-3" /> Empleado</>
            }
          </div>
        </div>
      </div>

      {/* Cambiar contraseña */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: showChangePw ? '1px solid hsl(var(--border))' : 'none' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <Lock className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Cambiar contraseña</p>
              <p className="text-xs text-muted-foreground">Actualizá tu clave de acceso</p>
            </div>
          </div>
          {!showChangePw && (
            <Button size="sm" variant="outline" onClick={() => setShowChangePw(true)}
              className="flex items-center gap-1 text-xs">
              Cambiar <ChevronRight className="w-3 h-3" />
            </Button>
          )}
        </div>
        {showChangePw && (
          <div className="px-5 pb-5">
            <ChangePasswordForm onClose={() => setShowChangePw(false)} auth={auth} />
          </div>
        )}
      </div>

      {/* Gestión de usuarios (solo admin) */}
      {auth.isAdmin && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {/* Header sección */}
          <div className="px-5 py-4 flex items-center justify-between border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Usuarios</p>
                <p className="text-xs text-muted-foreground">{users.length} {users.length === 1 ? 'usuario registrado' : 'usuarios registrados'}</p>
              </div>
            </div>
            <Button size="sm" onClick={() => setShowCreate(!showCreate)}
              style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)', color: 'white', border: 'none' }}
              className="flex items-center gap-1 text-xs shadow-md">
              <Plus className="w-3.5 h-3.5" /> Nuevo
            </Button>
          </div>

          {/* Form nuevo usuario */}
          {showCreate && (
            <div className="px-5 py-4 border-b border-border bg-muted/20">
              <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
                <Plus className="w-3.5 h-3.5" style={{ color: currentTheme?.from || '#f97316' }} />
                Nuevo usuario
              </p>
              <form onSubmit={handleCreate} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Usuario</label>
                    <input value={form.username} onChange={e => setForm({...form, username: e.target.value})} required placeholder="ej: juan"
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Nombre</label>
                    <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="Juan Pérez"
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Contraseña</label>
                  <PasswordInput value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Min. 8, 1 may, 1 núm, 1 especial" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Rol</label>
                  <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50">
                    <option value="employee">Empleado (acceso limitado)</option>
                    <option value="admin">Administrador (acceso total)</option>
                  </select>
                </div>
                {formError && <p className="text-xs text-red-500 bg-red-500/10 rounded-lg px-3 py-2">{formError}</p>}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setShowCreate(false)}>Cancelar</Button>
                  <Button type="submit" size="sm" className="flex-1" disabled={loading}
                    style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)', color: 'white', border: 'none' }}>
                    {loading ? 'Creando…' : 'Crear usuario'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Lista usuarios */}
          <div className="divide-y divide-border">
            {users.map(u => (
              <div key={u.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                {/* Avatar usuario */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isAdmin(u.role) ? 'bg-orange-500/15' : 'bg-muted'
                }`}>
                  {isAdmin(u.role)
                    ? <Crown className="w-4 h-4 text-orange-500" />
                    : <User className="w-4 h-4 text-muted-foreground" />
                  }
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                  <p className="text-xs text-muted-foreground">@{u.username}</p>
                </div>
                {/* Badge rol */}
                <div className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                  isAdmin(u.role)
                    ? 'bg-orange-500/10 text-orange-500'
                    : 'bg-blue-500/10 text-blue-500'
                }`}>
                  {isAdmin(u.role) ? <Shield className="w-2.5 h-2.5" /> : <ShieldOff className="w-2.5 h-2.5" />}
                  {isAdmin(u.role) ? 'Admin' : 'Empleado'}
                </div>
                {/* Acciones */}
                {u.id !== auth.user?.id && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => { setResetTarget(u); setNewPw(''); }}
                      className="p-1.5 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground" title="Resetear contraseña">
                      <Key className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteTarget(u)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Key className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Resetear contraseña</h3>
                <p className="text-xs text-muted-foreground">Para <strong>{resetTarget.name}</strong></p>
              </div>
            </div>
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

      {/* Diálogo confirmación eliminar usuario */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <AlertDialogTitle className="text-base">¿Eliminar usuario?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm">
              Estás por eliminar permanentemente al usuario <strong className="text-foreground">{deleteTarget?.name}</strong> (@{deleteTarget?.username}). Perderá todo acceso al sistema. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <Trash2 className="w-4 h-4 mr-1.5" /> Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
