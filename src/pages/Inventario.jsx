import { fmtMoneda, fmtExacto } from "@/utils/currency";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, Boxes, RotateCcw, ShoppingBag, ChevronDown } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { useTheme } from "@/lib/ThemeContext";

export default function Inventario() {
  const { t, lang, tCat } = useLanguage();
  const { currentTheme } = useTheme();
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showTable, setShowTable] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [prods, txs] = await Promise.all([
          base44.entities.Product.list("-updated_date", 2000),
          base44.entities.InventoryTransaction.list("-transaction_date", 5000),
        ]);
        setProducts(prods);
        setTransactions(txs);
      } catch (e) {
        toast.error(lang === "en" ? "Error loading inventory" : "Error al cargar el inventario");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const comprasRestock = transactions.filter((tr) => tr.type === "entrada" && tr.reason === "Compra/Reabastecimiento");
  const devoluciones = transactions.filter((tr) => tr.type === "entrada" && tr.reason === "Devolución");
  const ajustesInventario = transactions.filter((tr) => tr.type === "entrada" && tr.reason === "Ajuste de inventario");
  const otrosMovimientos = transactions.filter((tr) => tr.type === "entrada" && tr.reason === "Otro");

  const comprasByProduct = comprasRestock.reduce((map, tr) => { map[tr.product_id] = (map[tr.product_id] || 0) + (tr.quantity || 0); return map; }, {});
  const devolucionesByProduct = devoluciones.reduce((map, tr) => { map[tr.product_id] = (map[tr.product_id] || 0) + (tr.quantity || 0); return map; }, {});
  const ajustesByProduct = ajustesInventario.reduce((map, tr) => { map[tr.product_id] = (map[tr.product_id] || 0) + (tr.quantity || 0); return map; }, {});
  const otrosByProduct = otrosMovimientos.reduce((map, tr) => { map[tr.product_id] = (map[tr.product_id] || 0) + (tr.quantity || 0); return map; }, {});

  const entradasByProduct = transactions.reduce((map, tr) => {
    if (tr.type === "entrada" && ["Compra/Reabastecimiento","Devolución","Ajuste de inventario","Otro"].includes(tr.reason)) {
      map[tr.product_id] = (map[tr.product_id] || 0) + (tr.quantity || 0);
    }
    return map;
  }, {});

  // Normaliza texto para búsqueda: elimina acentos, caracteres especiales, múltiples espacios y normaliza números
  const normalize = (s) => s
    .trim()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "") // elimina todo lo que no sea letra o número
    .replace(/(\d+)/g, (m) => String(parseInt(m, 10))); // normaliza números (0600 → 600)


  const filtered = products.filter((p) =>
    !search || normalize(p.name).includes(normalize(search)) || normalize(p.sku).includes(normalize(search))
  );

  const getValor = (p) => (p.stock || 0) * (p.cost || 0);
  const totalInventario = filtered.reduce((s, p) => s + getValor(p), 0);

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{t("inventario")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("inventarioDesc")}</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder={t("buscarPorNombreOSku")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        <div className="rounded-xl bg-primary/10 border border-primary/30 p-4 flex items-center justify-between sm:col-span-2" style={{ boxShadow: `0 4px 24px ${currentTheme?.glowColor || "rgba(0,0,0,0.1)"}` }}>
          <div className="flex items-center gap-3">
            <Boxes className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">{t("totalInventario")}</span>
          </div>
          <span className="text-2xl font-bold text-primary">{fmtMoneda(totalInventario)}</span>
        </div>
        <div className="rounded-xl bg-success/10 border border-success/30 p-4 flex items-center justify-between" style={{ boxShadow: "0 4px 20px rgba(34,197,94,0.12)" }}>
          <div className="flex items-center gap-3">
            <RotateCcw className="w-5 h-5 text-success" />
            <span className="text-sm text-muted-foreground">{t("devoluciones")}</span>
          </div>
          <span className="text-2xl font-bold text-success">{devoluciones.length}</span>
        </div>
        <div className="rounded-xl bg-primary/10 border border-primary/30 p-4 flex items-center justify-between" style={{ boxShadow: `0 4px 24px ${currentTheme?.glowColor || "rgba(0,0,0,0.1)"}` }}>
          <div className="flex items-center gap-3">
            <RotateCcw className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">{t("ajustes")}</span>
          </div>
          <span className="text-2xl font-bold text-primary">{ajustesInventario.length}</span>
        </div>
        <div className="rounded-xl bg-success/10 border border-success/30 p-4 flex items-center justify-between" style={{ boxShadow: "0 4px 20px rgba(34,197,94,0.12)" }}>
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-5 h-5 text-success" />
            <span className="text-sm text-muted-foreground">{t("compras")}</span>
          </div>
          <span className="text-2xl font-bold text-success">{comprasRestock.length}</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Boxes className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{t("noHayInventario")}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-card/95 overflow-hidden">
          {/* Header colapsable */}
          <button
            onClick={() => setShowTable(!showTable)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors border-b border-border"
          >
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">{t("producto")} ({filtered.length})</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-primary">{fmtMoneda(totalInventario)}</span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${showTable ? "rotate-180" : ""}`} />
            </div>
          </button>

          {showTable && (
            <>
              {/* ── MOBILE: tarjetas (< md) ── */}
              <div className="md:hidden divide-y divide-border">
                {filtered.map((product) => {
                  const valor = getValor(product);
                  const purchaseQty = comprasByProduct[product.id] || 0;
                  const returnsQty  = devolucionesByProduct[product.id] || 0;
                  const adjustQty   = ajustesByProduct[product.id] || 0;
                  const otherQty    = otrosByProduct[product.id] || 0;
                  const totalQty    = entradasByProduct[product.id] || 0;
                  const stockColor  = product.stock === 0
                    ? "text-destructive"
                    : product.stock <= product.min_stock
                    ? "text-warning"
                    : "text-foreground";
                  return (
                    <div key={product.id} className="p-4 space-y-3">
                      {/* Nombre + categoría */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm leading-tight">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.sku}</p>
                        </div>
                        <span className="shrink-0 px-2 py-0.5 rounded-md bg-muted text-xs font-medium">
                          {tCat(product.category)}
                        </span>
                      </div>

                      {/* Métricas principales en 3 columnas */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg bg-muted/40 px-2 py-2">
                          <p className="text-xs text-muted-foreground mb-0.5">{t("unidadesEnStock")}</p>
                          <p className={`font-bold text-base ${stockColor}`}>{product.stock}</p>
                        </div>
                        <div className="rounded-lg bg-muted/40 px-2 py-2">
                          <p className="text-xs text-muted-foreground mb-0.5">{t("valorUnitario")}</p>
                          <p className="font-semibold text-sm">{fmtMoneda(product.cost || 0)}</p>
                        </div>
                        <div className="rounded-lg bg-primary/10 border border-primary/20 px-2 py-2">
                          <p className="text-xs text-muted-foreground mb-0.5">{t("valorStock")}</p>
                          <p className="font-bold text-sm text-primary">{fmtMoneda(valor)}</p>
                        </div>
                      </div>

                      {/* Movimientos (solo si hay alguno) */}
                      {(purchaseQty + returnsQty + adjustQty + otherQty) > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {purchaseQty > 0 && (
                            <span className="text-xs bg-muted rounded-full px-2.5 py-1 font-medium">
                              {t("compras")}: <span className="text-foreground font-bold">+{purchaseQty}</span>
                            </span>
                          )}
                          {returnsQty > 0 && (
                            <span className="text-xs bg-success/10 text-success rounded-full px-2.5 py-1 font-medium">
                              {t("devol")}: +{returnsQty}
                            </span>
                          )}
                          {adjustQty > 0 && (
                            <span className="text-xs bg-primary/10 text-primary rounded-full px-2.5 py-1 font-medium">
                              {t("ajustes")}: +{adjustQty}
                            </span>
                          )}
                          {otherQty > 0 && (
                            <span className="text-xs bg-warning/10 text-warning rounded-full px-2.5 py-1 font-medium">
                              {t("otros")}: +{otherQty}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Footer mobile */}
                <div className="px-4 py-3 bg-muted/30 border-t-2 border-border flex items-center justify-between">
                  <span className="font-bold text-sm">TOTAL</span>
                  <span className="font-bold text-primary text-lg">{fmtMoneda(totalInventario)}</span>
                </div>
              </div>

              {/* ── DESKTOP: tabla completa (>= md) ── */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-gradient-to-r from-muted/30 to-muted/20">
                      <th className="text-left p-4 font-medium text-muted-foreground">{t("producto")}</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">{t("categoria")}</th>
                      <th className="text-right p-4 font-medium text-muted-foreground">{t("unidadesEnStock")}</th>
                      <th className="text-right p-4 font-medium text-muted-foreground">{t("valorUnitario")}</th>
                      <th className="text-right p-4 font-medium text-muted-foreground">{t("valorStock")}</th>
                      <th className="text-right p-4 font-medium text-muted-foreground">{t("compras")}</th>
                      <th className="text-right p-4 font-medium text-muted-foreground">{t("devol")}</th>
                      <th className="text-right p-4 font-medium text-muted-foreground">{t("ajustes")}</th>
                      <th className="text-right p-4 font-medium text-muted-foreground">{t("otros")}</th>
                      <th className="text-right p-4 font-medium text-muted-foreground">{t("entradas")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((product) => {
                      const valor = getValor(product);
                      const purchaseQty = comprasByProduct[product.id] || 0;
                      const returnsQty  = devolucionesByProduct[product.id] || 0;
                      const adjustQty   = ajustesByProduct[product.id] || 0;
                      const otherQty    = otrosByProduct[product.id] || 0;
                      const totalQty    = entradasByProduct[product.id] || 0;
                      return (
                        <tr key={product.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="p-4">
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.sku}</p>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-1 rounded-md bg-muted text-xs font-medium">{tCat(product.category)}</span>
                          </td>
                          <td className="p-4 text-right">
                            <span className={`font-semibold ${product.stock === 0 ? "text-destructive" : product.stock <= product.min_stock ? "text-warning" : ""}`}>
                              {product.stock}
                            </span>
                          </td>
                          <td className="p-4 text-right text-muted-foreground">{fmtMoneda(product.cost || 0)}</td>
                          <td className="p-4 text-right font-bold text-primary">{fmtMoneda(valor)}</td>
                          <td className="p-4 text-right">
                            {purchaseQty > 0 ? <span className="text-foreground font-semibold">+{purchaseQty} {t("unidadesLabel")}</span> : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="p-4 text-right">
                            {returnsQty > 0 ? <span className="text-success font-semibold">+{returnsQty} {t("unidadesLabel")}</span> : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="text-right p-4">
                            {adjustQty > 0 ? <span className="text-primary font-semibold">+{adjustQty} {t("unidadesLabel")}</span> : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="p-4 text-right">
                            {otherQty > 0 ? <span className="text-warning font-semibold">+{otherQty} {t("unidadesLabel")}</span> : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="p-4 text-right">
                            {totalQty > 0 ? <span className="text-foreground font-semibold">+{totalQty} {t("unidadesLabel")}</span> : <span className="text-muted-foreground">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/30">
                      <td className="p-4 font-bold" colSpan={2}>TOTAL</td>
                      <td className="p-4 text-right font-bold"></td>
                      <td className="p-4 text-right font-bold"></td>
                      <td className="p-4 text-right font-bold text-primary text-lg">{fmtMoneda(totalInventario)}</td>
                      <td className="p-4"></td>
                      <td className="p-4"></td>
                      <td className="p-4"></td>
                      <td className="p-4"></td>
                      <td className="p-4"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      <Accordion type="single" collapsible defaultValue={comprasRestock.length > 0 ? "history-purchases" : undefined} className="space-y-4">
        {comprasRestock.length > 0 && (
          <AccordionItem value="history-purchases">
            <AccordionTrigger className="bg-secondary/5 px-4">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-success" />
                <span>{t("historialCompras")}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="overflow-x-auto rounded-2xl border border-secondary/20 bg-secondary/5">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-secondary/20">
                      <th className="px-4 py-3">{t("producto")}</th>
                      <th className="px-4 py-3 hidden sm:table-cell">{t("fecha")}</th>
                      <th className="px-4 py-3 text-right">{t("cantidad")}</th>
                      <th className="px-4 py-3 text-right">{t("unitLabel")}</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comprasRestock.slice(0, 20).map((tr) => (
                      <tr key={tr.id} className="border-b border-secondary/10 last:border-0 hover:bg-secondary/10 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium">{tr.product_name}</p>
                          {tr.notes && (<p className="text-xs text-muted-foreground">{tr.notes === "Stock inicial al crear el producto" ? t("stockInicial") : tr.notes}</p>)}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{tr.transaction_date}</td>
                        <td className="px-4 py-3 text-right">{tr.quantity}</td>
                        <td className="px-4 py-3 text-right">{fmtMoneda((tr.unit_cost || 0))}</td>
                        <td className="px-4 py-3 text-right">{fmtMoneda(((tr.total_cost || (tr.quantity || 0) * (tr.unit_cost || 0)) || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {devoluciones.length > 0 && (
          <AccordionItem value="history-returns">
            <AccordionTrigger className="bg-success/5 px-4">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-success" />
                <span>{t("historialDevoluciones")}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="divide-y divide-success/10">
                {devoluciones.slice(0, 20).map((tr) => (
                  <div key={tr.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{tr.product_name}</p>
                      <p className="text-xs text-muted-foreground">{tr.transaction_date} {tr.notes && `· ${tr.notes}`}</p>
                    </div>
                    <span className="font-bold text-success">+{tr.quantity} {t("unidadesLabel")}</span>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {ajustesInventario.length > 0 && (
          <AccordionItem value="history-adjustments">
            <AccordionTrigger className="bg-primary/5 px-4">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-primary" />
                <span>{t("historialAjustes")}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="divide-y divide-primary/10">
                {ajustesInventario.slice(0, 20).map((tr) => (
                  <div key={tr.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{tr.product_name}</p>
                      <p className="text-xs text-muted-foreground">{tr.transaction_date} {tr.notes && `· ${tr.notes}`}</p>
                    </div>
                    <span className="font-bold text-primary">+{tr.quantity} {t("unidadesLabel")}</span>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {otrosMovimientos.length > 0 && (
          <AccordionItem value="history-other">
            <AccordionTrigger className="bg-warning/5 px-4">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-warning" />
                <span>{t("historialOtros")}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="divide-y divide-warning/10">
                {otrosMovimientos.slice(0, 20).map((tr) => (
                  <div key={tr.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{tr.product_name}</p>
                      <p className="text-xs text-muted-foreground">{tr.transaction_date} {tr.notes && `· ${tr.notes}`}</p>
                    </div>
                    <span className="font-bold text-warning">+{tr.quantity} {t("unidadesLabel")}</span>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}