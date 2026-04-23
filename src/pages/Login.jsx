import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from '@/lib/ThemeContext';
import { Store, Eye, EyeOff, Lock, User, Sparkles } from 'lucide-react';

export default function Login() {
  const { login }  = useAuth();
  const { currentTheme } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const businessName = localStorage.getItem('negocio_nombre') || 'Mi Negocio';

  const from = currentTheme?.from || '#f97316';
  const to   = currentTheme?.to   || '#fbbf24';
  const mid  = currentTheme?.mid  || '#fb923c';
  const glow = currentTheme?.glowColor || 'rgba(249,115,22,0.3)';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(username, password);
      if (!result.success) setError(result.error || 'Credenciales incorrectas');
    } catch {
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-background">

      {/* ── Orbes de fondo animados ───────────────────────────────────────── */}
      <div style={{
        position: 'absolute', width: 500, height: 500,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${from}22 0%, transparent 70%)`,
        top: '-120px', left: '-120px',
        animation: 'floatA 8s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: 400, height: 400,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${to}1a 0%, transparent 70%)`,
        bottom: '-100px', right: '-80px',
        animation: 'floatB 10s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: 250, height: 250,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${mid}18 0%, transparent 70%)`,
        top: '40%', right: '15%',
        animation: 'floatC 7s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      {/* ── Contenido principal ───────────────────────────────────────────── */}
      <div className="w-full max-w-sm relative z-10">

        {/* Logo + Bienvenido */}
        <div className="flex flex-col items-center mb-8">

          {/* Ícono con glow pulsante */}
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: `linear-gradient(135deg, ${from}, ${to})`,
            boxShadow: `0 8px 32px ${glow}, 0 0 0 1px ${from}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 20,
            animation: 'iconPulse 3s ease-in-out infinite',
          }}>
            <Store style={{ width: 34, height: 34, color: 'white' }} />
          </div>

          {/* Bienvenido con gradiente */}
          <h1 style={{
            fontSize: 34, fontWeight: 800, margin: 0,
            background: `linear-gradient(135deg, ${from}, ${to})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.5px',
          }}>
            Bienvenido
          </h1>

          {/* Nombre del negocio con mismo estilo que Bienvenido */}
          <h2 style={{
            fontSize: 34, fontWeight: 800, margin: '2px 0 0',
            background: `linear-gradient(135deg, ${from}, ${to})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.5px',
            textAlign: 'center',
          }}>
            {businessName}
          </h2>

          {/* Subtítulo con Sparkles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <Sparkles style={{ width: 12, height: 12, color: from, opacity: 0.7 }} />
            <p style={{ fontSize: 13, color: 'var(--muted-foreground)', margin: 0 }}>
              {businessName} · Punto de Venta
            </p>
            <Sparkles style={{ width: 12, height: 12, color: to, opacity: 0.7 }} />
          </div>
        </div>

        {/* ── Card con glassmorphism ────────────────────────────────────── */}
        <div style={{
          background: 'var(--card)',
          border: `1px solid ${from}25`,
          borderRadius: 20,
          padding: '28px 28px 24px',
          boxShadow: `0 8px 40px ${glow}, 0 1px 0 ${from}15 inset`,
        }}>

          <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 4px', color: 'var(--foreground)' }}>
            Iniciar sesión
          </h2>
          <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '0 0 20px' }}>
            Ingresá tus credenciales para continuar
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Usuario */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: 6 }}>
                Usuario
              </label>
              <div style={{ position: 'relative' }}>
                <User style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  width: 15, height: 15, color: 'var(--muted-foreground)',
                }} />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10,
                    borderRadius: 10, fontSize: 14,
                    border: `1.5px solid var(--border)`,
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={e => { e.target.style.borderColor = from; e.target.style.boxShadow = `0 0 0 3px ${from}20`; }}
                  onBlur={e  => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: 6 }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <Lock style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  width: 15, height: 15, color: 'var(--muted-foreground)',
                }} />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    paddingLeft: 36, paddingRight: 40, paddingTop: 10, paddingBottom: 10,
                    borderRadius: 10, fontSize: 14,
                    border: `1.5px solid var(--border)`,
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={e => { e.target.style.borderColor = from; e.target.style.boxShadow = `0 0 0 3px ${from}20`; }}
                  onBlur={e  => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--muted-foreground)', padding: 0, display: 'flex',
                }}>
                  {showPw ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                fontSize: 12, color: '#ef4444',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 8, padding: '8px 12px',
              }}>
                {error}
              </div>
            )}

            {/* Botón */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '11px 0',
                borderRadius: 12, fontSize: 14, fontWeight: 700,
                color: 'white', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? '#9ca3af' : `linear-gradient(135deg, ${from}, ${to})`,
                boxShadow: loading ? 'none' : `0 4px 20px ${glow}`,
                transition: 'transform 0.15s, box-shadow 0.15s, opacity 0.15s',
                opacity: loading ? 0.7 : 1,
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 8px 28px ${glow}`; }}}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = loading ? 'none' : `0 4px 20px ${glow}`; }}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          {/* Hint */}
          <p style={{
            textAlign: 'center', fontSize: 11,
            color: 'var(--muted-foreground)', marginTop: 16, marginBottom: 0,
          }}>
            Primera vez: <span style={{ fontFamily: 'monospace', fontWeight: 700, color: from }}>admin / admin</span>
          </p>
        </div>

        {/* Versión */}
        <p style={{
          textAlign: 'center', fontSize: 11,
          color: 'var(--muted-foreground)', opacity: 0.35, marginTop: 20,
        }}>
          App Mi Negocio v2.0.0
        </p>
      </div>

      {/* ── Animaciones ──────────────────────────────────────────────────── */}
      <style>{`
        @keyframes floatA {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(30px, 20px) scale(1.05); }
        }
        @keyframes floatB {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(-20px, -30px) scale(1.08); }
        }
        @keyframes floatC {
          0%, 100% { transform: translate(0, 0); }
          50%       { transform: translate(15px, -15px); }
        }
        @keyframes iconPulse {
          0%, 100% { box-shadow: 0 8px 32px ${glow}, 0 0 0 1px ${from}30; }
          50%       { box-shadow: 0 12px 48px ${glow}, 0 0 0 6px ${from}12; }
        }
      `}</style>
    </div>
  );
}
