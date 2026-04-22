import { createContext, useContext, useEffect, useState, useCallback } from "react";
import moment from "moment";
import "moment/locale/es";
import "moment/locale/en-gb";

// ─── Default (built-in) categories ───────────────────────────────────────────
export const DEFAULT_CATEGORY_KEYS = [
  "Alimentos", "Bebidas", "Snacks", "Dulces",
  "Cigarros", "Higiene", "Limpieza", "Otros"
];

export const DEFAULT_CATEGORY_LABELS = {
  es: {
    Alimentos: "Alimentos", Bebidas: "Bebidas", Snacks: "Snacks",
    Dulces: "Dulces", Cigarros: "Cigarros", Higiene: "Higiene",
    Limpieza: "Limpieza", Otros: "Otros",
  },
  en: {
    Alimentos: "Food", Bebidas: "Drinks", Snacks: "Snacks",
    Dulces: "Sweets", Cigarros: "Cigarettes", Higiene: "Hygiene",
    Limpieza: "Cleaning", Otros: "Others",
  }
};

// Legacy mutable exports so old direct-import sites still work at runtime
export let CATEGORY_KEYS = [...DEFAULT_CATEGORY_KEYS];
export let CATEGORY_LABELS = {
  es: { ...DEFAULT_CATEGORY_LABELS.es },
  en: { ...DEFAULT_CATEGORY_LABELS.en },
};

// ─── Reasons (unchanged) ─────────────────────────────────────────────────────
export const REASON_LABELS = {
  es: {
    "Compra/Reabastecimiento": "Compra/Reabastecimiento",
    "Devolución": "Devolución",
    "Ajuste de inventario": "Ajuste de inventario",
    "Otro": "Otro",
    "Merma/Desperdicio": "Merma/Desperdicio",
    "Venta": "Venta",
  },
  en: {
    "Compra/Reabastecimiento": "Purchase/Restock",
    "Devolución": "Return",
    "Ajuste de inventario": "Inventory Adjustment",
    "Otro": "Other",
    "Merma/Desperdicio": "Waste/Loss",
    "Venta": "Sale",
  }
};

export const REASONS_ENTRADA_KEYS = ["Compra/Reabastecimiento", "Devolución", "Ajuste de inventario", "Otro"];
export const REASONS_SALIDA_KEYS = ["Merma/Desperdicio", "Ajuste de inventario", "Otro"];

