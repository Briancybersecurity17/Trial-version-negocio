import { AlertTriangle, XCircle, CheckCircle } from "lucide-react";

export default function StockBadge({ stock, minStock }) {
  if (stock === 0) {
    return (
      <div className="flex items-center gap-1 text-xs font-medium text-destructive">
        <XCircle className="w-3.5 h-3.5" />
        Sin Stock
      </div>
    );
  }
  if (stock <= minStock) {
    return (
      <div className="flex items-center gap-1 text-xs font-medium text-warning">
        <AlertTriangle className="w-3.5 h-3.5" />
        Stock Bajo ({stock})
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-xs font-medium text-success">
      <CheckCircle className="w-3.5 h-3.5" />
      {stock} uds.
    </div>
  );
}