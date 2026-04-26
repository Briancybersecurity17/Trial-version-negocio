import { fmtMoneda } from "@/utils/currency";
import { getLimits } from "@/lib/limits";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Search, Trash2, Calendar as CalendarIcon, DollarSign, Pencil, Check, X, ChevronDown } from "lucide-react";
import moment from "moment";
import "moment/locale/es";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";

export default function Mermas() {
  const { t, lang } = useLanguage();
  const { isAdmin } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editQty, setEditQty] = useState("");
  const [openDays, setOpenDays] = useState(new Set());

  const normalize = (s) => s
    .trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .replace(/(\d+)/g, (m) => String(parseInt(m, 10)));

  const loadTransactions = async () => {
    setLoading(true);
    const all = await base44.entities.InventoryTransaction.list("-transaction_date", getLimits().heavy);
    setTransactions(all);
    setLoading(false);
  };

  useEffect(() => { loadTransactions(); }, []);

  const mermas = transactions.filter(
    (tr) => tr.type === "salida" && tr.reason === "Merma/Desperdicio"
  );

  const filtered = mermas.filter((tr) => {
    const matchSearch = !search || normalize(tr.product_name || "").includes(normalize(search));
    const matchDate = !dateFilter || tr.transaction_date === dateFilter;
    return matchSearch && matchDate;
  });

  const totalUnidades = filtered.reduce((s, tr) => s + (tr.quantity || 0), 0);
  const totalCosto = filtered.reduce((s, tr) => s + ((tr.unit_cost || 0) * (tr.quantity || 0)), 0);

  const grouped = {};
  filtered.forEach((tr) => {
    const date = tr.transaction_date || "__nodate__";
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(tr);
  });
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  useEffect(() => {
    if (sortedDates.length > 0 && openDays.size === 0) {
      setOpenDays(new Set([sortedDates[0]]));
    }
  }, [sortedDates.length]);

  const toggleDay = (date) => {
    setOpenDays((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const formatDate = (date) => {
    if (date === "__nodate__") return lang === "en" ? "No date" : "Sin fecha";
    const d = new Date(date + "T00:00:00");
    if (lang === "en") {
      return d.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    } else {
      const weekday = d.toLocaleDateString("es-AR", { weekday: "long" });
      const day = d.getDate();
      const month = d.toLocaleDateString("es-AR", { month: "long" });
      const year = d.getFullYear();
      return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${day} de ${month.charAt(0).toUpperCase() + month.slice(1)} de ${year}`;
    }
  };

  const startEdit = (tr) => {
    setEditingId(tr.id);
    setEditQty(String(tr.quantity || ""));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditQty("");
  };

  const restoreStock = async (tr, qty) => {
    if (qty <= 0) return;
    const products = await base44.entities.Product.filter({ id: tr.product_id });
    if (products.length > 0) {
      const prod = products[0];
      await base44.entities.Product.update(prod.id, { stock: Math.max(0, (prod.stock || 0) + qty) });
    }
  };

  const confirmEdit = async (tr) => {
    const newQty = parseInt(editQty);
    if (isNaN(newQty) || newQty < 0) {
      toast.error(lang === "en" ? "Invalid quantity" : "Cantidad invalida");
      return;
    }
    const diff = (tr.quantity || 0) - newQty;
    await base44.entities.InventoryTransaction.update(tr.id, {
      quantity: newQty,
      stock_after: (tr.stock_before || 0) - newQty,
    });
    await restoreStock(tr, diff);
    toast.success(lang === "en" ? "Waste updated" : "Merma corregida");
    cancelEdit();
    loadTransactions();
  };

  const handleDelete = async (tr) => {
    await restoreStock(tr, tr.quantity || 0);
    await base44.entities.InventoryTransaction.delete(tr.id);
    toast.success(lang === "en" ? "Waste record deleted" : "Merma eliminada");
    loadTransactions();
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
        <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-4 flex items-center justify-between" style={{ boxShadow: "0 4px 24px rgba(239,68,68,0.15)" }}>
          <div className="flex items-center gap-3">
            <Trash2 className="w-5 h-5 text-destructive" />
            <span className="text-sm text-muted-foreground">{t("totalMermas")}</span>
          </div>
          <span className="text-2xl font-bold text-destructive">{totalUnidades} {t("unidadesLabel")}</span>
        </div>
        <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-4 flex items-center justify-between" style={{ boxShadow: "0 4px 24px rgba(239,68,68,0.15)" }}>
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-destructive" />
            <span className="text-sm text-muted-foreground">{lang === "en" ? "Total losses cost" : "Costo total de mermas"}</span>
          </div>
          <span className="text-2xl font-bold text-destructive">{fmtMoneda(totalCosto)}</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Trash2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{t("noHayMermas")}</p>
          <p className="text-sm">{t("mermasHint")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedDates.map((date) => {
            const dayItems = grouped[date];
            const dayUnits = dayItems.reduce((s, tr) => s + (tr.quantity || 0), 0);
            const dayCosto = dayItems.reduce((s, tr) => s + ((tr.unit_cost || 0) * (tr.quantity || 0)), 0);
            const isOpen = openDays.has(date);
            return (
              <Collapsible key={date} open={isOpen} onOpenChange={() => toggleDay(date)}>
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-card hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-2">
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                      <h3 className="text-sm font-semibold text-muted-foreground capitalize">{formatDate(date)}</h3>
                      <span className="text-xs text-muted-foreground/60">({dayItems.length})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{fmtMoneda(dayCosto)}</span>
                      <span className="text-sm font-bold text-destructive">{dayUnits} {t("unidadesLabel")}</span>
                    </div>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="mt-1 rounded-2xl border border-border bg-card overflow-hidden">
                    <div className="overflow-y-auto max-h-72 divide-y divide-border">
                      {dayItems.map((tr) => {
                        const isEditing = editingId === tr.id;
                        const previewQty = parseInt(editQty) || 0;
                        const previewCosto = previewQty * (tr.unit_cost || 0);
                        return (
                          <div key={tr.id} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{tr.product_name}</p>
                              {tr.notes && <p className="text-xs text-muted-foreground mt-0.5">{tr.notes}</p>}
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {t("costoUnitario")}: {fmtMoneda(tr.unit_cost || 0)}
                              </p>
                              {isEditing && (
                                <div className="flex items-center gap-2 mt-2">
                                  <Input
                                    type="number"
                                    value={editQty}
                                    onChange={(e) => setEditQty(e.target.value)}
                                    onFocus={(e) => e.target.select()}
                                    className="h-7 w-24 text-xs"
                                    min={0}
                                    autoFocus
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    {t("unidadesLabel")} = {fmtMoneda(previewCosto)}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                              {isEditing ? (
                                <>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:text-green-700" onClick={() => confirmEdit(tr)}>
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={cancelEdit}>
                                    <X className="w-4 h-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <span className="font-bold text-destructive mr-1">{tr.quantity} {t("unidadesLabel")}</span>
                                  {isAdmin && (
                                    <>
                                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => startEdit(tr)}>
                                        <Pencil className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(tr)}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