// ─── Settings helpers ─────────────────────────────────────────────────────────
async function fetchSettings() {
  try {
    if (typeof window !== "undefined" && window.electronSettings) {
      return await window.electronSettings.get();
    }
    const res = await fetch("/api/settings/get");
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

async function saveSettings(data) {
  try {
    if (typeof window !== "undefined" && window.electronSettings) {
      await window.electronSettings.set(data);
      return;
    }
    await fetch("/api/settings/set", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch (e) {
    console.error("Error saving settings", e);
  }
}

function buildCategoryData(customCategories = []) {
  const keys = [...DEFAULT_CATEGORY_KEYS];
  const labels = {
    es: { ...DEFAULT_CATEGORY_LABELS.es },
    en: { ...DEFAULT_CATEGORY_LABELS.en },
  };
  for (const cat of customCategories) {
    if (!keys.includes(cat.key)) keys.push(cat.key);
    labels.es[cat.key] = cat.es || cat.key;
    labels.en[cat.key] = cat.en || cat.es || cat.key;
  }
  return { keys, labels };
}

// ─── Translations ─────────────────────────────────────────────────────────────
const translations = {
  es: {
    dashboard: "Dashboard", productos: "Productos", ventas: "Ventas",
    gastos: "Gastos", calendario: "Calendario", opciones: "Opciones",
    inventario: "Inventario", mermas: "Mermas",
    sistema: "Sistema de gestión de negocio",
    miKiosko: "Mi Negocio", puntoDeVenta: "Punto de venta",
    producto: "Producto", productosRegistrados: "productos registrados",
    ventasHoy: "Ventas Hoy", sinStock: "Sin Stock", stockBajo: "Stock Bajo",
    gastosComprasHoy: "Gastos en Compras Hoy", ingresosDeStock: "ingresos de stock",
    buscarProducto: "Buscar producto por nombre o SKU...",
    noHayProductos: "No hay productos",
    agregarDesdeProductos: "Agrega productos desde la sección de Productos",
    cajaNoAbierta: "La caja no está abierta",
    ventaRegistrada: "Venta registrada",
    cajaDia: "Caja del Día", cerrarCaja: "Cerrar Caja", reabrirCaja: "Reabrir Caja",
    apertura: "Apertura", actual: "Actual", cierre: "Cierre",
    balanceActual: "Balance Actual", ventasDelDia: "Ventas del Día",
    calendarioDesc: "Registro diario de caja y ventas",
    sinCajaEsteDia: "No se abrió caja este día.",
    nuevaProducto: "Nuevo Producto", buscarPorNombreOSku: "Buscar por nombre o SKU...",
    todos: "Todos", categoria: "Categoría", stock: "Stock",
    precio: "Precio", costo: "Costo", acciones: "Acciones",
    productoActualizado: "Producto actualizado", productoCreado: "Producto creado",
    eliminarConfirm: "¿Eliminar", productoEliminado: "Producto eliminado",
    noHayProductosFiltro: "No hay productos", inventarioActualizado: "Inventario actualizado",
    editarProducto: "Editar Producto", nuevoProducto: "Nuevo Producto",
    nombre: "Nombre", skuCodigo: "SKU / Código", seleccionar: "Seleccionar...",
    precioVenta: "Precio de Venta", precioCompra: "Precio de Compra",
    stockActual: "Stock Actual", stockMinimo: "Stock Mínimo",
    urlImagen: "URL de Imagen (opcional)", guardar: "Guardar", cancelar: "Cancelar",
    movimientoInventario: "Movimiento de Inventario",
    stockActualLabel: "Stock actual", entrada: "Entrada", salida: "Salida",
    cantidad: "Cantidad", razon: "Razón", seleccionarRazon: "Seleccionar razón...",
    notasOpcional: "Notas (opcional)", notasPlaceholder: "Notas...",
    costoUnitario: "Costo unitario ($)", nuevoStock: "Nuevo stock",
    costoTotal: "Costo total", confirmar: "Confirmar", unidades: "uds.",
    registrarVenta: "Registrar Venta", stockDisponible: "Stock disponible",
    notasVenta: "Notas de la venta...", total: "Total",
    confirmarVenta: "Confirmar Venta", cadaUno: "c/u",
    vender: "Vender", costoLabel: "Costo",
    historialVentas: "Historial de Ventas",
    ventasRegistradas: "ventas registradas",
    buscarPorProducto: "Buscar por producto...",
    totalFiltrado: "Total filtrado", noHayVentas: "No hay ventas",
    entradasRegistradas: "entradas de inventario registradas",
    totalGastado: "Total gastado", noHayGastos: "No hay gastos registrados",
    ingresarStockParaVer: "Ingresá stock con costo para verlos aquí",
    mermasDesc: "Productos dados de baja por pérdida o desperdicio",
    noHayMermas: "No hay mermas registradas",
    mermasHint: "Las salidas con razón 'Merma/Desperdicio' aparecen aquí",
    totalMermas: "Total unidades perdidas", unidadesLabel: "unidades",
    inventarioDesc: "Valor total del stock por producto",
    valorStock: "Valor total del stock", valorUnitario: "Costo unitario",
    unidadesEnStock: "unidades en stock",
    noHayInventario: "No hay productos en inventario",
    totalInventario: "Valor total del inventario",
    devolucionesIncluidas: "Devoluciones incluidas",
    devolucionRegistrada: "Devolución registrada",
    devoluciones: "Devoluciones", ajustes: "Ajustes", compras: "Compras",
    otros: "Otros", entradas: "Entradas", devol: "Devol.",
    fecha: "Fecha", unitLabel: "Unit.",
    historialCompras: "Historial de Compras",
    historialDevoluciones: "Historial de Devoluciones",
    historialAjustes: "Historial de Ajustes de Inventario",
    historialOtros: "Historial de Otros Movimientos",
    opcionesTitle: "Opciones", opcionesDesc: "Configuración general de la aplicación",
    idiomaTitle: "Idioma / Language", idiomaDesc: "Cambiá el idioma de toda la aplicación",
    espanol: "Español", ingles: "English",
    exportarTitle: "Exportar base de datos",
    exportarDesc: "Descargá todos tus datos en formato Excel (.csv)",
    exportarBtn: "Exportar a Excel", exportandoBtn: "Exportando...",
    exportOk: "Archivo exportado correctamente",
    resetTitle: "Reiniciar aplicación",
    resetDesc: "Borrá todos los datos para empezar de cero. Esta acción no se puede deshacer.",
    resetBtn: "Reiniciar aplicación",
    resetConfirmTitle: "¿Estás seguro?",
    resetConfirmDesc: "Se van a eliminar TODOS los datos. Esto no se puede deshacer.",
    resetConfirmBtn: "Sí, borrar todo", reiniciandoBtn: "Reiniciando...",
    resetOk: "Aplicación reiniciada correctamente", peligro: "Zona peligrosa",
    ventas: "Ventas",
    stockInicial: "Stock inicial al crear producto",
    categoriasTitle: "Categorías de productos",
    categoriasDesc: "Agregá, renombrá o eliminá categorías personalizadas",
    nuevaCategoria: "Nueva categoría",
    nombreEs: "Nombre en español",
    nombreEn: "Nombre en inglés (opcional)",
    agregarCategoria: "Agregar categoría",
    categoriaAgregada: "Categoría agregada",
    categoriaEliminada: "Categoría eliminada",
    categoriasGuardadas: "Categorías guardadas",
    categoriaExiste: "Ya existe una categoría con ese nombre",
    categoriaDefecto: "Categoría predeterminada (no se puede eliminar)",
    editarCategoria: "Editar",
    categoriaActualizada: "Categoría actualizada",
    calculadora: "Calculadora",
  },
  en: {
    dashboard: "Dashboard", productos: "Products", ventas: "Sales",
    gastos: "Expenses", calendario: "Calendar", opciones: "Options",
    inventario: "Inventory", mermas: "Losses",
    sistema: "Business management system",
    miKiosko: "My Business", puntoDeVenta: "Point of sale",
    producto: "Product", productosRegistrados: "registered products",
    ventasHoy: "Sales Today", sinStock: "Out of Stock", stockBajo: "Low Stock",
    gastosComprasHoy: "Purchase Expenses Today", ingresosDeStock: "stock entries",
    buscarProducto: "Search product by name or SKU...",
    noHayProductos: "No products",
    agregarDesdeProductos: "Add products from the Products section",
    cajaNoAbierta: "The register is not open",
    ventaRegistrada: "Sale registered",
    cajaDia: "Daily Cash", cerrarCaja: "Close Register", reabrirCaja: "Reopen Register",
    apertura: "Opening", actual: "Current", cierre: "Closing",
    balanceActual: "Current Balance", ventasDelDia: "Daily Sales",
    calendarioDesc: "Daily register and sales log",
    sinCajaEsteDia: "No register was opened on this day.",
    nuevaProducto: "New Product", buscarPorNombreOSku: "Search by name or SKU...",
    todos: "All", categoria: "Category", stock: "Stock",
    precio: "Price", costo: "Cost", acciones: "Actions",
    productoActualizado: "Product updated", productoCreado: "Product created",
    eliminarConfirm: "Delete", productoEliminado: "Product deleted",
    noHayProductosFiltro: "No products", inventarioActualizado: "Inventory updated",
    editarProducto: "Edit Product", nuevoProducto: "New Product",
    nombre: "Name", skuCodigo: "SKU / Code", seleccionar: "Select...",
    precioVenta: "Sale Price", precioCompra: "Purchase Price",
    stockActual: "Current Stock", stockMinimo: "Minimum Stock",
    urlImagen: "Image URL (optional)", guardar: "Save", cancelar: "Cancel",
    movimientoInventario: "Inventory Movement",
    stockActualLabel: "Current stock", entrada: "Stock In", salida: "Stock Out",
    cantidad: "Quantity", razon: "Reason", seleccionarRazon: "Select reason...",
    notasOpcional: "Notes (optional)", notasPlaceholder: "Notes...",
    costoUnitario: "Unit cost ($)", nuevoStock: "New stock",
    costoTotal: "Total cost", confirmar: "Confirm", unidades: "units",
    registrarVenta: "Register Sale", stockDisponible: "Available stock",
    notasVenta: "Sale notes...", total: "Total",
    confirmarVenta: "Confirm Sale", cadaUno: "each",
    vender: "Sell", costoLabel: "Cost",
    historialVentas: "Sales History",
    ventasRegistradas: "registered sales",
    buscarPorProducto: "Search by product...",
    totalFiltrado: "Filtered total", noHayVentas: "No sales",
    entradasRegistradas: "inventory entries registered",
    totalGastado: "Total spent", noHayGastos: "No expenses registered",
    ingresarStockParaVer: "Add stock with cost to see them here",
    mermasDesc: "Products written off due to loss or waste",
    noHayMermas: "No losses recorded",
    mermasHint: "Exits with reason 'Waste/Loss' appear here",
    totalMermas: "Total units lost", unidadesLabel: "units",
    inventarioDesc: "Total stock value per product",
    valorStock: "Total stock value", valorUnitario: "Unit cost",
    unidadesEnStock: "units in stock",
    noHayInventario: "No products in inventory",
    totalInventario: "Total inventory value",
    devolucionesIncluidas: "Returns included",
    devolucionRegistrada: "Return registered",
    devoluciones: "Returns", ajustes: "Adjustments", compras: "Purchases",
    otros: "Other", entradas: "Entries", devol: "Returns",
    fecha: "Date", unitLabel: "Unit",
    historialCompras: "Purchase History",
    historialDevoluciones: "Return History",
    historialAjustes: "Inventory Adjustment History",
    historialOtros: "Other Inventory Entries",
    opcionesTitle: "Options", opcionesDesc: "General application settings",
    idiomaTitle: "Idioma / Language", idiomaDesc: "Change the application language",
    espanol: "Español", ingles: "English",
    exportarTitle: "Export database",
    exportarDesc: "Download all your data in Excel format (.csv)",
    exportarBtn: "Export to Excel", exportandoBtn: "Exporting...",
    exportOk: "File exported successfully",
    resetTitle: "Reset application",
    resetDesc: "Delete all data to start fresh. This action cannot be undone.",
    resetBtn: "Reset application",
    resetConfirmTitle: "Are you sure?",
    resetConfirmDesc: "ALL data will be deleted. This cannot be undone.",
    resetConfirmBtn: "Yes, delete everything", reiniciandoBtn: "Resetting...",
    resetOk: "Application reset successfully", peligro: "Danger zone",
    ventas: "Sales",
    stockInicial: "Initial stock when creating product",
    categoriasTitle: "Product categories",
    categoriasDesc: "Add, rename or delete custom categories",
    nuevaCategoria: "New category",
    nombreEs: "Name in Spanish",
    nombreEn: "Name in English (optional)",
    agregarCategoria: "Add category",
    categoriaAgregada: "Category added",
    categoriaEliminada: "Category deleted",
    categoriasGuardadas: "Categories saved",
    categoriaExiste: "A category with that name already exists",
    categoriaDefecto: "Default category (cannot be deleted)",
    editarCategoria: "Edit",
    categoriaActualizada: "Category updated",
    calculadora: "Calculator",
  }
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem("kiosko_lang") || "es");
  const [customCategories, setCustomCategories] = useState([]);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [categoryKeys, setCategoryKeys] = useState(DEFAULT_CATEGORY_KEYS);
  const [categoryLabels, setCategoryLabels] = useState(DEFAULT_CATEGORY_LABELS);

  useEffect(() => {
    fetchSettings().then((settings) => {
      const custom = Array.isArray(settings.customCategories) ? settings.customCategories : [];
      setCustomCategories(custom);
      const { keys, labels } = buildCategoryData(custom);
      setCategoryKeys(keys);
      setCategoryLabels(labels);
      CATEGORY_KEYS = keys;
      CATEGORY_LABELS = labels;
      setSettingsLoaded(true);
    });
  }, []);

  useEffect(() => {
    moment.locale(lang === "en" ? "en-gb" : "es");
  }, [lang]);

  const setLang = (l) => {
    setLangState(l);
    localStorage.setItem("kiosko_lang", l);
  };

  const updateCustomCategories = useCallback(async (newCustom) => {
    const settings = await fetchSettings();
    const updated = { ...settings, customCategories: newCustom };
    await saveSettings(updated);
    setCustomCategories(newCustom);
    const { keys, labels } = buildCategoryData(newCustom);
    setCategoryKeys(keys);
    setCategoryLabels(labels);
    CATEGORY_KEYS = keys;
    CATEGORY_LABELS = labels;
  }, []);

  const t = (key) => translations[lang]?.[key] ?? translations["es"]?.[key] ?? key;
  const tCat = (cat) => categoryLabels[lang]?.[cat] ?? cat;
  const tReason = (reason) => REASON_LABELS[lang]?.[reason] ?? reason;

  return (
    <LanguageContext.Provider value={{
      lang, setLang, t, tCat, tReason,
      categoryKeys,
      categoryLabels,
      customCategories,
      updateCustomCategories,
      settingsLoaded,
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
