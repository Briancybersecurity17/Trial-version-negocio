import { DollarSign, TrendingUp, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/LanguageContext";

// Formatea moneda de forma compacta si el número es muy grande
function formatMoney(value) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    const v = value / 1_000_000;
    // 2 decimales para distinguir ej: $1,55M vs $1,60M
    const str = v.toFixed(2).replace('.', ',');
    // quitar ceros finales: 1,50 → 1,5 / 1,00 → 1
    const trimmed = str.replace(/,?0+$/, '');
    return `$${trimmed}M`;
  }
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(2)}`;
}

export default function CashRegisterPanel({ register, totalSalesToday, onCloseRegister, onReopenRegister }) {
  const { t } = useLanguage();
  if (!register) return null;

  const currentBalance = register.opening_balance + totalSalesToday;
  const isClosed = register.status === "closed";

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{t("cajaDia")}</h3>
            <p className="text-xs text-muted-foreground">{register.date}</p>
          </div>
        </div>
        {isClosed ? (
          <Button variant="outline" size="sm" onClick={onReopenRegister} className="text-xs flex-shrink-0">{t("reabrirCaja")}</Button>
        ) : (
          <Button variant="outline" size="sm" onClick={onCloseRegister} className="text-xs flex-shrink-0">{t("cerrarCaja")}</Button>
        )}
      </div>
      {/* Fix #4: texto adaptativo para números grandes en móvil */}
      <div className="grid grid-cols-3 divide-x divide-border">
        <div className="p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
            <ArrowUp className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{t("apertura")}</span>
          </div>
          <p className="font-bold text-sm sm:text-base lg:text-lg truncate">{formatMoney(register.opening_balance)}</p>
        </div>
        <div className="p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
            <TrendingUp className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{t("ventas")}</span>
          </div>
          <p className="font-bold text-sm sm:text-base lg:text-lg text-primary truncate">{formatMoney(totalSalesToday)}</p>
        </div>
        <div className="p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
            <ArrowDown className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{isClosed ? t("cierre") : t("actual")}</span>
          </div>
          <p className="font-bold text-sm sm:text-base lg:text-lg text-success truncate">
            {formatMoney(isClosed ? register.closing_balance : currentBalance)}
          </p>
        </div>
      </div>
    </div>
  );
}
