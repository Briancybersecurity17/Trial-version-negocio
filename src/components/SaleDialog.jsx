import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

export default function SaleDialog({ open, onOpenChange, product, onConfirm }) {
  const { t } = useLanguage();
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  if (!product) return null;

  const total = quantity * product.price;
  const maxQty = product.stock;

  const handleConfirm = () => {
    onConfirm({ product, quantity, total, notes });
    setQuantity(1);
    setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            {t("registrarVenta")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="p-4 rounded-xl bg-muted/50 border border-border">
            <p className="font-semibold text-lg">{product.name}</p>
            <p className="text-sm text-muted-foreground">SKU: {product.sku} · ${product.price.toFixed(2)} {t("cadaUno")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("stockDisponible")}: {product.stock}</p>
          </div>

          <div className="space-y-2">
            <Label>{t("cantidad")}</Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline" size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => {
                  const v = parseInt(e.target.value) || 1;
                  setQuantity(Math.min(Math.max(1, v), maxQty));
                }}
                className="w-20 text-center text-lg font-semibold"
                min={1} max={maxQty}
              />
              <Button
                variant="outline" size="icon"
                onClick={() => setQuantity(Math.min(maxQty, quantity + 1))}
                disabled={quantity >= maxQty}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("notasOpcional")}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("notasVenta")} maxLength={200} />
          </div>

          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t("total")}</span>
              <span className="text-2xl font-bold text-primary">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancelar")}</Button>
          <Button onClick={handleConfirm}>{t("confirmarVenta")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}