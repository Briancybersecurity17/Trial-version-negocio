import { useEffect, useState, useRef } from 'react';
import { Mail, Lock, Clock, AlertTriangle, Key, ShieldCheck, Copy, Check, TriangleAlert } from 'lucide-react';

// ─── Modal de confirmación antes de abandonar el trial ───────────────────────
function ConfirmActivateModal({ timeLeft, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999999,
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        background: 'linear-gradient(160deg, #1a1a2e, #16213e)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 20,
        padding: '40px 44px',
        textAlign: 'center',
        maxWidth: 420,
        width: '90%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>
        <div style={{
          width: 64, height: 64,
          background: 'linear-gradient(135deg, #f5a623, #f5576c)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          boxShadow: '0 8px 24px rgba(245,87,108,0.35)',
        }}>
          <AlertTriangle size={30} color="white" />
        </div>

        <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: '0 0 10px' }}>
          ¿Finalizar período de prueba?
        </h2>

        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.7, margin: '0 0 8px' }}>
          Todavía te quedan <strong style={{ color: '#f5a623' }}>{timeLeft}</strong> de prueba.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 1.6, margin: '0 0 32px' }}>
          Al continuar, el tiempo restante se descartará y pasarás a la pantalla de activación.
          Esta acción no se puede deshacer.
        </p>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 12, padding: '12px',
              color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
          >
            Volver al trial
          </button>

          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              background: 'linear-gradient(135deg, #f5576c, #f093fb)',
              border: 'none',
              borderRadius: 12, padding: '12px',
              color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(245,87,108,0.35)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            Sí, activar ahora
          </button>
        </div>
      </div>
    </div>
  );
}

const CONTACT_EMAIL = window.__CONTACT_EMAIL__ || 'brianalmada14@gmail.com';

// ─── Detección de entorno ──────────────────────────────────────────────────────────────
const isHttpMode = typeof window !== 'undefined'
  && !window.electronLicense
  && window.location.protocol === 'http:';

