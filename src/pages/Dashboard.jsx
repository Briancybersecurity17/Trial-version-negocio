import { fmtMoneda, fmtExacto } from "@/utils/currency";
import { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Search, AlertTriangle, XCircle, TrendingUp, Package, ShoppingBag, ChevronDown } from "lucide-react";
import ProductCard from "../components/ProductCard";
import SaleDialog from "../components/SaleDialog";
import InventoryDialog from "../components/InventoryDialog";
import CashRegisterPanel from "../components/CashRegisterPanel";
import OpenRegisterDialog from "../components/OpenRegisterDialog";
import moment from "moment";
import "moment/locale/es";
import "moment/locale/en-gb";
import { useLanguage } from "@/lib/LanguageContext";
import { useTheme } from "@/lib/ThemeContext";
import { useAuth } from "@/lib/AuthContext";

export default function Dashboard() {
  const { t, lang } = useLanguage();
  const { currentTheme } = useTheme();
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [register, setRegister] = useState(null);
  const [salesToday, setSalesToday] = useState([]);
  const [purchasesToday, setPurchasesToday] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [saleProduct, setSaleProduct] = useState(null);
  const [invProduct, setInvProduct] = useState(null);
  const [showOpenRegister, setShowOpenRegister] = useState(false);
  const [suggestedBalance, setSuggestedBalance] = useState(0);
  const [showPurchases, setShowPurchases] = useState(false);

  const today = moment().format("YYYY-MM-DD");

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Calcula el total neto de ventas de un arreglo de CashSale:
   * suma ventas normales y descuenta devoluciones.
   */
  const calcNetSales = (sales) =>
    sales.reduce((sum, s) => sum + (s.total || 0), 0);

  /**
   * Cierra automáticamente una caja que quedó abierta de un día anterior.
   * Consulta las ventas REALES de ese día para calcular el balance de cierre.
   * Devuelve el closing_balance calculado.
   */
  const autoCloseRegister = async (openReg) => {
    // Traer todas las ventas del día en que quedó abierta la caja
    const prevSales = await base44.entities.CashSale.filter(
      { sale_date: openReg.date },
      "-created_date",
      500
    );

    const actualSales = calcNetSales(prevSales);
    const closingBalance = openReg.opening_balance + actualSales;

    await base44.entities.CashRegister.update(openReg.id, {
      closing_balance: closingBalance,
      status: "closed",
      total_sales: actualSales,
      auto_closed: true,   // campo informativo para reportes
    });

    console.info(
      `[CashRegister] Auto-cierre de caja ${openReg.date}: ` +
      `apertura=$${openReg.opening_balance} + ventas=$${actualSales} = cierre=$${closingBalance}`
    );

    return closingBalance;
  };

  // ─── Carga de datos ───────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);

    const [prods, registers, sales, purchases] = await Promise.all([
      base44.entities.Product.list("-updated_date", 200),
      base44.entities.CashRegister.filter({ date: today }),
      base44.entities.CashSale.filter({ sale_date: today }, "-created_date", 500),
      base44.entities.InventoryTransaction.filter(
        { transaction_date: today, type: "entrada" },
        "-created_date",
        500
      ),
    ]);

    setProducts(prods);
    setSalesToday(sales);
    setPurchasesToday(
      purchases.filter(
        (tr) =>
          tr.reason !== "Devolución" &&
          tr.reason !== "Ajuste de Inventario" &&
          tr.reason !== "Otro"
      )
    );

    if (registers.length > 0) {
      // ✅ Ya existe caja para hoy → usarla directamente
      setRegister(registers[0]);
    } else {
      // No hay caja para hoy → buscar la última para sugerir balance inicial
      const allRegisters = await base44.entities.CashRegister.list("-date", 1);

      if (allRegisters.length > 0) {
        const lastReg = allRegisters[0];

        if (lastReg.status === "closed") {
          // ✅ Caso normal: el usuario cerró la caja ayer
          setSuggestedBalance(lastReg.closing_balance);

        } else if (lastReg.status === "open") {
          // ⚠️ Caso límite: el usuario NO cerró la caja del día anterior.
          // Se genera un cierre automático con ventas REALES de ese día.
          const closingBalance = await autoCloseRegister(lastReg);
          setSuggestedBalance(closingBalance);

          toast.warning(
            lang === "en"
              ? `Previous register (${lastReg.date}) was auto-closed. Balance: ${fmtMoneda(closingBalance)}`
              : `La caja del ${lastReg.date} se cerró automáticamente. Balance: ${fmtMoneda(closingBalance)}`,
            { duration: 6000 }
          );
        }
      }

      // No hay caja abierta para hoy → mostrar diálogo de apertura
      setRegister(null);
      setShowOpenRegister(true);
    }

    setLoading(false);
  }, [today]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Totales ──────────────────────────────────────────────────────────────

  const totalSalesToday = salesToday
    .filter(s =>
      !s.notes?.toLowerCase().includes("devolución") &&
      !s.notes?.toLowerCase().includes("return")
    )
    .reduce((sum, s) => sum + (s.total || 0), 0);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleOpenRegister = async (balance) => {
    const reg = await base44.entities.CashRegister.create({
      date: today,
      opening_balance: balance,
      closing_balance: 0,
      status: "open",
      total_sales: 0,
    });
    setRegister(reg);
    toast.success(`${lang === "en" ? "Register opened" : "Caja abierta"}. ${fmtMoneda(balance)}`);
  };

  const handleCloseRegister = async () => {
    if (!register) return;
    const closingBalance = register.opening_balance + totalSalesToday;
    await base44.entities.CashRegister.update(register.id, {
      closing_balance: closingBalance,
      status: "closed",
      total_sales: totalSalesToday,
    });
    setRegister({ ...register, closing_balance: closingBalance, status: "closed", total_sales: totalSalesToday });
    toast.success(`${lang === "en" ? "Register closed" : "Caja cerrada"}. ${fmtMoneda(closingBalance)}`);
  };

  const handleReopenRegister = async () => {
    if (!register) return;
    await base44.entities.CashRegister.update(register.id, { status: "open", closing_balance: 0 });
    setRegister({ ...register, status: "open", closing_balance: 0 });
    toast.success(lang === "en" ? "Register reopened" : "Caja reabierta");
  };

  const handleSale = async ({ product, quantity, total, notes }) => {
    if (!register || register.status === "closed") {
      toast.error(t("cajaNoAbierta"));
      return;
    }
    await base44.entities.CashSale.create({
      register_id: register.id, product_id: product.id, product_name: product.name,
      quantity, unit_price: product.price, total, sale_date: today, notes: notes || "",
    });
    const newStock = product.stock - quantity;
    await base44.entities.Product.update(product.id, { stock: newStock });
    await base44.entities.InventoryTransaction.create({
      product_id: product.id, product_name: product.name, type: "salida",
      quantity, reason: "Venta", stock_before: product.stock, stock_after: newStock, transaction_date: today,
    });
    toast.success(`${t("ventaRegistrada")}: ${quantity}x ${product.name} = ${fmtMoneda(total)}`);
    loadData();
  };

  const handleInventory = async ({ product, type, quantity, reason, notes, stockBefore, stockAfter, unitCost, totalCost }) => {
    let adjustedTotalCost = totalCost;

    if (type === "salida" && reason.toLowerCase().includes("merma")) {
      adjustedTotalCost = quantity * (product.cost || unitCost || 0);
    }
    if (type === "entrada" && reason === "Devolución") {
      adjustedTotalCost = 0;
    }

    await base44.entities.Product.update(product.id, { stock: stockAfter });
    await base44.entities.InventoryTransaction.create({
      product_id: product.id, product_name: product.name, type, quantity, reason,
      notes: notes || "", stock_before: stockBefore, stock_after: stockAfter,
      unit_cost: unitCost || 0, total_cost: adjustedTotalCost, transaction_date: today,
    });

    if (type === "entrada" && reason === "Devolución" && register && register.status !== "closed") {
      const devTotal = -(quantity * product.price);
      await base44.entities.CashSale.create({
        register_id: register.id,
        product_id: product.id,
        product_name: product.name,
        quantity: -quantity,
        unit_price: product.price,
        total: devTotal,
        sale_date: today,
        notes: lang === "en" ? `Return: ${notes || ""}` : `Devolución: ${notes || ""}`,
      });
      toast.success(`${t("devolucionRegistrada")}: ${quantity}x ${product.name}`);
    } else {
      toast.success(`${product.name}: ${stockBefore} → ${stockAfter} ${lang === "en" ? "units" : "uds."}`);
    }
    loadData();
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const normalize = (s) => s
  .trim()
  .toLowerCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]/g, "") // elimina todo lo que no sea letra o número
  .replace(/(\d+)/g, (m) => String(parseInt(m, 10))); // normaliza números (0600 → 600)

  const filtered = products.filter((p) => {
    const matchSearch =
      normalize(p.name).includes(normalize(search)) ||
      normalize(p.sku).includes(normalize(search));
    return matchSearch;
  });

  const outOfStock = products.filter((p) => p.stock === 0).length;
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.min_stock).length;
  const totalPurchasesToday = purchasesToday.reduce((sum, tr) => sum + (tr.total_cost || 0), 0);

  const dateLabel = useMemo(() => {
    const now = new Date();
    if (lang === "es") {
      const weekday = now.toLocaleDateString("es-AR", { weekday: "long" });
      const day     = now.getDate();
      const month   = now.toLocaleDateString("es-AR", { month: "long" });
      const year    = now.getFullYear();
      return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${day} de ${month.charAt(0).toUpperCase() + month.slice(1)} de ${year}`;
    }
    return now.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  }, [lang]);

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">{dateLabel}</p>
      </div>

      {register && (
        <CashRegisterPanel
          register={register}
          totalSalesToday={totalSalesToday}
          onCloseRegister={handleCloseRegister}
          onReopenRegister={handleReopenRegister}
        />
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl bg-gradient-to-br from-card to-success/20 border border-border p-4" style={{ boxShadow: "0 4px 24px rgba(34,197,94,0.20)" }}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Package className="w-3.5 h-3.5" />
            {t("productos")}
          </div>
          <p className="text-2xl font-bold">{products.length}</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-card to-primary/20 border border-border p-4" style={{ boxShadow: `0 4px 24px ${currentTheme?.glowColor || "rgba(0,0,0,0.15)"}` }}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            {t("ventasHoy")}
          </div>
          <p className="text-2xl font-bold">{salesToday.length}</p>
          <p className="text-sm font-semibold text-primary">{fmtMoneda(totalSalesToday)}</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-card to-destructive/20 border border-border p-4" style={{ boxShadow: "0 4px 24px rgba(239,68,68,0.25)" }}>
          <div className="flex items-center gap-2 text-xs text-destructive mb-1">
            <XCircle className="w-3.5 h-3.5" />
            {t("sinStock")}
          </div>
          <p className="text-2xl font-bold text-destructive">{outOfStock}</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-card to-warning/20 border border-border p-4" style={{ boxShadow: "0 4px 24px rgba(245,158,11,0.25)" }}>
          <div className="flex items-center gap-2 text-xs text-warning mb-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            {t("stockBajo")}
          </div>
          <p className="text-2xl font-bold text-warning">{lowStock}</p>
        </div>
      </div>

      {totalPurchasesToday > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-card to-warning/10 border border-border overflow-hidden" style={{ boxShadow: "0 4px 32px rgba(245,158,11,0.22)" }}>
          <button
            onClick={() => setShowPurchases(!showPurchases)}
            className="w-full flex items-center justify-between p-5 hover:bg-muted/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-warning" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">{t("gastosComprasHoy")}</h3>
                <p className="text-xs text-muted-foreground">{purchasesToday.length} {t("ingresosDeStock")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-warning">{fmtMoneda(totalPurchasesToday)}</span>
              <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${showPurchases ? "rotate-180" : ""}`} />
            </div>
          </button>
          {showPurchases && (
            <div className="px-5 pb-5 space-y-2 border-t border-border/50 pt-3">
              {purchasesToday.map((tr) => (
                <div key={tr.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-gradient-to-r from-muted/30 to-muted/20">
                  <div>
                    <span className="font-medium">{tr.product_name}</span>
                    <span className="text-muted-foreground ml-2">
                      {tr.quantity} {lang === "en" ? "units" : "uds."} × {fmtMoneda((tr.unit_cost || 0))}
                    </span>
                  </div>
                  <span className="font-semibold">{fmtMoneda((tr.total_cost || 0))}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder={t("buscarProducto")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-11" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{t("noHayProductos")}</p>
          <p className="text-sm">{t("agregarDesdeProductos")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} onSell={setSaleProduct} onInventory={setInvProduct} />
          ))}
        </div>
      )}

      <SaleDialog open={!!saleProduct} onOpenChange={(v) => !v && setSaleProduct(null)} product={saleProduct} onConfirm={handleSale} />
      {isAdmin && <InventoryDialog open={!!invProduct} onOpenChange={(v) => !v && setInvProduct(null)} product={invProduct} onConfirm={handleInventory} />}
      <OpenRegisterDialog open={showOpenRegister} onOpenChange={setShowOpenRegister} suggestedBalance={suggestedBalance} onConfirm={handleOpenRegister} />
    </div>
  );
}