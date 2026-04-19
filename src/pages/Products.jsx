import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Plus, Pencil, Trash2, Package } from "lucide-react";
import StockBadge from "../components/StockBadge";
import ProductFormDialog from "../components/ProductFormDialog";
import InventoryDialog from "../components/InventoryDialog";
import moment from "moment";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";

export default function Products() {
  const { t, lang, tCat, categoryKeys, categoryLabels } = useLanguage();
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [formOpen, setFormOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [invProduct, setInvProduct] = useState(null);
  const [deleteProduct, setDeleteProduct] = useState(null);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const prods = await base44.entities.Product.list("-updated_date", 500);
      setProducts(prods);
    } catch (e) {
      toast.error(lang === "en" ? "Error loading products" : "Error al cargar los productos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProducts(); }, []);

  const handleSave = async (form) => {
    const normalize = (s) => s
      .trim()
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "") // elimina todo lo que no sea letra o número
      .replace(/\s+/g, " ") // reemplaza múltiples espacios por uno solo
      .replace(/(\d+)/g, (m) => String(parseInt(m, 10))) // la idea es normalizar numeros
      .trim();

    const otherProducts = products.filter(p => editProduct ? p.id !== editProduct.id : true);

    // Validación en memoria
    const dupName = otherProducts.find(p => normalize(p.name) === normalize(form.name));
    const dupSku  = otherProducts.find(p => normalize(p.sku) === normalize(form.sku));

    if (dupName) {
      toast.error(lang === "en"
        ? `Product name "${form.name}" already exists`
        : `Ya existe un producto llamado "${form.name}"`);
      return;
    }
    if (dupSku) {
      toast.error(lang === "en"
        ? `SKU "${form.sku}" already in use`
        : `El SKU "${form.sku}" ya está en uso`);
      return;
    }

    // Validación extra contra la API (por si hay duplicados en DB)
    const normalizedName = normalize(form.name);
    const existing = await base44.entities.Product.filter({ name_normalized: normalizedName });
    if (existing.length > 0) {
      toast.error(lang === "en"
        ? `Product name "${form.name}" already exists in database`
        : `Ya existe un producto llamado "${form.name}" en la base de datos`);
      return;
    }

    if (editProduct) {
      await base44.entities.Product.update(editProduct.id, form);
      toast.success(t("productoActualizado"));
    } else {
      const newProduct = await base44.entities.Product.create(form);
      toast.success(t("productoCreado"));
      const stockInicial = Number(form.stock) || 0;
      const costoUnitario = Number(form.cost) || 0;
      if (stockInicial > 0 && costoUnitario > 0) {
        await base44.entities.InventoryTransaction.create({
          product_id: newProduct.id,
          product_name: form.name,
          type: "entrada",
          quantity: stockInicial,
          reason: "Compra/Reabastecimiento",
          notes: lang === "en" ? "Initial stock when creating product" : "Stock inicial al crear el producto",
          stock_before: 0,
          stock_after: stockInicial,
          transaction_date: moment().format("YYYY-MM-DD"),
          unit_cost: costoUnitario,
          total_cost: costoUnitario * stockInicial,
        });
      }
    }
    setEditProduct(null);
    loadProducts();
  };


  // Fix #5: al eliminar producto también eliminar sus transacciones de inventario
  const handleDelete = async () => {
    if (!deleteProduct) return;
    try {
      // Buscar y eliminar todas las transacciones de inventario del producto
      const transactions = await base44.entities.InventoryTransaction.filter({ product_id: deleteProduct.id });
      await Promise.all(transactions.map(tr => base44.entities.InventoryTransaction.delete(tr.id)));

      await base44.entities.Product.delete(deleteProduct.id);
      toast.success(t("productoEliminado"));
      loadProducts();
    } catch (e) {
      toast.error(lang === "en" ? "Error deleting product" : "Error al eliminar el producto");
    } finally {
      setDeleteProduct(null);
    }
  };

  const handleInventory = async ({ product, type, quantity, reason, notes, stockBefore, stockAfter, unitCost, totalCost }) => {
    await base44.entities.Product.update(product.id, { stock: stockAfter });
    await base44.entities.InventoryTransaction.create({
      product_id: product.id,
      product_name: product.name,
      type, quantity, reason,
      notes: notes || "",
      stock_before: stockBefore,
      stock_after: stockAfter,
      transaction_date: moment().format("YYYY-MM-DD"),
      unit_cost: unitCost,
      total_cost: totalCost,
    });
    toast.success(t("inventarioActualizado"));
    loadProducts();
  };


  const normalize = (s) => s
    .trim()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "") // elimina todo lo que no sea letra o número
    .replace(/(\d+)/g, (m) => String(parseInt(m, 10))) // la idea es normalizar numeros
    .trim();
    
  const filtered = products.filter((p) => {
    const matchSearch = 
      normalize(p.name).includes(normalize(search)) ||
      normalize(p.sku).includes(normalize(search));
    const matchCategory = category === "ALL" || p.category === category;
    return matchSearch && matchCategory;
  });

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{t("productos")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{products.length} {t("productosRegistrados")}</p>
        </div>
        {/* Fix #1: "Nuevo Producto" disponible para todos, pero solo admin puede editar/eliminar */}
        <Button onClick={() => { setEditProduct(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          {t("nuevaProducto")}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t("buscarPorNombreOSku")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("todos")}</SelectItem>
            {categoryKeys.map((key) => (
              <SelectItem key={key} value={key}>{categoryLabels[lang]?.[key] ?? key}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{t("noHayProductosFiltro")}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 font-medium text-muted-foreground">{t("producto")}</th>
                  <th className="text-left p-4 font-medium text-muted-foreground hidden md:table-cell">{t("categoria")}</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">{t("stock")}</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">{t("precio")}</th>
                  <th className="text-right p-4 font-medium text-muted-foreground hidden sm:table-cell">{t("costo")}</th>
                  {/* Fix #1: columna acciones solo si hay algo que mostrar */}
                  {isAdmin && <th className="text-right p-4 font-medium text-muted-foreground">{t("acciones")}</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {product.image_url ? (
                            <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-4 h-4 text-muted-foreground/40" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <span className="px-2 py-1 rounded-md bg-muted text-xs font-medium">{tCat(product.category)}</span>
                    </td>
                    <td className="p-4"><StockBadge stock={product.stock} minStock={product.min_stock} /></td>
                    <td className="p-4 text-right font-semibold">${product.price.toFixed(2)}</td>
                    <td className="p-4 text-right text-muted-foreground hidden sm:table-cell">${product.cost.toFixed(2)}</td>
                    {/* Fix #1: acciones solo para admin */}
                    {isAdmin && (
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setInvProduct(product)}>
                            <Package className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditProduct(product); setFormOpen(true); }}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteProduct(product)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} product={editProduct} onSave={handleSave} />
      {isAdmin && <InventoryDialog open={!!invProduct} onOpenChange={(v) => !v && setInvProduct(null)} product={invProduct} onConfirm={handleInventory} />}

      {isAdmin && (
        <AlertDialog open={!!deleteProduct} onOpenChange={(v) => !v && setDeleteProduct(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("eliminarConfirm")} {deleteProduct?.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                {lang === "en"
                  ? "This will also delete all inventory transactions for this product. This action cannot be undone."
                  : "También se eliminarán todos los movimientos de inventario de este producto. Esta acción no se puede deshacer."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancelar")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                <Trash2 className="w-4 h-4 mr-2" />
                {lang === "en" ? "Delete" : "Eliminar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
