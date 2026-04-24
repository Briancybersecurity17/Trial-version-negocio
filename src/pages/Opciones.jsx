import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useLanguage, DEFAULT_CATEGORY_KEYS } from "@/lib/LanguageContext";
import { useTheme, THEMES } from "@/lib/ThemeContext";
import { useAuth } from "@/lib/AuthContext";
import { Settings, Languages, Download, Trash2, AlertTriangle, CheckCircle, Palette, HardDrive, Tag, Plus, Pencil, X, Check, ChevronDown, RotateCcw, Moon, Sun, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const isElectron = typeof window !== 'undefined' && !!window.electronDB;

export default function Opciones() {
  const { lang, setLang, t, tCat, tReason, customCategories, updateCustomCategories, categoryKeys } = useLanguage();
  const { theme, setTheme, currentTheme, darkMode, setDarkMode } = useTheme();
  const { resetApp } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [exportingJson, setExportingJson] = useState(false);
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showTheme, setShowTheme] = useState(false);

  // ── Nombre del negocio ─────────────────────────────────────────────────────
  const [businessName, setBusinessName] = useState(
    () => localStorage.getItem('negocio_nombre') || 'Mi Negocio'
  );
  const [businessNameInput, setBusinessNameInput] = useState(
    () => localStorage.getItem('negocio_nombre') || 'Mi Negocio'
  );
  const handleSaveBusinessName = async () => {
    const val = businessNameInput.trim();
    if (!val) return;
    localStorage.setItem('negocio_nombre', val);
    setBusinessName(val);
    try {
      if (isElectron) {
        const current = await window.electronSettings.get();
        await window.electronSettings.set({ ...current, businessName: val });
      } else {
        const token = localStorage.getItem('auth_token') || '';
        const current = await fetch('/api/settings/get', {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()).catch(() => ({}));
        await fetch('/api/settings/set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ...current, businessName: val }),
        });
      }
    } catch (e) {
      console.warn('No se pudo sincronizar el nombre del negocio con el backend:', e);
    }
    toast.success(lang === 'en' ? 'Business name saved' : 'Nombre guardado');
  };

  // ── Categories state ───────────────────────────────────────────────────────
  const [newCatEs, setNewCatEs] = useState("");
  const [newCatEn, setNewCatEn] = useState("");
  const [editCatKey, setEditCatKey] = useState(null);
  const [editCatEs, setEditCatEs] = useState("");
  const [editCatEn, setEditCatEn] = useState("");
  const [catLoading, setCatLoading] = useState(false);

  // Hidden default categories (persisted in localStorage)
  const [hiddenDefaults, setHiddenDefaults] = useState(() => {
    try { return JSON.parse(localStorage.getItem("hiddenDefaultCategories") || "[]"); }
    catch { return []; }
  });

  const handleHideDefault = (key) => {
    const updated = [...hiddenDefaults, key];
    setHiddenDefaults(updated);
    localStorage.setItem("hiddenDefaultCategories", JSON.stringify(updated));
    toast.success(lang === "en" ? "Category removed" : "Categoría eliminada");
  };

  const handleRestoreDefaults = () => {
    setHiddenDefaults([]);
    localStorage.removeItem("hiddenDefaultCategories");
    toast.success(lang === "en" ? "Default categories restored" : "Categorías predeterminadas restauradas");
  };

  const visibleDefaults = DEFAULT_CATEGORY_KEYS.filter(k => !hiddenDefaults.includes(k));

  // ── Exportar CSV ──────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const [products, sales, transactions] = await Promise.all([
        base44.entities.Product.list("-updated_date", 2000),
        base44.entities.CashSale.list("-created_date", 5000),
        base44.entities.InventoryTransaction.list("-transaction_date", 5000),
      ]);

      const isEn = lang === "en";
      const DELIMITER = ";";
      const NEWLINE = "\r\n";
      const cell = (v) => { if (v === null || v === undefined) return '""'; return '"' + String(v).replace(/"/g, '""') + '"'; };
      const row = (...cols) => cols.map(cell).join(DELIMITER) + NEWLINE;

      const entradas = transactions.filter(tr => tr.type === "entrada");
      const getGastoTotal = (tr) => tr.total_cost > 0 ? tr.total_cost : (tr.quantity || 0) * (tr.unit_cost || 0);
      const ventasFiltradas = sales.filter(s => !s.notes?.toLowerCase().includes("devolución") && !s.notes?.toLowerCase().includes("return"));
      const gastosFiltrados = entradas.filter(tr => tr.reason === "Compra/Reabastecimiento");
      const valorStock = products.reduce((a, p) => a + (p.stock * p.cost), 0);
      const totalVentas = ventasFiltradas.reduce((a, s) => a + (s.total || 0), 0);
      const totalGastos = gastosFiltrados.reduce((a, tr) => a + getGastoTotal(tr), 0);

      let tsv = "\uFEFF";

      tsv += (isEn ? "=== PRODUCTS ===" : "=== PRODUCTOS ===") + NEWLINE;
      tsv += isEn
        ? row("Name","SKU","Category","Current Stock","Min Stock","Sale Price","Unit Cost","Stock Value")
        : row("Nombre","SKU","Categoría","Stock Actual","Stock Mínimo","Precio Venta","Costo Unitario","Valor Stock");
      products.forEach(p => tsv += row(p.name, p.sku, tCat(p.category), p.stock, p.min_stock, p.price?.toFixed(2), p.cost?.toFixed(2), (p.stock * p.cost).toFixed(2)));
      tsv += NEWLINE;

      tsv += (isEn ? "=== SALES ===" : "=== VENTAS ===") + NEWLINE;
      tsv += isEn ? row("Date","Product","Quantity","Unit Price","Total") : row("Fecha","Producto","Cantidad","Precio Unitario","Total");
      ventasFiltradas.forEach(s => tsv += row(s.sale_date, s.product_name, s.quantity, s.unit_price?.toFixed(2), s.total?.toFixed(2)));
      tsv += isEn ? row("","","","","TOTAL SALES", totalVentas.toFixed(2)) : row("","","","","TOTAL VENTAS", totalVentas.toFixed(2));
      tsv += NEWLINE;

      tsv += (isEn ? "=== PURCHASE EXPENSES ===" : "=== GASTOS / COMPRAS ===") + NEWLINE;
      tsv += isEn ? row("Date","Product","Quantity","Unit Cost","Total Cost") : row("Fecha","Producto","Cantidad","Costo Unitario","Costo Total");
      gastosFiltrados.forEach(tr => tsv += row(tr.transaction_date, tr.product_name, tr.quantity, (tr.unit_cost||0).toFixed(2), getGastoTotal(tr).toFixed(2)));
      tsv += isEn ? row("","","","","TOTAL EXPENSES", totalGastos.toFixed(2)) : row("","","","","TOTAL GASTOS", totalGastos.toFixed(2));
      tsv += NEWLINE;

      const devoluciones = sales.filter(s => s.notes?.toLowerCase().includes("devolución") || s.notes?.toLowerCase().includes("return"));
      const ajustes = entradas.filter(tr => tr.reason === "Ajuste de inventario");
      const mermas = transactions.filter(tr => tr.type === "salida" && tr.reason?.toLowerCase().includes("merma"));
      const totalDevoluciones = devoluciones.reduce((a, s) => a + (s.total || 0), 0);
      const totalMermas = mermas.reduce((a, tr) => a + (tr.quantity || 0) * (tr.unit_cost || 0), 0);

      tsv += (isEn ? "=== RETURNS ===" : "=== DEVOLUCIONES ===") + NEWLINE;
      tsv += isEn ? row("Date","Product","Quantity","Unit Price","Total") : row("Fecha","Producto","Cantidad","Precio","Total");
      devoluciones.forEach(s => tsv += row(s.sale_date, s.product_name, s.quantity, s.unit_price?.toFixed(2), s.total?.toFixed(2)));
      tsv += isEn ? row("","","","","TOTAL RETURNS", totalDevoluciones.toFixed(2)) : row("","","","","TOTAL DEVOLUCIONES", totalDevoluciones.toFixed(2));
      tsv += NEWLINE;

      tsv += (isEn ? "=== LOSSES ===" : "=== MERMAS ===") + NEWLINE;
      tsv += isEn ? row("Date","Product","Quantity","Unit Cost","Total Cost") : row("Fecha","Producto","Cantidad","Costo","Total");
      mermas.forEach(tr => tsv += row(tr.transaction_date, tr.product_name, tr.quantity, (tr.unit_cost||0).toFixed(2), ((tr.quantity||0)*(tr.unit_cost||0)).toFixed(2)));
      tsv += isEn ? row("","","","","TOTAL LOSSES", totalMermas.toFixed(2)) : row("","","","","TOTAL MERMAS", totalMermas.toFixed(2));
      tsv += NEWLINE;

      tsv += (isEn ? "=== SUMMARY ===" : "=== RESUMEN ===") + NEWLINE;
      tsv += isEn ? row("Metric","Value") : row("Métrica","Valor");
      tsv += isEn
        ? row("Total products", products.length) + row("Stock value (cost)", valorStock.toFixed(2)) + row("Total sales", totalVentas.toFixed(2)) + row("Total expenses", totalGastos.toFixed(2)) + row("Net profit", (totalVentas - totalGastos - totalMermas).toFixed(2))
        : row("Total de productos", products.length) + row("Valor del stock (costo)", valorStock.toFixed(2)) + row("Total ventas", totalVentas.toFixed(2)) + row("Total gastos", totalGastos.toFixed(2)) + row("Ganancia neta", (totalVentas - totalGastos - totalMermas).toFixed(2));

      const blob = new Blob([tsv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mi-negocio_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("exportOk"));
    } catch (e) {
      console.error(e);
      toast.error("Error al exportar");
    } finally {
      setExporting(false);
    }
  };

  // ── Exportar JSON (backup completo) ──────────────────────────────────────
  const handleExportJson = async () => {
    setExportingJson(true);
    try {
      if (isElectron) {
        const result = await window.electronDB.exportAll();
        if (result?.success) {
          toast.success(lang === 'en' ? `Backup saved in: ${result.destDir}` : `Backup guardado en: ${result.destDir}`);
        }
      } else {
        const token = localStorage.getItem('auth_token') || '';
        const [products, sales, transactions, registers, priceMarkup, settings] = await Promise.all([
          base44.entities.Product.list(null, 5000),
          base44.entities.CashSale.list(null, 10000),
          base44.entities.InventoryTransaction.list(null, 10000),
          base44.entities.CashRegister.list(null, 5000),
          base44.entities.PriceMarkup.list(null, 1000),
          fetch('/api/settings/get', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json()).catch(() => ({})),
        ]);
        const backup = {
          backupVersion: 2,
          exportDate: new Date().toISOString(),
          Product: products,
          CashSale: sales,
          InventoryTransaction: transactions,
          CashRegister: registers,
          PriceMarkup: priceMarkup,
          _settings: settings,
        };
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `mi-negocio-backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(lang === 'en' ? 'Backup downloaded' : 'Backup descargado');
      }
    } catch (e) {
      console.error(e);
      toast.error(lang === 'en' ? 'Export error' : 'Error al exportar');
    } finally {
      setExportingJson(false);
    }
  };

  // ── Reset total de la app ─────────────────────────────────────────────────
  // Primero muestra el prompt de backup; el reset real ocurre en handleConfirmReset
  const handleReset = () => {
    setShowBackupPrompt(true);
  };

  const handleConfirmReset = async () => {
    setShowBackupPrompt(false);
    setResetting(true);
    try {
      const result = await resetApp();
      if (result.success) {
        toast.success(lang === "en" ? "App fully reset. Redirecting to login…" : "App reiniciada. Redirigiendo al inicio…");
      } else {
        toast.error(result.error || "Error al reiniciar");
      }
      setShowResetConfirm(false);
    } catch (e) {
      console.error(e);
      toast.error("Error al reiniciar");
    } finally {
      setResetting(false);
    }
  };

  // ── Category handlers ─────────────────────────────────────────────────────
  const handleAddCategory = async () => {
    const key = newCatEs.trim();
    if (!key) return;
    // Check no duplicate (case-insensitive) across all categories
    const allKeys = categoryKeys.map(k => k.toLowerCase());
    if (allKeys.includes(key.toLowerCase())) {
      toast.error(t("categoriaExiste"));
      return;
    }
    setCatLoading(true);
    const updated = [...customCategories, { key, es: key, en: newCatEn.trim() || key }];
    await updateCustomCategories(updated);
    setNewCatEs("");
    setNewCatEn("");
    setCatLoading(false);
    toast.success(t("categoriaAgregada"));
  };

  const handleDeleteCategory = async (key) => {
    const updated = customCategories.filter(c => c.key !== key);
    await updateCustomCategories(updated);
    toast.success(t("categoriaEliminada"));
  };

  const handleStartEdit = (cat) => {
    setEditCatKey(cat.key);
    setEditCatEs(cat.es);
    setEditCatEn(cat.en || "");
  };

  const handleSaveEdit = async () => {
    if (!editCatEs.trim()) return;
    const updated = customCategories.map(c =>
      c.key === editCatKey ? { ...c, es: editCatEs.trim(), en: editCatEn.trim() || editCatEs.trim() } : c
    );
    await updateCustomCategories(updated);
    setEditCatKey(null);
    toast.success(t("categoriaActualizada"));
  };

  const themeLabels = {
    naranja: lang === "en" ? "Orange" : "Naranja",
    rosa: lang === "en" ? "Pink" : "Rosa",
    rojo: lang === "en" ? "Red" : "Rojo",
    azul: lang === "en" ? "Blue" : "Azul",
  };

  return (
    <>
    <div className="p-4 lg:p-8 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md" style={{ background: currentTheme?.heroGradient }}>
          <Settings className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{t("opcionesTitle")}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{t("opcionesDesc")}</p>
        </div>
      </div>

      {/* Modo desktop */}
      {isElectron && (
        <div className="rounded-2xl border bg-card p-4 flex items-center gap-3" style={{ borderColor: `${currentTheme?.from}40` }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: currentTheme?.heroGradient }}>
            <HardDrive className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold">{lang === "en" ? "Desktop mode – offline storage" : "Modo escritorio – almacenamiento sin conexión"}</p>
            <p className="text-xs text-muted-foreground">{lang === "en" ? "Data saved locally on your computer" : "Los datos se guardan localmente en tu computadora"}</p>
          </div>
        </div>
      )}

      {/* Color theme */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <button
          onClick={() => setShowTheme(!showTheme)}
          className="w-full flex items-center justify-between p-6 hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Palette className="w-5 h-5 text-primary" />
            <div className="text-left">
              <h2 className="font-semibold text-base">{lang === "en" ? "App Color Theme" : "Color de la Aplicación"}</h2>
              <p className="text-sm text-muted-foreground">{lang === "en" ? "Choose a color palette for the entire app" : "Elegí una paleta de colores para toda la app"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full shadow-sm" style={{ background: currentTheme?.heroGradient }} />
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${showTheme ? "rotate-180" : ""}`} />
          </div>
        </button>
        {showTheme && (
          <div className="px-6 pb-6 pt-0 space-y-4 border-t border-border/50">
            <div className="grid grid-cols-2 gap-3 pt-4">
              {Object.entries(THEMES).map(([key, themeData]) => {
                const isActive = theme === key;
                return (
                  <button key={key} onClick={() => { setTheme(key); toast.success(lang === "en" ? `Theme: ${themeLabels[key]}` : `Tema: ${themeLabels[key]}`); }}
                    className={`relative overflow-hidden rounded-xl border-2 transition-all duration-300 text-left group ${isActive ? "border-transparent shadow-lg scale-[1.02]" : "border-border hover:border-transparent hover:shadow-md"}`}
                    style={isActive ? { borderColor: themeData.from, boxShadow: `0 4px 20px ${themeData.from}40` } : {}}
                  >
                    <div className="h-20 w-full relative" style={{ background: themeData.heroGradient }}>
                      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {isActive && <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center"><CheckCircle className="w-4 h-4 text-white" /></div>}
                      <div className="absolute bottom-2 left-3 flex gap-1.5">
                        {[themeData.from, themeData.mid, themeData.to].map((c, i) => <div key={i} className="w-4 h-4 rounded-full border border-white/50" style={{ backgroundColor: c }} />)}
                      </div>
                    </div>
                    <div className="px-3 py-2.5 flex items-center justify-between" style={isActive ? { background: `linear-gradient(90deg, ${themeData.from}15 0%, ${themeData.to}08 100%)` } : {}}>
                      <span className="text-sm font-semibold">{themeLabels[key]}</span>
                      {isActive && <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ background: themeData.heroGradient }}>{lang === "en" ? "Active" : "Activo"}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Idioma */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Languages className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-semibold text-base">{t("idiomaTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("idiomaDesc")}</p>
          </div>
        </div>
        <div className="flex gap-3">
          {[{ code: "es", flag: "🇪🇸🇦🇷", label: t("espanol") }, { code: "en", flag: "🇺🇸", label: t("ingles") }].map(({ code, flag, label }) => (
            <button key={code} onClick={() => setLang(code)}
              className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-2 ${lang === code ? "border-transparent text-white shadow-md" : "border-border hover:border-primary/40 text-muted-foreground"}`}
              style={lang === code ? { background: currentTheme?.heroGradient } : {}}
            >
              <span className="text-lg">{flag}</span>{label}{lang === code && <CheckCircle className="w-4 h-4" />}
            </button>
          ))}
        </div>
      </div>

      {/* Modo oscuro */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: currentTheme?.heroGradient }}>
            <Moon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-base">{lang === "en" ? "Dark Mode" : "Modo Oscuro"}</h2>
            <p className="text-sm text-muted-foreground">{lang === "en" ? "Switch between light and dark interface" : "Cambiá entre interfaz clara y oscura"}</p>
          </div>
          <button
            onClick={() => { setDarkMode(!darkMode); toast.success(darkMode ? (lang === "en" ? "Light mode activated" : "Modo claro activado") : (lang === "en" ? "Dark mode activated" : "Modo oscuro activado")); }}
            className={`relative w-14 h-7 rounded-full transition-all duration-300 focus:outline-none ${darkMode ? "bg-primary" : "bg-muted-foreground/30"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 flex items-center justify-center ${darkMode ? "translate-x-7" : "translate-x-0"}`}>
              {darkMode ? <Moon className="w-3 h-3 text-primary" /> : <Sun className="w-3 h-3 text-muted-foreground" />}
            </span>
          </button>
        </div>
      </div>

      {/* Nombre del negocio */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: currentTheme?.heroGradient }}>
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-base">
              {lang === 'en' ? 'Business Name' : 'Nombre del Negocio'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {lang === 'en' ? 'Shown on the login screen' : 'Se muestra en la pantalla de inicio de sesión'}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Input
            value={businessNameInput}
            onChange={(e) => setBusinessNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveBusinessName()}
            placeholder={lang === 'en' ? 'My Business' : 'Mi Negocio'}
            className="flex-1"
          />
          <button
            onClick={handleSaveBusinessName}
            disabled={!businessNameInput.trim() || businessNameInput.trim() === businessName}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2 transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: currentTheme?.heroGradient }}
          >
            <CheckCircle className="w-4 h-4" />
            {lang === 'en' ? 'Save' : 'Guardar'}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {lang === 'en' ? 'Current:' : 'Actual:'}{' '}
          <span className="font-semibold" style={{ color: currentTheme?.from }}>{businessName}</span>
        </p>
      </div>

      {/* Exportar */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Download className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-semibold text-base">{t("exportarTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("exportarDesc")}</p>
          </div>
        </div>
        <div className="bg-muted/50 rounded-xl p-4 text-xs text-muted-foreground space-y-1">
          <p>📦 {lang === "en" ? "Products, Sales, Expenses" : "Productos, Ventas, Gastos"}</p>
          <p>📊 {lang === "en" ? "Returns, Losses, Summary" : "Devoluciones, Mermas, Resumen"}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={handleExport} disabled={exporting}
            className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50 shadow-md"
            style={{ background: currentTheme?.heroGradient }}
          >
            <Download className="w-4 h-4" />
            {exporting ? t("exportandoBtn") : t("exportarBtn")}
          </button>
          <button onClick={handleExportJson} disabled={exportingJson}
            className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-80 disabled:opacity-50 border border-border bg-muted"
          >
            <HardDrive className="w-4 h-4" />
            {exportingJson
              ? (lang === "en" ? "Exporting..." : "Exportando...")
              : (lang === "en" ? "Backup JSON" : "Backup JSON")}
          </button>
        </div>
      </div>

      {/* Categorías */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-3">
          <Tag className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-semibold text-base">{t("categoriasTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("categoriasDesc")}</p>
          </div>
        </div>

        {/* Default categories */}
        <div className="space-y-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {lang === "en" ? "Default" : "Predeterminadas"}
            </p>
            {hiddenDefaults.length > 0 && (
              <button
                onClick={handleRestoreDefaults}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                {lang === "en" ? "Restore all" : "Restaurar todas"}
              </button>
            )}
          </div>
          {visibleDefaults.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-1">
              {lang === "en" ? "All default categories removed." : "Todas las categorías predeterminadas fueron eliminadas."}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {visibleDefaults.map((key) => (
                <div key={key} className="group flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-lg bg-muted hover:bg-muted/70 transition-colors">
                  <span className="text-xs font-medium text-muted-foreground">{key}</span>
                  <button
                    onClick={() => handleHideDefault(key)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:text-destructive hover:bg-destructive/10"
                    title={lang === "en" ? "Remove" : "Eliminar"}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Custom categories */}
        {customCategories.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {lang === "en" ? "Custom" : "Personalizadas"}
            </p>
            <div className="space-y-2">
              {customCategories.map((cat) => (
                <div key={cat.key} className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
                  {editCatKey === cat.key ? (
                    <>
                      <Input
                        className="h-7 text-sm flex-1"
                        value={editCatEs}
                        onChange={(e) => setEditCatEs(e.target.value)}
                        placeholder={t("nombreEs")}
                      />
                      <Input
                        className="h-7 text-sm flex-1"
                        value={editCatEn}
                        onChange={(e) => setEditCatEn(e.target.value)}
                        placeholder={t("nombreEn")}
                      />
                      <button onClick={handleSaveEdit} className="p-1 rounded text-green-600 hover:bg-green-100">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditCatKey(null)} className="p-1 rounded text-muted-foreground hover:bg-muted">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium">{cat.es}</span>
                      {cat.en && cat.en !== cat.es && (
                        <span className="text-xs text-muted-foreground">{cat.en}</span>
                      )}
                      <button onClick={() => handleStartEdit(cat)} className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteCategory(cat.key)} className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add new category */}
        <div className="space-y-2 pt-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {t("nuevaCategoria")}
          </p>
          <div className="flex gap-2">
            <Input
              value={newCatEs}
              onChange={(e) => setNewCatEs(e.target.value)}
              placeholder={t("nombreEs")}
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
            />
            <Input
              value={newCatEn}
              onChange={(e) => setNewCatEn(e.target.value)}
              placeholder={t("nombreEn")}
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
            />
            <Button
              onClick={handleAddCategory}
              disabled={!newCatEs.trim() || catLoading}
              size="icon"
              style={{ background: currentTheme?.heroGradient }}
              className="text-white hover:opacity-90 shrink-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <div>
            <h2 className="font-semibold text-base text-destructive">{t("peligro")}</h2>
            <p className="text-sm text-muted-foreground">{t("resetDesc")}</p>
          </div>
        </div>
        {!showResetConfirm ? (
          <Button variant="outline" className="w-full border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground" size="lg" onClick={() => setShowResetConfirm(true)}>
            <Trash2 className="w-4 h-4 mr-2" />{t("resetBtn")}
          </Button>
        ) : (
          <div className="space-y-3 bg-destructive/10 rounded-xl p-4 border border-destructive/20">
            <p className="text-sm font-semibold text-destructive text-center">{t("resetConfirmTitle")}</p>
            <p className="text-xs text-muted-foreground text-center">{t("resetConfirmDesc")}</p>
            <p className="text-xs text-muted-foreground text-center">
              {lang === "en"
                ? "⚠️ All users will be deleted. The admin account will return to its default state (user: admin / password: admin)."
                : "⚠️ Se eliminarán todos los usuarios. La cuenta admin volverá a su estado inicial (usuario: admin / contraseña: admin)."}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowResetConfirm(false)} disabled={resetting}>{t("cancelar")}</Button>
              <Button variant="destructive" className="flex-1" onClick={handleReset} disabled={resetting}>
                <Trash2 className="w-4 h-4 mr-2" />{resetting ? t("reiniciandoBtn") : t("resetConfirmBtn")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>

      {/* ── Modal de backup previo al reset ────────────────────────────────── */}
      {showBackupPrompt && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "1rem",
        }}>
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <HardDrive className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h2 className="font-bold text-base">
                  {lang === "en" ? "Back up your data first" : "¿Querés hacer un backup antes?"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {lang === "en"
                    ? "Once reset, all data is permanently deleted and cannot be recovered."
                    : "Una vez reiniciada, todos los datos se borran para siempre y no se pueden recuperar."}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={async () => { await handleExportJson(); }}
                disabled={exportingJson}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border border-border bg-muted hover:bg-muted/70 transition-all disabled:opacity-50"
              >
                <HardDrive className="w-4 h-4" />
                {exportingJson
                  ? (lang === "en" ? "Downloading..." : "Descargando...")
                  : (lang === "en" ? "Download JSON backup" : "Descargar backup JSON")}
              </button>
              <button
                onClick={async () => { await handleExport(); }}
                disabled={exporting}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border border-border bg-muted hover:bg-muted/70 transition-all disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {exporting
                  ? (lang === "en" ? "Downloading..." : "Descargando...")
                  : (lang === "en" ? "Download Excel backup" : "Descargar backup Excel")}
              </button>
            </div>
            <div className="border-t border-border pt-3 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowBackupPrompt(false)}>
                {lang === "en" ? "Cancel" : "Cancelar"}
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleConfirmReset} disabled={resetting}>
                <Trash2 className="w-4 h-4 mr-2" />
                {lang === "en" ? "Reset anyway" : "Ya hice el backup, reiniciar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}