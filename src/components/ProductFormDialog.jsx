import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/lib/LanguageContext";

export default function ProductFormDialog({ open, onOpenChange, product, onSave }) {
  const { t, lang, categoryKeys, categoryLabels } = useLanguage();

  const [form, setForm] = useState({
    name: "", sku: "", category: "", stock: 0, min_stock: 5, price: 0, cost: 0, image_url: "",
  });

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || "",
        sku: product.sku || "",
        category: product.category || "",
        stock: product.stock || 0,
        min_stock: product.min_stock || 5,
        price: product.price || 0,
        cost: product.cost || 0,
        image_url: product.image_url || "",
      });
    } else {
      setForm({ name: "", sku: "", category: "", stock: 0, min_stock: 5, price: 0, cost: 0, image_url: "" });
    }
  }, [product, open]);

  const isValid = form.name && form.sku && form.category && form.price >= 0 && form.cost >= 0;

  const handleSave = () => {
    onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? t("editarProducto") : t("nuevoProducto")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t("nombre")}</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Coca Cola 600ml" />
          </div>
          <div className="space-y-2">
            <Label>{t("skuCodigo")}</Label>
            <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })} placeholder="COC-600" />
          </div>
          <div className="space-y-2">
            <Label>{t("categoria")}</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger>
                <SelectValue placeholder={t("seleccionar")}>
                  {form.category ? (categoryLabels[lang]?.[form.category] ?? form.category) : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categoryKeys.map((key) => (
                  <SelectItem key={key} value={key}>
                    {categoryLabels[lang]?.[key] ?? key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("precioVenta")}</Label>
              <Input type="number" value={form.price} onFocus={(e) => e.target.select()}
                onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                min={0} step={0.01} />
            </div>
            <div className="space-y-2">
              <Label>{t("precioCompra")}</Label>
              <Input type="number" value={form.cost} onFocus={(e) => e.target.select()}
                onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })}
                min={0} step={0.01} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("stockActual")}</Label>
              <Input type="number" value={form.stock}
                onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} min={0} />
            </div>
            <div className="space-y-2">
              <Label>{t("stockMinimo")}</Label>
              <Input type="number" value={form.min_stock}
                onChange={(e) => setForm({ ...form, min_stock: parseInt(e.target.value) || 0 })} min={0} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("urlImagen")}</Label>
            <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancelar")}</Button>
          <Button onClick={handleSave} disabled={!isValid}>{t("guardar")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
