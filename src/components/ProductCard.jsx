import StockBadge from "./StockBadge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Package } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";

export default function ProductCard({ product, onSell, onInventory }) {
  const { t, tCat } = useLanguage();
  const { isAdmin } = useAuth();
  const isOutOfStock = product.stock === 0;

  return (
    <div className={`rounded-2xl bg-card border border-border overflow-hidden flex flex-col transition-all hover:shadow-md ${isOutOfStock ? "opacity-60" : ""}`}>
      <div className="aspect-square bg-muted/30 flex items-center justify-center overflow-hidden">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <Package className="w-12 h-12 text-muted-foreground/30" />
        )}
      </div>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            {tCat(product.category)}
          </span>
        </div>
        <div>
          <h3 className="font-semibold text-sm leading-tight">{product.name}</h3>
          <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold">${product.price.toFixed(2)}</span>
          <span className="text-xs text-muted-foreground">{t("costoLabel")}: ${product.cost.toFixed(2)}</span>
        </div>
        <StockBadge stock={product.stock} minStock={product.min_stock} />
        <div className="flex gap-2 mt-auto pt-1">
          <Button onClick={() => onSell(product)} disabled={isOutOfStock} className="flex-1 h-9 text-xs" size="sm">
            <ShoppingCart className="w-3.5 h-3.5 mr-1" />
            {t("vender")}
          </Button>
          {/* Fix #1: botón de inventario solo para admin */}
          {isAdmin && (
            <Button onClick={() => onInventory(product)} variant="outline" className="h-9 text-xs" size="sm">
              <Package className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
