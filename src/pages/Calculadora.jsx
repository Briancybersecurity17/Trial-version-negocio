import { fmtExacto } from "@/utils/currency";
import { useState, useEffect, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Calculator, TrendingUp, RotateCcw } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { useTheme } from "@/lib/ThemeContext";

const normalize = (s) =>
  s.trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .replace(/(\d+)/g, (m) => String(parseInt(m, 10)));

// Tiempo de espera (ms) antes de guardar en DB tras dejar de tipear
const DEBOUNCE_MS = 800;

export default function Calculadora() {
  const { lang, tCat } = useLanguage();
  const { currentTheme } = useTheme();

  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [globalPct, setGlobalPct] = useState("");

  // { [product_id]: string } — valor del input de cada producto
  const [overrides, setOverrides] = useState({});

  // { [product_id]: string } — id del registro PriceMarkup en la DB
  const [markupIds, setMarkupIds] = useState({});

  // Refs para debounce por producto
  const debounceTimers = useRef({});

  // ─── i18n inline ─────────────────────────────────────────────────────────
  const tx = {
    title:      lang === "en" ? "Profit Calculator"        : "Calculadora de Ganancias",
    desc:       lang === "en" ? "Set a profit margin for each product and see the suggested sale price instantly." : "Definí el margen de ganancia de cada producto y mirá el precio de venta sugerido al instante.",
    searchPh:   lang === "en" ? "Search by name or SKU..." : "Buscar por nombre o SKU...",
    globalPh:   lang === "en" ? "e.g. 80"                  : "ej: 80",
    applyBtn:   lang === "en" ? "Apply"                    : "Aplicar",
    resetBtn:   lang === "en" ? "Reset"                    : "Limpiar",
    cost:       lang === "en" ? "Cost"                     : "Costo",
    curPrice:   lang === "en" ? "Current price"            : "Precio actual",
    pctLabel:   lang === "en" ? "Profit %"                 : "% Ganancia",
    suggested:  lang === "en" ? "Suggested price"          : "Precio sugerido",
    profit:     lang === "en" ? "Profit"                   : "Ganancia",
    noProducts: lang === "en" ? "No products found"        : "No se encontraron productos",
    noCost:     lang === "en" ? "No cost loaded"           : "Sin costo cargado",
    pctPh:      lang === "en" ? "e.g. 80"                  : "ej: 80",
  };

  // ─── Carga inicial: productos + márgenes guardados ────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      const [prods, markups] = await Promise.all([
        base44.entities.Product.list("-updated_date", 500),
        base44.entities.PriceMarkup.list(null, 500),
      ]);
      setProducts(prods);

      // Reconstruir overrides y markupIds desde la DB
      const ov  = {};
      const ids = {};
      markups.forEach((m) => {
        ov[m.product_id]  = String(m.markup_pct);
        ids[m.product_id] = m.id;
      });
      setOverrides(ov);
      setMarkupIds(ids);
      setLoading(false);
    })();
  }, []);

  // ─── Guardar un % en la DB (con debounce) ────────────────────────────────
  const persistMarkup = (productId, rawValue) => {
    if (debounceTimers.current[productId])
      clearTimeout(debounceTimers.current[productId]);

    debounceTimers.current[productId] = setTimeout(async () => {
      const pct = parseFloat(rawValue);

      // Campo borrado: eliminar registro si existe
      if (rawValue === "" || isNaN(pct)) {
        if (markupIds[productId]) {
          await base44.entities.PriceMarkup.delete(markupIds[productId]);
          setMarkupIds((prev) => { const n = { ...prev }; delete n[productId]; return n; });
        }
        return;
      }

      // Actualizar si existe, crear si no
      if (markupIds[productId]) {
        await base44.entities.PriceMarkup.update(markupIds[productId], { markup_pct: pct });
      } else {
        const created = await base44.entities.PriceMarkup.create({ product_id: productId, markup_pct: pct });
        setMarkupIds((prev) => ({ ...prev, [productId]: created.id }));
      }
    }, DEBOUNCE_MS);
  };

  // ─── Cambio de un % individual ───────────────────────────────────────────
  const handleOverrideChange = (productId, value) => {
    setOverrides((prev) => ({ ...prev, [productId]: value }));
    persistMarkup(productId, value);
  };

  // ─── Aplicar % global a todos ────────────────────────────────────────────
  const handleApplyGlobal = () => {
    const pct = parseFloat(globalPct);
    if (isNaN(pct) || pct < 0) return;
    const next = {};
    products.forEach((p) => { next[p.id] = String(pct); });
    setOverrides(next);
    products.forEach((p) => persistMarkup(p.id, String(pct)));
  };

  // ─── Limpiar todo ─────────────────────────────────────────────────────────
  const handleReset = async () => {
    setOverrides({});
    setGlobalPct("");
    await Promise.all(
      Object.values(markupIds).map((id) => base44.entities.PriceMarkup.delete(id))
    );
    setMarkupIds({});
  };

  // ─── Cálculo sugerido ─────────────────────────────────────────────────────
  const calcSuggested = (cost, pct) => {
    if (!cost || pct === null || isNaN(pct) || pct < 0) return null;
    return cost * (1 + pct / 100);
  };

  // ─── Filtro de búsqueda ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = normalize(search);
    return products.filter(
      (p) => normalize(p.name || "").includes(q) || normalize(p.sku || "").includes(q)
    );
  }, [products, search]);

  const themeFrom = currentTheme?.from || "#f97316";
  const themeTo   = currentTheme?.to   || "#fbbf24";

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">

      {/* Encabezado */}
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow"
          style={{ background: `linear-gradient(135deg, ${themeFrom}, ${themeTo})` }}
        >
          <Calculator className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">{tx.title}</h1>
          <p className="text-sm text-muted-foreground">{tx.desc}</p>
        </div>
      </div>

      {/* Barra de herramientas */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={tx.searchPh}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 items-center">
          <Input
            type="number"
            min="0"
            className="w-28 text-center"
            placeholder={tx.globalPh}
            value={globalPct}
            onChange={(e) => setGlobalPct(e.target.value)}
          />
          <Button
            onClick={handleApplyGlobal}
            disabled={globalPct === "" || isNaN(parseFloat(globalPct))}
            style={{ background: `linear-gradient(135deg, ${themeFrom}, ${themeTo})`, border: "none", color: "white" }}
          >
            <TrendingUp className="w-4 h-4 mr-1" />
            {tx.applyBtn}
          </Button>
          <Button variant="outline" size="icon" onClick={handleReset} title={tx.resetBtn}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">{tx.noProducts}</div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3 bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <span>{lang === "en" ? "Product" : "Producto"}</span>
            <span className="text-right">{tx.cost}</span>
            <span className="text-right">{tx.curPrice}</span>
            <span className="text-center">{tx.pctLabel}</span>
            <span className="text-right">{tx.suggested}</span>
          </div>

          <div className="divide-y divide-border">
            {filtered.map((product) => {
              const cost      = product.cost  || 0;
              const curPrice  = product.price || 0;
              const rawPct    = overrides[product.id] ?? "";
              const pct       = rawPct === "" ? null : parseFloat(rawPct);
              const suggested = calcSuggested(cost, pct);
              const gain      = suggested !== null ? suggested - cost : null;
              const valid     = pct !== null && !isNaN(pct) && pct >= 0;

              return (
                <div
                  key={product.id}
                  className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-3 md:gap-4 px-5 py-4 items-center hover:bg-muted/30 transition-colors"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-foreground text-sm leading-tight">{product.name}</span>
                    {product.sku      && <span className="text-xs text-muted-foreground">{product.sku}</span>}
                    {product.category && <span className="text-xs text-muted-foreground/70">{tCat(product.category)}</span>}
                  </div>

                  <div className="flex md:justify-end items-center gap-1">
                    <span className="text-xs text-muted-foreground md:hidden">{tx.cost}:</span>
                    {cost > 0
                      ? <span className="text-sm font-mono text-foreground">{fmtExacto(cost)}</span>
                      : <span className="text-xs text-muted-foreground italic">{tx.noCost}</span>
                    }
                  </div>

                  <div className="flex md:justify-end items-center gap-1">
                    <span className="text-xs text-muted-foreground md:hidden">{tx.curPrice}:</span>
                    <span className="text-sm font-mono text-muted-foreground">{fmtExacto(curPrice)}</span>
                  </div>

                  <div className="flex md:justify-center items-center gap-1">
                    <span className="text-xs text-muted-foreground md:hidden">{tx.pctLabel}:</span>
                    <div className="relative w-24">
                      <Input
                        type="number"
                        min="0"
                        className="pr-6 text-center text-sm h-8"
                        placeholder={tx.pctPh}
                        value={rawPct}
                        onChange={(e) => handleOverrideChange(product.id, e.target.value)}
                        disabled={cost <= 0}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">%</span>
                    </div>
                  </div>

                  <div className="flex md:justify-end items-center gap-2 md:gap-1 flex-wrap">
                    <span className="text-xs text-muted-foreground md:hidden">{tx.suggested}:</span>
                    {valid && suggested !== null ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-sm font-bold font-mono" style={{ color: themeFrom }}>
                          {fmtExacto(suggested)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          +{fmtExacto(gain)} {tx.profit.toLowerCase()}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground/40">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
