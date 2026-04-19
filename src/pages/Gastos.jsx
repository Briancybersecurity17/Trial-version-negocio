import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Search, ShoppingBag, Calendar as CalendarIcon } from "lucide-react";
import moment from "moment";
import { useLanguage } from "@/lib/LanguageContext";

export default function Gastos() {
  const { t, lang, tReason } = useLanguage();
  const [transactions, setTransactions] = useState(/** @type {any[]} */ ([]));
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    moment.locale(lang === "en" ? "en-gb" : "es");
  }, [lang]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const all = await base44.entities.InventoryTransaction.list("-transaction_date", 1000);
      setTransactions(all);
      setLoading(false);
    };
    load();
  }, []);

  // Solo entradas de compra/reabastecimiento
  const entradas = transactions.filter(
    (tr) => tr.type === "entrada" && tr.reason === "Compra/Reabastecimiento"
  );

  const normalize = (s) => s
    .trim()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "") // elimina todo lo que no sea letra o número
    .replace(/(\d+)/g, (m) => String(parseInt(m, 10))); // normaliza números (0600 → 600)

  // Filtro por búsqueda y fecha
  const filtered = entradas.filter((tr) => {
    const matchSearch = 
      !search || 
      normalize(tr.product_name || "").includes(normalize(search));
    const matchDate = !dateFilter || tr.transaction_date === dateFilter;
    return matchSearch && matchDate;
  });

  /** @param {any} tr */
  const getTotal = (tr) => {
    if (tr.total_cost && tr.total_cost > 0) return tr.total_cost;
    return (tr.quantity || 0) * (tr.unit_cost || 0);
  };

  const totalFiltered = filtered.reduce((sum, tr) => sum + getTotal(tr), 0);

  const grouped = /** @type {{ [date: string]: any[] }} */ ({});
  filtered.forEach((tr) => {
    const date = tr.transaction_date || "__nodate__";
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(tr);
  });
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  /** @param {string} date */
  const formatDate = (date) => {
    if (date === "__nodate__") return lang === "en" ? "No date" : "Sin fecha";
    const locale = lang === "en" ? "en-gb" : "es";
    return lang === "en"
      ? moment(date).locale(locale).format("dddd, MMMM D, YYYY")
      : moment(date).locale(locale).format("dddd, D [de] MMMM [de] YYYY");
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{t("gastos")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{entradas.length} {t("entradasRegistradas")}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t("buscarPorProducto")} value={search} onChange={(/** @type {import("react").ChangeEvent<HTMLInputElement>} */ e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="relative">
          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input type="date" value={dateFilter} onChange={(/** @type {import("react").ChangeEvent<HTMLInputElement>} */ e) => setDateFilter(e.target.value)} className="pl-10 w-full sm:w-48" />
        </div>
      </div>

      <div className="rounded-xl bg-gradient-to-r from-warning/10 to-warning/5 border border-warning/30 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-5 h-5 text-warning" />
          <span className="text-sm text-muted-foreground">{t("totalGastado")}</span>
        </div>
        <span className="text-2xl font-bold text-warning">${totalFiltered.toFixed(2)}</span>
      </div>

      {sortedDates.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{t("noHayGastos")}</p>
          <p className="text-sm">{t("ingresarStockParaVer")}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => {
            const dayItems = grouped[date];
            const dayTotal = dayItems.reduce((s, tr) => s + getTotal(tr), 0);
            return (
              <div key={date} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground capitalize">{formatDate(date)}</h3>
                  <span className="text-sm font-bold">${dayTotal.toFixed(2)}</span>
                </div>
                <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-card/95 overflow-hidden divide-y divide-border">
                  {dayItems.map((tr) => (
                    <div key={tr.id} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
                      <div>
                        <p className="font-medium text-sm">{tr.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {tr.quantity} {t("unidades")} × ${(tr.unit_cost || 0).toFixed(2)}
                          {tr.reason && ` · ${tReason(tr.reason)}`}
                        </p>
                      </div>
                      <span className="font-bold">${getTotal(tr).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}