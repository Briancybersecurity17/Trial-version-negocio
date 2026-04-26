import { fmtMoneda } from "@/utils/currency";
import { getLimits } from "@/lib/limits";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Search, ShoppingBag, Calendar as CalendarIcon, Pencil, Check, X, Trash2, AlertTriangle, MessageSquare, ChevronDown } from "lucide-react";
import moment from "moment";
import "moment/locale/es";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";

export default function Gastos() {
  const { t, lang, tReason } = useLanguage();
  const { isAdmin } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editQty, setEditQty] = useState("");
  const [editCost, setEditCost] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [openDays, setOpenDays] = useState(new Set());

  useEffect(() => {}, [lang]);

  const loadTransactions = async () => {
    setLoading(true);
    const all = await base44.entities.InventoryTransaction.list("-transaction_date", getLimits().heavy);
    setTransactions(all);
    setLoading(false);
  };

  useEffect(() => { loadTransactions(); }, []);

  const entradas = transactions.filter(
    (tr) => tr.type === "entrada" && tr.reason === "Compra/Reabastecimiento"
  );

  const normalize = (s) => s
    .trim()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .replace(/(\d+)/g, (m) => String(parseInt(m, 10)));

  const filtered = entradas.filter((tr) => {
    const matchSearch = !search || normalize(tr.product_name || "").includes(normalize(search));
    const matchDate = !dateFilter || tr.transaction_date === dateFilter;
    return matchSearch && matchDate;
  });

  const getTotal = (tr) => {
    if (tr.total_cost && tr.total_cost > 0) return tr.total_cost;
    return (tr.quantity || 0) * (tr.unit_cost || 0);
  };

  const totalFiltered = filtered.reduce((sum, tr) => sum + getTotal(tr), 0);

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
    setEditCost(String(tr.unit_cost || ""));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditQty("");
    setEditCost("");
  };

  const confirmEdit = async (tr) => {
    const newQty  = parseInt(editQty);
    const newCost = parseFloat(editCost);

    if (isNaN(newQty) || newQty <= 0) {
      toast.error(lang === "en" ? "Invalid quantity" : "Cantidad invalida");
      return;
    }
    if (isNaN(newCost) || newCost < 0) {
      toast.error(lang === "en" ? "Invalid cost" : "Costo invalido");
      return;
    }

    const newTotal = newQty * newCost;

    await base44.entities.InventoryTransaction.update(tr.id, {
      quantity:   newQty,
      unit_cost:  newCost,
      total_cost: newTotal,
      stock_after: (tr.stock_before || 0) + newQty,
    });

    const products = await base44.entities.Product.filter({ id: tr.product_id });
    if (products.length > 0) {
      const prod = products[0];
      const diffQty = newQty - (tr.quantity || 0);
      const newStock = Math.max(0, (prod.stock || 0) + diffQty);
      await base44.entities.Product.update(prod.id, { stock: newStock });
    }

    toast.success(lang === "en" ? "Purchase updated" : "Compra corregida");
    cancelEdit();
    loadTransactions();
  };

  const handleDelete = async (tr) => {
    const products = await base44.entities.Product.filter({ id: tr.product_id });
    if (products.length > 0) {
      const prod = products[0];
      const newStock = Math.max(0, (prod.stock || 0) - (tr.quantity || 0));
      await base44.entities.Product.update(prod.id, { stock: newStock });
    }
    await base44.entities.InventoryTransaction.delete(tr.id);
    toast.success(lang === "en" ? "Purchase record deleted" : "Compra eliminada");
    setDeleteTarget(null);
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
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{t("gastos")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{entradas.length} {t("entradasRegistradas")}</p>
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

      <div className="rounded-xl bg-gradient-to-r from-warning/10 to-warning/5 border border-warning/30 p-4 flex items-center justify-between" style={{ boxShadow: "0 4px 24px rgba(245,158,11,0.15)" }}>
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-5 h-5 text-warning" />
          <span className="text-sm text-muted-foreground">{t("totalGastado")}</span>
        </div>
        <span className="text-2xl font-bold text-warning">{fmtMoneda(totalFiltered)}</span>
      </div>

      {sortedDates.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{t("noHayGastos")}</p>
          <p className="text-sm">{t("ingresarStockParaVer")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedDates.map((date) => {
            const dayItems = grouped[date];
            const dayTotal = dayItems.reduce((s, tr) => s + getTotal(tr), 0);
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
                    <span className="text-sm font-bold">{fmtMoneda(dayTotal)}</span>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="mt-1 rounded-2xl border border-border bg-gradient-to-br from-card to-card/95 overflow-hidden">
                    <div className="overflow-y-auto max-h-72 divide-y divide-border">
                      {dayItems.map((tr) => {
                        const isEditing = editingId === tr.id;
                        const previewTotal = (parseFloat(editCost) || 0) * (parseInt(editQty) || 0);
                        return (
                          <div key={tr.id} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{tr.product_name}</p>
                              {isEditing ? (
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <Input
                                    type="number"
                                    value={editQty}
                                    onChange={(e) => setEditQty(e.target.value)}
                                    onFocus={(e) => e.target.select()}
                                    className="h-7 w-20 text-xs"
                                    min={1}
                                    placeholder={t("unidades")}
                                    autoFocus
                                  />
                                  <span className="text-xs text-muted-foreground">x</span>
                                  <Input
                                    type="number"
                                    value={editCost}
                                    onChange={(e) => setEditCost(e.target.value)}
                                    onFocus={(e) => e.target.select()}
                                    className="h-7 w-32 text-xs"
                                    min={0}
                                    placeholder={lang === "en" ? "Unit cost" : "Costo unit."}
                                  />
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <p className="text-xs text-muted-foreground">
                                    {tr.quantity} {t("unidades")} x {fmtMoneda(tr.unit_cost || 0)}
                                    {tr.reason && ` · ${tReason(tr.reason)}`}
                                  </p>
                                  {tr.notes && (
                                    <p className="text-xs text-muted-foreground/70 flex items-center gap-1">
                                      <MessageSquare className="w-3 h-3 flex-shrink-0" />
                                      <span className="italic">{tr.notes}</span>
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              {isEditing ? (
                                <>
                                  <span className="text-xs text-muted-foreground">= {fmtMoneda(previewTotal)}</span>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:text-green-700" onClick={() => confirmEdit(tr)}>
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={cancelEdit}>
                                    <X className="w-4 h-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <span className="font-bold">{fmtMoneda(getTotal(tr))}</span>
                                  {isAdmin && (
                                    <>
                                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => startEdit(tr)}>
                                        <Pencil className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(tr)}>
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <AlertDialogTitle className="text-base">
                {lang === "en" ? "Delete purchase?" : "¿Eliminar compra?"}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm">
              {lang === "en"
                ? <>You are about to permanently delete the purchase of <strong className="text-foreground">{deleteTarget?.product_name}</strong> ({deleteTarget?.quantity} {lang === "en" ? "units" : "unidades"} × {fmtMoneda(deleteTarget?.unit_cost || 0)}). Stock will be adjusted automatically. This action cannot be undone.</>
                : <>Estás por eliminar permanentemente la compra de <strong className="text-foreground">{deleteTarget?.product_name}</strong> ({deleteTarget?.quantity} unidades × {fmtMoneda(deleteTarget?.unit_cost || 0)}). El stock se ajustará automáticamente. Esta acción no se puede deshacer.</>
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>
              {lang === "en" ? "Cancel" : "Cancelar"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(deleteTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <Trash2 className="w-4 h-4 mr-1.5" />
              {lang === "en" ? "Yes, delete" : "Sí, eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
