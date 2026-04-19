import { useEffect, useState } from 'react';
import { Mail, Lock, Clock, AlertTriangle } from 'lucide-react';

// ─── Pantalla de bloqueo cuando el trial vence ────────────────────────────────
function TrialExpiredScreen({ email }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        // Bloquea selección de texto (dificulta copiar el email y "usar" la app)
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 24,
        padding: '48px 56px',
        textAlign: 'center',
        maxWidth: 480,
        width: '90%',
        boxShadow: '0 32px 64px rgba(0,0,0,0.5)',
      }}>
        {/* Icono */}
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

        {/* Título */}
        <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 700, margin: '0 0 8px' }}>
          Período de prueba finalizado
        </h1>

        {/* Subtítulo */}
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, margin: '0 0 32px', lineHeight: 1.6 }}>
          Tu versión de prueba de <strong style={{ color: '#fff' }}>Mi Negocio</strong> ha expirado.
          Para continuar usando la aplicación, adquirí la licencia completa.
        </p>

        {/* Divisor */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '0 0 28px' }} />

        {/* Contacto */}
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1 }}>
          Contactá al desarrollador
        </p>

        <a
          href={`mailto:${email}?subject=Licencia Mi Negocio&body=Hola, quiero adquirir la licencia completa de Mi Negocio.`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
            color: '#fff', textDecoration: 'none',
            padding: '14px 28px', borderRadius: 12,
            fontWeight: 600, fontSize: 15,
            boxShadow: '0 8px 24px rgba(79,172,254,0.35)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(79,172,254,0.45)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)';    e.currentTarget.style.boxShadow = '0 8px 24px rgba(79,172,254,0.35)'; }}
        >
          <Mail size={18} />
          {email}
        </a>

        {/* Nota */}
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, margin: '24px 0 0' }}>
          Mi Negocio — Versión Trial · Licencia requerida para continuar
        </p>
      </div>
    </div>
  );
}

// ─── Banner flotante de días restantes ───────────────────────────────────────
function TrialBanner({ daysLeft, email }) {
  const [visible, setVisible]   = useState(true);
  const [showNote, setShowNote] = useState(false);

  if (!visible) return null;

  const urgent = daysLeft <= 1;

  return (
    <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 9999, fontFamily: 'system-ui, sans-serif', userSelect: 'none', WebkitUserSelect: 'none' }}>

      {/* Nota que aparece al hacer hover en "¿Querés comprarla?" */}
      {showNote && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 8,
          background: '#1e1e2e',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10,
          padding: '12px 16px',
          fontSize: 13,
          color: 'rgba(255,255,255,0.85)',
          whiteSpace: 'nowrap',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          lineHeight: 1.7,
        }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>¿Querés comprarla? Contactame:</span>
          <br />
          <strong style={{ color: '#4facfe' }}>{email}</strong>
          <br />
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Asunto: <em>Compra app</em></span>
        </div>
      )}

      {/* Banner principal */}
      <div style={{
        background: urgent
          ? 'linear-gradient(135deg, #f5576c, #f093fb)'
          : 'linear-gradient(135deg, #4facfe, #00f2fe)',
        color: '#fff',
        borderRadius: 12,
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        fontSize: 13, fontWeight: 600,
        boxShadow: urgent
          ? '0 4px 20px rgba(245,87,108,0.4)'
          : '0 4px 20px rgba(79,172,254,0.35)',
        maxWidth: 380,
      }}>
        {urgent ? <AlertTriangle size={15} /> : <Clock size={15} />}
        <span>
          {daysLeft === 0
            ? 'Trial: vence hoy'
            : `Trial: ${daysLeft} día${daysLeft !== 1 ? 's' : ''} restante${daysLeft !== 1 ? 's' : ''}`}
        </span>
        <span
          onMouseEnter={() => setShowNote(true)}
          onMouseLeave={() => setShowNote(false)}
          style={{
            background: 'rgba(255,255,255,0.25)', color: '#fff',
            borderRadius: 6, padding: '3px 8px',
            fontSize: 12, fontWeight: 700, cursor: 'default',
          }}
        >
          ¿Querés comprarla?
        </span>
        <button
          onClick={() => setVisible(false)}
          style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer', padding: '0 2px', fontSize: 16, lineHeight: 1,
          }}
          title="Cerrar"
        >
          ×
        </button>
      </div>
    </div>
  );
}

// ─── Componente principal que envuelve toda la app ───────────────────────────
export default function TrialGuard({ children }) {
  const [trialState, setTrialState] = useState(null); // null = cargando

  useEffect(() => {
    async function checkTrial() {
      try {
        // Primero chequeamos lo que el main inyectó en window al cargar
        if (window.__TRIAL_EXPIRED__) {
          setTrialState({ active: false, daysLeft: 0, email: window.__CONTACT_EMAIL__ || '' });
          return;
        }

        // También podemos consultar via IPC para asegurarnos
        if (window.electronTrial) {
          const status = await window.electronTrial.status();
          setTrialState({
            active:   status.active,
            daysLeft: status.daysLeft,
            email:    status.contactEmail,
          });
          return;
        }

        // Fallback: si no hay electronTrial (entorno web), dejamos pasar
        setTrialState({ active: true, daysLeft: 99, email: '' });
      } catch {
        // En caso de error, bloqueamos por seguridad
        setTrialState({ active: false, daysLeft: 0, email: window.__CONTACT_EMAIL__ || '' });
      }
    }

    checkTrial();

    // Escuchar evento de expiración inyectado desde main.js
    const onExpired = (e) => {
      setTrialState({ active: false, daysLeft: 0, email: e.detail?.email || '' });
    };
    window.addEventListener('trial-expired', onExpired);
    return () => window.removeEventListener('trial-expired', onExpired);
  }, []);

  // Mientras carga, no mostramos nada (evita flash de contenido)
  if (trialState === null) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: '#0f0c29',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, fontFamily: 'system-ui' }}>
          Cargando...
        </div>
      </div>
    );
  }

  // Trial vencido → pantalla de bloqueo total
  if (!trialState.active) {
    return <TrialExpiredScreen email={trialState.email} />;
  }

  // Trial activo → app normal + banner
  return (
    <>
      <TrialBanner daysLeft={trialState.daysLeft} email={trialState.email} />
      {children}
    </>
  );
}