import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Search, Receipt, Calendar as CalendarIcon } from "lucide-react";
import moment from "moment";
import { useLanguage } from "@/lib/LanguageContext";

export default function Sales() {
  const { t, lang } = useLanguage();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await base44.entities.CashSale.list("-created_date", 500);
      setSales(data);
      setLoading(false);
    };
    load();
  }, []);
  // Filtro por búsqueda y fecha, y solo ventas reales (no devoluciones)
  const normalize = (s) => s
    .trim()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .replace(/(\d+)/g, (m) => String(parseInt(m, 10)));

  const filtered = sales.filter((s) => {
    const matchSearch = normalize(s.product_name).includes(normalize(search));
    const matchDate = !dateFilter || s.sale_date === dateFilter;
    // Solo ventas reales, no devoluciones
    const isVentaReal = !s.notes?.toLowerCase().includes("devolución") &&
      !s.notes?.toLowerCase().includes("return");
    return matchSearch && matchDate && isVentaReal;
  });

  const totalFiltered = filtered.reduce((sum, s) => sum + (s.total || 0), 0);

  const grouped = {};
  filtered.forEach((sale) => {
    const date = sale.sale_date || (lang === "en" ? "No date" : "Sin fecha");
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(sale);
  });
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const formatDate = (date) => {
    if (date === "Sin fecha" || date === "No date") return lang === "en" ? "No date" : "Sin fecha";
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
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{t("historialVentas")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{sales.length} {t("ventasRegistradas")}</p>
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

      <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{t("totalFiltrado")}</span>
        <span className="text-2xl font-bold text-primary">${totalFiltered.toFixed(2)}</span>
      </div>

      {sortedDates.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{t("noHayVentas")}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => {
            const dateSales = grouped[date];
            const dateTotal = dateSales.reduce((s, v) => s + (v.total || 0), 0);
            return (
              <div key={date} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground capitalize">{formatDate(date)}</h3>
                  <span className="text-sm font-bold">${dateTotal.toFixed(2)}</span>
                </div>
                <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-card/95 overflow-hidden divide-y divide-border">
                  {dateSales.map((sale) => (
                    <div key={sale.id} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
                      <div>
                        <p className="font-medium text-sm">{sale.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {sale.quantity} × ${sale.unit_price.toFixed(2)}
                          {sale.notes && ` · ${sale.notes}`}
                        </p>
                      </div>
                      <span className="font-bold">${sale.total.toFixed(2)}</span>
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