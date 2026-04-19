import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/lib/LanguageContext";
import { toImgSrc } from "@/utils/localImage";
import { FolderOpen, ImageOff, X } from "lucide-react";

export default function ProductFormDialog({ open, onOpenChange, product, onSave }) {
  const { t, lang, categoryKeys, categoryLabels } = useLanguage();

  const [form, setForm] = useState({
    name: "", sku: "", category: "", stock: 0, min_stock: 5, price: 0, cost: 0, image_url: "",
  });
  const [imgError, setImgError] = useState(false);

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
    setImgError(false);
  }, [product, open]);

  // Reset error cuando cambia la URL
  useEffect(() => { setImgError(false); }, [form.image_url]);

  const isValid = form.name && form.sku && form.category && form.price >= 0 && form.cost >= 0;

  const handleSave = () => {
    onSave(form);
    onOpenChange(false);
  };

  /** Abre el selector de archivos nativo de Electron (si está disponible) */
  const handleBrowse = async () => {
    if (typeof window !== "undefined" && window.electronFiles?.openImage) {
      const filePath = await window.electronFiles.openImage();
      if (filePath) {
        setForm({ ...form, image_url: filePath });
      }
    }
  };

  const isElectron = typeof window !== "undefined" && !!window.electronFiles;
  const previewSrc = toImgSrc(form.image_url);

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
            {!product && (
              <div className="space-y-2">
                <Label>{t("stockActual")}</Label>
                <Input type="number" value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} min={0} />
              </div>
            )}
            <div className="space-y-2">
              <Label>{t("stockMinimo")}</Label>
              <Input type="number" value={form.min_stock}
                onChange={(e) => setForm({ ...form, min_stock: parseInt(e.target.value) || 0 })} min={0} />
            </div>
          </div>

          {/* ── Imagen ─────────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label>{t("urlImagen")}</Label>

            {/* Input + botón buscar */}
            <div className="flex gap-2">
              <Input
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder={isElectron ? "Ruta de archivo o URL…" : "https://…"}
                className="flex-1 text-sm"
              />
              {form.image_url && (
                <Button type="button" size="icon" variant="ghost"
                  className="h-10 w-10 flex-shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => setForm({ ...form, image_url: "" })}>
                  <X className="w-4 h-4" />
                </Button>
              )}
              {/* Botón "Buscar" solo en Electron */}
              {isElectron && (
                <Button type="button" size="icon" variant="outline"
                  className="h-10 w-10 flex-shrink-0"
                  title="Seleccionar imagen del disco"
                  onClick={handleBrowse}>
                  <FolderOpen className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Preview de la imagen */}
            {previewSrc && (
              <div className="mt-2 rounded-xl overflow-hidden border border-border bg-muted/30 flex items-center justify-center" style={{ height: 120 }}>
                {imgError ? (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <ImageOff className="w-7 h-7 opacity-40" />
                    <span className="text-xs">No se pudo cargar la imagen</span>
                  </div>
                ) : (
                  <img
                    src={previewSrc}
                    alt="preview"
                    className="max-h-full max-w-full object-contain"
                    onError={() => setImgError(true)}
                  />
                )}
              </div>
            )}

            {/* Hint solo en Electron */}
            {isElectron && (
              <p className="text-xs text-muted-foreground">
                Podés escribir la ruta directamente o usar <FolderOpen className="inline w-3 h-3 mx-0.5" /> para explorar.
              </p>
            )}
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
