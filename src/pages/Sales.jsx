import { fmtMoneda } from "@/utils/currency";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Receipt, Calendar as CalendarIcon, Pencil, Check, X, Trash2, AlertTriangle, MessageSquare } from "lucide-react";
import moment from "moment";
import "moment/locale/es";
import { useLanguage } from "@/lib/LanguageContext";
import { useTheme } from "@/lib/ThemeContext";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";

export default function Sales() {
  const { t, lang } = useLanguage();
  const { currentTheme } = useTheme();
  const { isAdmin } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editPrice, setEditPrice] = useState("");
  const [editQty, setEditQty] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadSales = async () => {
    setLoading(true);
    const data = await base44.entities.CashSale.list("-created_date", 500);
    setSales(data);
    setLoading(false);
  };

  useEffect(() => { loadSales(); }, []);

  const normalize = (s) => s
    .trim()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .replace(/(\d+)/g, (m) => String(parseInt(m, 10)));

  const filtered = sales.filter((s) => {
    const matchSearch = normalize(s.product_name || "").includes(normalize(search));
    const matchDate = !dateFilter || s.sale_date === dateFilter;
    const isVentaReal = !s.notes?.toLowerCase().includes("devolucion") &&
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

  const startEdit = (sale) => {
    setEditingId(sale.id);
    setEditPrice(String(sale.unit_price || ""));
    setEditQty(String(sale.quantity || ""));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditPrice("");
    setEditQty("");
  };

  const confirmEdit = async (sale) => {
    const newPrice = parseFloat(editPrice);
    const newQty   = parseInt(editQty, 10);
    if (isNaN(newPrice) || newPrice < 0) {
      toast.error(lang === "en" ? "Invalid price" : "Precio invalido");
      return;
    }
    if (isNaN(newQty) || newQty < 1) {
      toast.error(lang === "en" ? "Invalid quantity" : "Cantidad invalida");
      return;
    }
    const newTotal = newPrice * newQty;
    await base44.entities.CashSale.update(sale.id, {
      unit_price: newPrice,
      quantity:   newQty,
      total:      newTotal,
    });
    toast.success(lang === "en" ? "Sale updated" : "Venta corregida");
    setEditingId(null);
    setEditPrice("");
    setEditQty("");
    loadSales();
  };

  const handleDelete = async (sale) => {
    await base44.entities.CashSale.delete(sale.id);
    toast.success(lang === "en" ? "Sale record deleted" : "Venta eliminada");
    setDeleteTarget(null);
    loadSales();
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

      <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 flex items-center justify-between" style={{ boxShadow: `0 4px 24px ${currentTheme?.glowColor || "rgba(0,0,0,0.1)"}` }}>
        <span className="text-sm text-muted-foreground">{t("totalFiltrado")}</span>
        <span className="text-2xl font-bold text-primary">{fmtMoneda(totalFiltered)}</span>
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
                  <span className="text-sm font-bold">{fmtMoneda(dateTotal)}</span>
                </div>
                <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-card/95 overflow-hidden divide-y divide-border">
                  {dateSales.map((sale) => {
                    const isEditing = editingId === sale.id;
                    return (
                      <div key={sale.id} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{sale.product_name}</p>
                          {isEditing ? (
                            <div className="flex items-center gap-2 mt-1">
                              <Input
                                type="number"
                                value={editQty}
                                onChange={(e) => setEditQty(e.target.value)}
                                onFocus={(e) => e.target.select()}
                                className="h-7 w-20 text-xs"
                                min={1}
                                autoFocus
                                placeholder={lang === "en" ? "Qty" : "Cant."}
                              />
                              <span className="text-xs text-muted-foreground">x</span>
                              <Input
                                type="number"
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value)}
                                onFocus={(e) => e.target.select()}
                                className="h-7 w-32 text-xs"
                                min={0}
                                placeholder={lang === "en" ? "Price" : "Precio"}
                              />
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <p className="text-xs text-muted-foreground">
                                {sale.quantity} x {fmtMoneda(sale.unit_price)}
                              </p>
                              {sale.notes && (
                                <p className="text-xs text-muted-foreground/70 flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3 flex-shrink-0" />
                                  <span className="italic">{sale.notes}</span>
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isEditing ? (
                            <>
                              <span className="text-xs text-muted-foreground">
                                = {fmtMoneda((parseFloat(editPrice) || 0) * (parseInt(editQty, 10) || 1))}
                              </span>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:text-green-700" onClick={() => confirmEdit(sale)}>
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={cancelEdit}>
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <span className="font-bold">{fmtMoneda(sale.total)}</span>
                              {isAdmin && (
                                <>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => startEdit(sale)}>
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(sale)}>
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
            );
          })}
        </div>
      )}

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <AlertDialogTitle className="text-base">
                {lang === "en" ? "Delete sale?" : "¿Eliminar venta?"}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm">
              {lang === "en"
                ? <>You are about to permanently delete the sale of <strong className="text-foreground">{deleteTarget?.product_name}</strong> ({deleteTarget?.quantity} x {fmtMoneda(deleteTarget?.unit_price)}). This action cannot be undone.</>
                : <>Estás por eliminar permanentemente la venta de <strong className="text-foreground">{deleteTarget?.product_name}</strong> ({deleteTarget?.quantity} x {fmtMoneda(deleteTarget?.unit_price)}). Esta acción no se puede deshacer.</>
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