// Adaptadores HTTP para licencia y trial (solo usados en modo HTTP)
async function httpLicenseStatus() {
  const r = await fetch('/api/license/status');
  return r.json();
}
async function httpLicenseActivate(key) {
  const r = await fetch('/api/license/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  });
  return r.json();
}
async function httpTrialStatus() {
  const r = await fetch('/api/trial/status');
  return r.json();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcTimeLeft(expireTs) {
  const msLeft = expireTs - Date.now();
  if (msLeft <= 0) return { text: 'vence en breve', urgent: true };
  const totalMin = Math.floor(msLeft / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const urgent = msLeft < 60 * 60 * 1000;
  if (h > 0) return { text: `${h}h ${m}m restantes`, urgent };
  return { text: `${m}m restantes`, urgent };
}

// ─── Pantalla de activación de licencia ───────────────────────────────────────
function LicenseActivationScreen({ machineId, email, onActivated }) {
  const [key, setKey]         = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(false);
  const inputRef              = useRef(null);

  function handleKeyChange(e) {
    const val = e.target.value.replace(/[^a-fA-F0-9]/g, '').toLowerCase();
    setKey(val);
    setError('');
  }

  async function handleActivate() {
    if (!key || key.length < 10) { setError('Ingresá la clave completa.'); return; }
    setLoading(true);
    setError('');
    try {
      // Soporta tanto Electron (IPC) como HTTP (red local desde celular)
      const result = window.electronLicense
        ? await window.electronLicense.activate(key)
        : await httpLicenseActivate(key);
      if (result.success) {
        onActivated();
      } else {
        setError(result.error || 'Clave incorrecta.');
        inputRef.current?.focus();
      }
    } catch {
      setError('Error al verificar la clave. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyId() {
    try { await navigator.clipboard.writeText(machineId); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleActivate();
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      userSelect: 'none', WebkitUserSelect: 'none',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 24, padding: '48px 56px',
        textAlign: 'center', maxWidth: 500, width: '90%',
        boxShadow: '0 32px 64px rgba(0,0,0,0.5)',
      }}>
        <div style={{
          width: 80, height: 80,
          background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: '0 8px 32px rgba(79,172,254,0.4)',
        }}>
          <Key size={36} color="white" />
        </div>

        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 700, margin: '0 0 8px' }}>
          Activar App Mi Negocio
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, margin: '0 0 32px', lineHeight: 1.6 }}>
          Ingresá tu clave de licencia para desbloquear la versión completa,<br />
          o contactanos para obtenerla.
        </p>

        <div style={{
          background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12, padding: '14px 16px', marginBottom: 24, textAlign: 'left',
        }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 6px' }}>
            ID de tu equipo
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <code style={{
              color: '#4facfe', fontSize: 12, fontFamily: 'monospace',
              flex: 1, wordBreak: 'break-all', lineHeight: 1.5,
              userSelect: 'text', WebkitUserSelect: 'text',
            }}>
              {machineId}
            </code>
            <button
              onClick={handleCopyId}
              title="Copiar ID"
              style={{
                background: copied ? 'rgba(0,242,100,0.15)' : 'rgba(79,172,254,0.15)',
                border: `1px solid ${copied ? 'rgba(0,242,100,0.4)' : 'rgba(79,172,254,0.3)'}`,
                borderRadius: 8, padding: '6px 8px',
                color: copied ? '#00f264' : '#4facfe',
                cursor: 'pointer', flexShrink: 0,
                display: 'flex', alignItems: 'center', transition: 'all 0.2s',
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, margin: '8px 0 0' }}>
            Envialo a{' '}
            <a
              href={`mailto:${email}?subject=Compra%20Mi%20Negocio&body=Hola%20Brian%2C%20quiero%20comprar%20la%20licencia.%20Mi%20ID%20de%20equipo%20es%3A%20${machineId}`}
              style={{ color: '#4facfe', textDecoration: 'none' }}
            >
              {email}
            </a>
            {' '}para recibir tu clave.
          </p>
        </div>

        <div style={{ marginBottom: 12, textAlign: 'left' }}>
          <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 8 }}>
            Clave de licencia
          </label>
          <input
            ref={inputRef}
            value={key}
            onChange={handleKeyChange}
            onKeyDown={handleKeyDown}
            placeholder="Pegá tu clave aquí..."
            maxLength={128}
            spellCheck={false}
            autoComplete="off"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(0,0,0,0.3)',
              border: `1px solid ${error ? 'rgba(245,87,108,0.6)' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: 10, padding: '12px 14px',
              color: '#fff', fontSize: 13, fontFamily: 'monospace',
              outline: 'none', userSelect: 'text', WebkitUserSelect: 'text',
              transition: 'border-color 0.2s',
            }}
          />
          {error && (
            <p style={{ color: '#f5576c', fontSize: 12, margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertTriangle size={12} /> {error}
            </p>
          )}
        </div>

        <button
          onClick={handleActivate}
          disabled={loading || !key}
          style={{
            width: '100%',
            background: loading || !key ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #4facfe, #00f2fe)',
            color: loading || !key ? 'rgba(255,255,255,0.3)' : '#fff',
            border: 'none', borderRadius: 12, padding: '14px',
            fontSize: 15, fontWeight: 700,
            cursor: loading || !key ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s',
            boxShadow: loading || !key ? 'none' : '0 8px 24px rgba(79,172,254,0.35)',
          }}
        >
          <ShieldCheck size={18} />
          {loading ? 'Verificando...' : 'Activar licencia'}
        </button>

        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, margin: '20px 0 0' }}>
          Mi Negocio · La licencia queda vinculada a este equipo
        </p>
      </div>
    </div>
  );
}

// ─── Pantalla de trial vencido ────────────────────────────────────────────────
function TrialExpiredScreen({ email, machineId, onTryActivate }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      userSelect: 'none', WebkitUserSelect: 'none',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 24, padding: '48px 56px',
        textAlign: 'center', maxWidth: 480, width: '90%',
        boxShadow: '0 32px 64px rgba(0,0,0,0.5)',
      }}>
        <div style={{
          width: 80, height: 80,
          background: 'linear-gradient(135deg, #f093fb, #f5576c)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: '0 8px 32px rgba(245,87,108,0.4)',
        }}>
          <Lock size={36} color="white" />
        </div>

        <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 700, margin: '0 0 8px' }}>
          Período de prueba finalizado
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, margin: '0 0 32px', lineHeight: 1.6 }}>
          Tu versión de prueba de <strong style={{ color: '#fff' }}>Mi Negocio</strong> ha expirado.
          Adquirí la licencia completa para continuar.
        </p>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '0 0 28px' }} />

        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1 }}>
          Contactá al desarrollador
        </p>
        <a
          href={`mailto:${email}?subject=Compra%20Mi%20Negocio&body=Hola%20Brian%2C%20quiero%20comprar%20la%20licencia.%20Mi%20ID%20de%20equipo%20es%3A%20${machineId}`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
            color: '#fff', textDecoration: 'none',
            padding: '14px 28px', borderRadius: 12,
            fontWeight: 600, fontSize: 15,
            boxShadow: '0 8px 24px rgba(79,172,254,0.35)',
          }}
        >
          <Mail size={18} />
          {email}
        </a>

        <div style={{ marginTop: 16 }}>
          <button
            onClick={onTryActivate}
            style={{
              background: 'none',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 10, padding: '10px 20px',
              color: 'rgba(255,255,255,0.6)', fontSize: 13,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            <Key size={14} /> Ya tengo mi clave
          </button>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, margin: '20px 0 0' }}>
          Mi Negocio — Versión Trial · Licencia requerida para continuar
        </p>
      </div>
    </div>
  );
}

// ─── Banner flotante con countdown real ───────────────────────────────────────
function TrialBanner({ expireTs, email, machineId, onActivate }) {
  const [visible, setVisible]     = useState(true);
  const [showNote, setShowNote]   = useState(false);
  const [countdown, setCountdown] = useState(() => calcTimeLeft(expireTs));

  useEffect(() => {
    const id = setInterval(() => setCountdown(calcTimeLeft(expireTs)), 30000);
    return () => clearInterval(id);
  }, [expireTs]);

  if (!visible) return null;
  const { text, urgent } = countdown;

  return (
    <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 9999, fontFamily: 'system-ui, sans-serif', userSelect: 'none', WebkitUserSelect: 'none' }}>
      {showNote && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 8,
          background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10, padding: '12px 16px', fontSize: 13,
          color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)', lineHeight: 1.7,
        }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>¿Consultas? Contactame:</span>
          <br />
          <strong style={{ color: '#4facfe' }}>{email}</strong>
          <br />
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Asunto: <em>AppMiNegocio</em></span>
        </div>
      )}
      <div style={{
        background: urgent
          ? 'linear-gradient(135deg, #f5576c, #f093fb)'
          : 'linear-gradient(135deg, #4facfe, #00f2fe)',
        color: '#fff', borderRadius: 12, padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        fontSize: 13, fontWeight: 600,
        boxShadow: urgent ? '0 4px 20px rgba(245,87,108,0.4)' : '0 4px 20px rgba(79,172,254,0.35)',
        maxWidth: 420,
      }}>
        {urgent ? <AlertTriangle size={15} /> : <Clock size={15} />}
        <span>Trial: {text}</span>
        <span
          onMouseEnter={() => setShowNote(true)}
          onMouseLeave={() => setShowNote(false)}
          style={{
            background: 'rgba(255,255,255,0.25)', color: '#fff',
            borderRadius: 6, padding: '3px 8px',
            fontSize: 12, fontWeight: 700, cursor: 'default',
          }}
        >
          ¿Consultas?
        </span>
        <button
          onClick={onActivate}
          title="Tengo una clave"
          style={{
            background: 'rgba(255,255,255,0.2)', border: 'none',
            borderRadius: 6, padding: '3px 8px',
            color: '#fff', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <Key size={12} /> Activar
        </button>
        <button
          onClick={() => setVisible(false)}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: '0 2px', fontSize: 16, lineHeight: 1 }}
          title="Cerrar"
        >×</button>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function LicenseGuard({ children }) {
  // Estado posible: null (cargando) | 'licensed' | 'trial' | 'expired' | 'activating'
  const [status, setStatus]           = useState(null);
  const [trialState, setTrialState]   = useState(null);
  const [machineId, setMachineId]     = useState('');
  const [email]                       = useState(CONTACT_EMAIL);
  const [showConfirm, setShowConfirm] = useState(false);
  const trialStateRef                 = useRef(null); // evita stale closure en el intervalo

  // Mantener la ref sincronizada con trialState
  useEffect(() => {
    trialStateRef.current = trialState;
  }, [trialState]);

  useEffect(() => {
    async function init() {
      try {
        // 1. Chequear licencia primero
        if (window.electronLicense) {
          const lic = await window.electronLicense.status();
          setMachineId(lic.machineId || window.__MACHINE_ID__ || '');
          if (lic.licensed) { setStatus('licensed'); return; }
        } else if (window.__LICENSED__) {
          setStatus('licensed'); return;
        }

        // 2. Sin licencia → verificar trial
        if (window.__TRIAL_EXPIRED__) {
          setMachineId(window.__MACHINE_ID__ || '');
          setStatus('expired'); return;
        }

        if (window.electronTrial) {
          const t = await window.electronTrial.status();
          setMachineId(window.__MACHINE_ID__ || '');
          setTrialState({ active: t.active, expireTs: t.expireTs });
          setStatus(t.active ? 'trial' : 'expired');
          return;
        }

        // Modo HTTP (celular / otra PC en red local)
        if (isHttpMode) {
          try {
            const lic = await httpLicenseStatus();
            setMachineId(lic.machineId || '');
            if (lic.licensed) { setStatus('licensed'); return; }
            // Sin licencia → chequear trial real del servidor
            const trial = await httpTrialStatus();
            setTrialState({ active: trial.active, expireTs: trial.expireTs });
            setStatus(trial.active ? 'trial' : 'expired');
          } catch {
            setStatus('expired');
          }
          return;
        }

        // Fallback entorno dev (localStorage)
        setStatus('trial');
        setTrialState({ active: true, expireTs: Date.now() + 2 * 60 * 60 * 1000 });
      } catch {
        setStatus('expired');
      }
    }

    init();

    // Escuchar evento de expiración disparado desde main.js
    const onExpired = () => setStatus('expired');
    window.addEventListener('trial-expired', onExpired);

    // ─── Chequeo periódico: detectar expiración con la app abierta ───────────
    // Usa trialStateRef para no quedar atrapado en el valor inicial de trialState
    const expireCheckId = setInterval(async () => {
      // Si ya hay licencia válida, no hacer nada
      if (window.electronLicense) {
        const lic = await window.electronLicense.status();
        if (lic.licensed) { clearInterval(expireCheckId); return; }
      }
      const ts = trialStateRef.current?.expireTs;
      if (ts && Date.now() >= ts) {
        setStatus('expired');
        clearInterval(expireCheckId);
      }
    }, 30000); // cada 30 segundos

    return () => {
      window.removeEventListener('trial-expired', onExpired);
      clearInterval(expireCheckId);
    };
  }, []);

  async function handleActivated() {
    window.location.reload();
  }

  // Cargando
  if (status === null) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#0f0c29',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, fontFamily: 'system-ui' }}>
          Cargando...
        </div>
      </div>
    );
  }

  // Licencia válida → app completa sin banner
  if (status === 'licensed') return <>{children}</>;

  // Pantalla de activación
  if (status === 'activating') {
    return (
      <LicenseActivationScreen
        machineId={machineId}
        email={email}
        onActivated={handleActivated}
      />
    );
  }

  // Trial vencido
  if (status === 'expired') {
    return (
      <TrialExpiredScreen
        email={email}
        machineId={machineId}
        onTryActivate={() => setStatus('activating')}
      />
    );
  }

  // Trial activo → app + banner + modal de confirmación si lo piden
  return (
    <>
      {showConfirm && (
        <ConfirmActivateModal
          timeLeft={calcTimeLeft(trialState?.expireTs || Date.now()).text}
          onConfirm={() => { setShowConfirm(false); setStatus('activating'); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
      <TrialBanner
        expireTs={trialState?.expireTs || Date.now() + 3600000}
        email={email}
        machineId={machineId}
        onActivate={() => setShowConfirm(true)}
      />
      {children}
    </>
  );
}