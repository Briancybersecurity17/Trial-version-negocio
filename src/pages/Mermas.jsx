import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Search, Trash2, Calendar as CalendarIcon, DollarSign } from "lucide-react";
import moment from "moment";
import { useLanguage } from "@/lib/LanguageContext";

export default function Mermas() {
  const { t, lang } = useLanguage();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const all = await base44.entities.InventoryTransaction.list("-transaction_date", 1000);
      setTransactions(all);
      setLoading(false);
    };
    load();
  }, []);

  const mermas = transactions.filter(
    (tr) => tr.type === "salida" && tr.reason === "Merma/Desperdicio"
  );
  // Filtro por búsqueda y fecha
  const normalize = (s) => s
    .trim()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .replace(/(\d+)/g, (m) => String(parseInt(m, 10)));

  const filtered = mermas.filter((tr) => {
    const matchSearch = !search || normalize(tr.product_name || "").includes(normalize(search));
    const matchDate = !dateFilter || tr.transaction_date === dateFilter;
    return matchSearch && matchDate;
  });

  const totalUnidades = filtered.reduce((s, tr) => s + (tr.quantity || 0), 0);
  const totalCosto = filtered.reduce((s, tr) => s + ((tr.unit_cost || 0) * (tr.quantity || 0)), 0);

  const porProducto = {};
  filtered.forEach((tr) => {
    const k = tr.product_name;
    if (!porProducto[k]) porProducto[k] = { name: k, total: 0 };
    porProducto[k].total += tr.quantity || 0;
  });
  const resumenProductos = Object.values(porProducto).sort((a, b) => b.total - a.total);

  const grouped = {};
  filtered.forEach((tr) => {
    const date = tr.transaction_date || "__nodate__";
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(tr);
  });
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const formatDate = (date) => {
    if (date === "__nodate__") return lang === "en" ? "No date" : "Sin fecha";
    return lang === "en"
      ? moment(date).format("dddd, MMMM D, YYYY")
      : moment(date).format("dddd, D [de] MMMM [de] YYYY");
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{t("mermas")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("mermasDesc")}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t("buscarPorProducto")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="relative">
          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="pl-10 w-full sm:w-48" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trash2 className="w-5 h-5 text-destructive" />
            <span className="text-sm text-muted-foreground">{t("totalMermas")}</span>
          </div>
          <span className="text-2xl font-bold text-destructive">{totalUnidades} {t("unidadesLabel")}</span>
        </div>
        <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-destructive" />
            <span className="text-sm text-muted-foreground">{lang === "en" ? "Total losses cost" : "Costo total de mermas"}</span>
          </div>
          <span className="text-2xl font-bold text-destructive">${totalCosto.toFixed(2)}</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Trash2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{t("noHayMermas")}</p>
          <p className="text-sm">{t("mermasHint")}</p>
        </div>
      ) : (
        <>
          {resumenProductos.length > 0 && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <p className="font-semibold text-sm">{lang === "en" ? "Summary by Product" : "Resumen por Producto"}</p>
              </div>
              <div className="divide-y divide-border">
                {resumenProductos.map((p) => (
                  <div key={p.name} className="flex items-center justify-between p-4">
                    <p className="font-medium text-sm">{p.name}</p>
                    <span className="font-bold text-destructive">{p.total} {t("unidadesLabel")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-6">
            {sortedDates.map((date) => {
              const dayItems = grouped[date];
              const dayUnits = dayItems.reduce((s, tr) => s + (tr.quantity || 0), 0);
              return (
                <div key={date} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted-foreground capitalize">{formatDate(date)}</h3>
                    <span className="text-sm font-bold text-destructive">{dayUnits} {t("unidadesLabel")}</span>
                  </div>
                  <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
                    {dayItems.map((tr) => (
                      <div key={tr.id} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
                        <div>
                          <p className="font-medium text-sm">{tr.product_name}</p>
                          {tr.notes && <p className="text-xs text-muted-foreground mt-0.5">{tr.notes}</p>}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t("costoUnitario")}: ${(tr.unit_cost || 0).toFixed(2)}
                          </p>
                        </div>
                        <span className="font-bold text-destructive">{tr.quantity} {t("unidadesLabel")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}