import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PackagePlus, PackageMinus } from "lucide-react";
import { useLanguage, REASONS_ENTRADA_KEYS, REASONS_SALIDA_KEYS } from "@/lib/LanguageContext";

export default function InventoryDialog({ open, onOpenChange, product, onConfirm }) {
  const { t, tReason } = useLanguage();

  const [type, setType] = useState("entrada");
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (product) setUnitCost(product.cost || 0);
  }, [product]);

  if (!product) return null;

  const reasonKeys = type === "entrada" ? REASONS_ENTRADA_KEYS : REASONS_SALIDA_KEYS;
  const newStock = type === "entrada" ? product.stock + quantity : product.stock - quantity;
  const totalCost = type === "entrada" ? quantity * unitCost : 0;

  const handleConfirm = () => {
    const costToUse = type === "salida" ? (product.cost || 0) : unitCost;
    const finalTotalCost = quantity * costToUse;
    onConfirm({
      product, type, quantity, reason, notes,
      stockBefore: product.stock, stockAfter: newStock,
      unitCost, totalCost: finalTotalCost
    });
    setType("entrada");
    setQuantity(1);
    setUnitCost(product?.cost || 0);
    setReason("");
    setNotes("");
    onOpenChange(false);
  };

  const isValid = reason && quantity >= 1 && (type === "entrada" || quantity <= product.stock);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Fix #3: max-h + overflow-y-auto para que los botones siempre sean visibles */}
      <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)] max-h-[90dvh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {type === "entrada"
              ? <PackagePlus className="w-5 h-5 text-success" />
              : <PackageMinus className="w-5 h-5 text-destructive" />}
            {t("movimientoInventario")}
          </DialogTitle>
        </DialogHeader>

        {/* Área scrolleable */}
        <div className="flex-1 overflow-y-auto px-5 space-y-4 py-2">
          <div className="p-3 rounded-xl bg-muted/50 border border-border">
            <p className="font-semibold">{product.name}</p>
            <p className="text-sm text-muted-foreground">{t("stockActualLabel")}: {product.stock} {t("unidades")}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant={type === "entrada" ? "default" : "outline"} onClick={() => { setType("entrada"); setReason(""); }} className="h-11">
              <PackagePlus className="w-4 h-4 mr-2" />{t("entrada")}
            </Button>
            <Button variant={type === "salida" ? "default" : "outline"} onClick={() => { setType("salida"); setReason(""); }} className="h-11">
              <PackageMinus className="w-4 h-4 mr-2" />{t("salida")}
            </Button>
          </div>

          <div className="space-y-2">
            <Label>{t("cantidad")}</Label>
            <Input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              min={1} max={type === "salida" ? product.stock : undefined} />
          </div>

          <div className="space-y-2">
            <Label>{t("razon")}</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder={t("seleccionarRazon")}>{reason ? tReason(reason) : undefined}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {reasonKeys.map((key) => (<SelectItem key={key} value={key}>{tReason(key)}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          {type === "entrada" && (
            <div className="space-y-2">
              <Label>{t("costoUnitario")}</Label>
              <Input type="number" value={unitCost} onFocus={(e) => e.target.select()}
                onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)} min={0} step={0.01} />
            </div>
          )}

          <div className="space-y-2">
            <Label>{t("notasOpcional")}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("notasPlaceholder")} maxLength={200} rows={2} />
          </div>

          <div className={`p-3 rounded-xl border ${type === "entrada" ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"}`}>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t("nuevoStock")}</span>
              <span className={`text-xl font-bold ${type === "entrada" ? "text-success" : "text-destructive"}`}>
                {newStock} {t("unidades")}
              </span>
            </div>
            {type === "entrada" && unitCost > 0 && (
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-success/20">
                <span className="text-sm text-muted-foreground">{t("costoTotal")}</span>
                <span className="text-lg font-bold text-warning">${totalCost.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer siempre visible */}
        <DialogFooter className="px-5 py-4 border-t border-border flex-shrink-0 gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>{t("cancelar")}</Button>
          <Button className="flex-1" onClick={handleConfirm} disabled={!isValid}>{t("confirmar")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
