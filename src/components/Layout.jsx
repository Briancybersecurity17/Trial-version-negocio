import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, Calendar, Receipt, ShoppingBag, Menu, X, Store, Settings, Boxes, Trash2, Wifi, LogOut, User, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/LanguageContext";
import { useTheme } from "@/lib/ThemeContext";
import { useAuth } from "@/lib/AuthContext";

export default function Layout() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [serverInfo, setServerInfo] = useState(null);
  const { t } = useLanguage();
  const { currentTheme } = useTheme();
  const auth = useAuth();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronServer) {
      window.electronServer.getInfo().then(setServerInfo).catch(() => {});
    }
  }, []);

  async function handleLogout() {
    await auth.logout();
    navigate('/login');
  }

  // Nav items — Opciones solo para admin
  const navItems = [
    { path: "/",            labelKey: "dashboard",    icon: LayoutDashboard, always: true },
    { path: "/productos",   labelKey: "productos",    icon: Package,         always: true },
    { path: "/ventas",      labelKey: "ventas",       icon: Receipt,         always: true },
    { path: "/gastos",      labelKey: "gastos",       icon: ShoppingBag,     always: true },
    { path: "/inventario",  labelKey: "inventario",   icon: Boxes,           always: true },
    { path: "/mermas",      labelKey: "mermas",       icon: Trash2,          always: true },
    { path: "/calendario",  labelKey: "calendario",   icon: Calendar,        always: true },
  ].filter(i => i.always);

  const NavLink = ({ item, onClick }) => {
    const isActive = location.pathname === item.path;
    const gradId = `navBorderGrad-${(item.path.replace(/\//g, "") || "root")}-${currentTheme?.label || "d"}`;
    return (
      <Link to={item.path} onClick={onClick}
        className={`relative flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 overflow-hidden ${
          isActive ? "nav-active text-white shadow-lg" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        }`}
        style={isActive ? {
          background: `linear-gradient(90deg, rgb(var(--theme-from) / 0.3) 0%, rgb(var(--theme-to) / 0.1) 100%)`,
          color: "white",
        } : {}}>
        {isActive && (
          <svg className="absolute inset-0 w-full h-full rounded-lg" style={{ pointerEvents: "none" }}>
            <rect x="1" y="1" width="calc(100% - 2px)" height="calc(100% - 2px)"
              rx="7" ry="7" fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth="1.5"
              strokeDasharray="40 200"
              style={{ animation: "borderDash 2.5s linear infinite" }}
            />
            <defs>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={currentTheme?.from || "#f97316"} stopOpacity="0" />
                <stop offset="50%" stopColor={currentTheme?.to || "#fbbf24"} stopOpacity="1" />
                <stop offset="100%" stopColor={currentTheme?.from || "#f97316"} stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        )}
        <item.icon className="w-5 h-5 flex-shrink-0 relative z-10" style={isActive ? { color: `rgb(var(--theme-from))` } : {}} />
        <span className="relative z-10">{t(item.labelKey)}</span>
      </Link>
    );
  };

  const SidebarFooter = () => {
    const acctGradId = `navBorderGrad-account-${currentTheme?.label || "d"}`;
    const optsGradId = `navBorderGrad-opciones-${currentTheme?.label || "d"}`;
    const isAcct = location.pathname === '/account';
    const isOpts = location.pathname === '/opciones';
    return (
    <div className="px-3 pb-4 space-y-1">
      {/* Mi Cuenta */}
      <Link to="/account" onClick={() => setMobileOpen(false)}
        className={`relative flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 overflow-hidden ${
          isAcct ? 'text-white shadow-lg' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
        }`}
        style={isAcct ? {
          background: `linear-gradient(90deg, rgb(var(--theme-from) / 0.3) 0%, rgb(var(--theme-to) / 0.1) 100%)`,
          color: "white",
        } : {}}>
        {isAcct && (
          <svg className="absolute inset-0 w-full h-full rounded-lg" style={{ pointerEvents: "none" }}>
            <rect x="1" y="1" width="calc(100% - 2px)" height="calc(100% - 2px)"
              rx="7" ry="7" fill="none" stroke={`url(#${acctGradId})`}
              strokeWidth="1.5" strokeDasharray="40 200"
              style={{ animation: "borderDash 2.5s linear infinite" }} />
            <defs>
              <linearGradient id={acctGradId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={currentTheme?.from || "#f97316"} stopOpacity="0" />
                <stop offset="50%" stopColor={currentTheme?.to || "#fbbf24"} stopOpacity="1" />
                <stop offset="100%" stopColor={currentTheme?.from || "#f97316"} stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        )}
        <User className="w-5 h-5 flex-shrink-0 relative z-10" style={isAcct ? { color: `rgb(var(--theme-from))` } : {}} />
        <span className="relative z-10">Mi cuenta</span>
      </Link>

      {/* Opciones — solo admin */}
      {auth.isAdmin && (
        <Link to="/opciones" onClick={() => setMobileOpen(false)}
          className={`relative flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 overflow-hidden ${
            isOpts ? 'text-white shadow-lg' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
          }`}
          style={isOpts ? {
            background: `linear-gradient(90deg, rgb(var(--theme-from) / 0.3) 0%, rgb(var(--theme-to) / 0.1) 100%)`,
            color: "white",
          } : {}}>
          {isOpts && (
            <svg className="absolute inset-0 w-full h-full rounded-lg" style={{ pointerEvents: "none" }}>
              <rect x="1" y="1" width="calc(100% - 2px)" height="calc(100% - 2px)"
                rx="7" ry="7" fill="none" stroke={`url(#${optsGradId})`}
                strokeWidth="1.5" strokeDasharray="40 200"
                style={{ animation: "borderDash 2.5s linear infinite" }} />
              <defs>
                <linearGradient id={optsGradId} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={currentTheme?.from || "#f97316"} stopOpacity="0" />
                  <stop offset="50%" stopColor={currentTheme?.to || "#fbbf24"} stopOpacity="1" />
                  <stop offset="100%" stopColor={currentTheme?.from || "#f97316"} stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          )}
          <Settings className="w-5 h-5 flex-shrink-0 relative z-10" style={isOpts ? { color: `rgb(var(--theme-from))` } : {}} />
          <span className="relative z-10">{t("opciones")}</span>
        </Link>
      )}

      {/* Usuario actual + Logout */}
      <div className="mt-2 mx-1 p-3 rounded-xl border"
        style={{ background: `linear-gradient(135deg, rgb(var(--theme-from) / 0.08) 0%, rgb(var(--theme-to) / 0.04) 100%)`, borderColor: `rgb(var(--theme-from) / 0.15)` }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `rgb(var(--theme-from) / 0.2)` }}>
            <User className="w-3.5 h-3.5" style={{ color: `rgb(var(--theme-from))` }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-sidebar-foreground truncate">{auth.user?.name}</p>
            <p className="text-xs text-sidebar-foreground/50 truncate">
              {auth.user?.role === 'admin' ? 'Administrador' : 'Empleado'}
            </p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 text-xs py-1.5 px-3 rounded-lg transition hover:bg-red-500/10 hover:text-red-500 text-sidebar-foreground/50">
          <LogOut className="w-3 h-3" />
          Cerrar sesión
        </button>
      </div>

      {/* Acceso local */} 
      {serverInfo && auth.isAdmin && (
        <div className="mx-1 rounded-xl relative p-3"
          style={{
            background: `linear-gradient(135deg, rgb(var(--theme-from) / 0.12) 0%, rgb(var(--theme-to) / 0.06) 100%)`,
          }}>
          {/* Borde animado SVG que recorre el perímetro */}
          <svg className="absolute inset-0 w-full h-full rounded-xl" style={{ pointerEvents: "none" }}>
            <rect
              x="1" y="1"
              width="calc(100% - 2px)" height="calc(100% - 2px)"
              rx="10" ry="10"
              fill="none"
              stroke={`url(#borderGrad-${currentTheme?.label || "default"})`}
              strokeWidth="1.5"
              strokeDasharray="40 200"
              style={{
                animation: "borderDash 2.5s linear infinite",
              }}
            />
            <defs>
              <linearGradient id={`borderGrad-${currentTheme?.label || "default"}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={currentTheme?.from || "#f97316"} stopOpacity="0" />
                <stop offset="50%" stopColor={currentTheme?.to || "#fbbf24"} stopOpacity="1" />
                <stop offset="100%" stopColor={currentTheme?.from || "#f97316"} stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
          <div className="flex items-center gap-2 mb-1" style={{ color: `rgb(var(--theme-from))` }}>
            <Wifi className="w-3 h-3" />
            <span className="text-xs font-semibold">Acceso local</span>
          </div>
          <p className="text-xs text-sidebar-foreground/60 break-all">{serverInfo.url}</p>
        </div>
      )}

      {/* Sistema */}
      <div className="mx-1 p-3 rounded-xl border text-xs text-sidebar-foreground/40"
        style={{ borderColor: `rgb(var(--theme-from) / 0.1)` }}>
        {t("sistema")}
      </div>
    </div>
    );
  };

  const SidebarContent = ({ onNavClick }) => (
    <>
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="sidebar-logo-badge w-10 h-10 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
          style={{ background: currentTheme?.heroGradient || "hsl(var(--sidebar-primary))", boxShadow: `0 4px 14px ${currentTheme?.glowColor || "rgba(249,115,22,0.3)"}` }}>
          <Store className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="font-bold text-lg tracking-tight text-sidebar-foreground truncate">{t("miKiosko")}</h1>
          <p className="text-xs text-sidebar-foreground/50">{t("puntoDeVenta")}</p>
        </div>
      </div>

      <div className="h-px mx-4 mb-4 rounded-full opacity-40"
        style={{ background: currentTheme?.heroGradient || "hsl(var(--sidebar-border))" }} />

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => <NavLink key={item.path} item={item} onClick={onNavClick} />)}
      </nav>

      <SidebarFooter />
    </>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-64 text-sidebar-foreground border-r border-sidebar-border relative overflow-hidden"
        style={{ background: currentTheme?.sidebarBg || "hsl(var(--sidebar-background))" }}>
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ background: currentTheme?.heroGradient, transform: "translate(30%, -30%)" }} />
        <SidebarContent onNavClick={undefined} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <aside className="relative w-72 h-full text-sidebar-foreground flex flex-col overflow-y-auto border-r border-sidebar-border"
            style={{ background: currentTheme?.sidebarBg || "hsl(var(--sidebar-background))" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl pointer-events-none opacity-20"
              style={{ background: currentTheme?.heroGradient, transform: "translate(30%, -30%)" }} />
            <div className="p-6 flex items-center justify-between relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: currentTheme?.heroGradient, boxShadow: `0 4px 14px ${currentTheme?.glowColor}` }}>
                  <Store className="w-5 h-5 text-white" />
                </div>
                <h1 className="font-bold text-lg text-sidebar-foreground">{t("miKiosko")}</h1>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} className="text-sidebar-foreground">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="h-px mx-4 mb-4 rounded-full opacity-40" style={{ background: currentTheme?.heroGradient }} />
            <nav className="flex-1 px-3 space-y-1">
              {navItems.map((item) => <NavLink key={item.path} item={item} onClick={() => setMobileOpen(false)} />)}
            </nav>
            <SidebarFooter />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="lg:hidden flex items-center gap-3 p-4 border-b border-border bg-card">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: currentTheme?.heroGradient }}>
              <Store className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-foreground truncate">{t("miKiosko")}</span>
          </div>
          {/* Usuario en header mobile */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-muted-foreground hidden sm:block">{auth.user?.name}</span>
            <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto relative">
          <div className="absolute top-0 left-0 right-0 h-48 pointer-events-none z-0"
            style={{ background: `linear-gradient(180deg, rgb(var(--theme-from) / 0.04) 0%, transparent 100%)` }} />
          <div className="relative z-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
