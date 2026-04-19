import { fmtMoneda } from "@/utils/currency";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, DollarSign, TrendingUp, ArrowRight } from "lucide-react";
import moment from "moment";
import "moment/locale/es";
import "moment/locale/en-gb";
import { useLanguage } from "@/lib/LanguageContext";
import { useTheme } from "@/lib/ThemeContext";

export default function CalendarView() {
  const { t, lang } = useLanguage();
  const { currentTheme } = useTheme();

  moment.locale(lang === "en" ? "en-gb" : "es");

  const [currentMonth, setCurrentMonth] = useState(moment());
  const [registers, setRegisters] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const startDate = currentMonth.clone().startOf("month").format("YYYY-MM-DD");
      const endDate = currentMonth.clone().endOf("month").format("YYYY-MM-DD");
      try {
        const [regs, sls] = await Promise.all([
          base44.entities.CashRegister.list("-date", 100),
          base44.entities.CashSale.filter(
            { sale_date: { $gte: startDate, $lte: endDate } },
            "-created_date", 1000
          ),
        ]);
        setRegisters(regs);
        setSales(sls);
      } catch (e) {
        toast.error(lang === "en" ? "Error loading data" : "Error al cargar los datos");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentMonth]);

  const registerMap = {};
  registers.forEach((r) => { registerMap[r.date] = r; });

  const salesByDate = {};
  sales.forEach((s) => {
    if (!salesByDate[s.sale_date]) salesByDate[s.sale_date] = [];
    salesByDate[s.sale_date].push(s);
  });

  const startOfMonth = currentMonth.clone().startOf("month");
  const endOfMonth = currentMonth.clone().endOf("month");
  const startDay = startOfMonth.clone().startOf("week");
  const endDay = endOfMonth.clone().endOf("week");

  const weeks = [];
  let day = startDay.clone();
  while (day.isBefore(endDay) || day.isSame(endDay, "day")) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(day.clone());
      day.add(1, "day");
    }
    weeks.push(week);
  }

  const selectedReg = selectedDate ? registerMap[selectedDate] : null;
  const selectedSales = selectedDate ? (salesByDate[selectedDate] || []) : [];
  const selectedTotal = selectedSales.reduce((s, v) => s + (v.total || 0), 0);

  const dayHeaders = lang === "en"
    ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    : ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const formatLongDate = (dateStr) => {
    if (!dateStr) return "";
    return lang === "en"
      ? moment(dateStr).format("dddd, MMMM D, YYYY")
      : moment(dateStr).format("dddd, D [de] MMMM [de] YYYY");
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{t("calendario")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("calendarioDesc")}</p>
      </div>

      <div className="rounded-2xl overflow-hidden shadow-lg border border-border" style={{ boxShadow: `0 4px 32px ${currentTheme?.glowColor || "rgba(0,0,0,0.15)"}` }}>
        {/* Calendar header with theme gradient */}
        <div className="flex items-center justify-between p-5" style={{ background: currentTheme?.heroGradient }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(currentMonth.clone().subtract(1, "month"))}
            className="text-white hover:bg-white/20 rounded-xl"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="font-bold text-xl capitalize text-white tracking-wide">
            {currentMonth.format("MMMM YYYY")}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(currentMonth.clone().add(1, "month"))}
            className="text-white hover:bg-white/20 rounded-xl"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7" style={{ background: `${currentTheme?.from}18` }}>
          {dayHeaders.map((d) => (
            <div key={d} className="p-2 text-center text-xs font-bold uppercase tracking-wider" style={{ color: currentTheme?.from }}>
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 bg-card">
          {weeks.flat().map((d, i) => {
            const dateStr = d.format("YYYY-MM-DD");
            const isCurrentMonth = d.month() === currentMonth.month();
            const isToday = d.isSame(moment(), "day");
            const isSelected = dateStr === selectedDate;
            const reg = registerMap[dateStr];
            const daySales = salesByDate[dateStr] || [];
            const dayTotal = daySales.reduce((s, v) => s + (v.total || 0), 0);

            return (
              <button
                key={i}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`relative p-2 min-h-[80px] lg:min-h-[100px] border-b border-r border-border/50 text-left transition-all duration-150
                  ${!isCurrentMonth ? "opacity-25" : ""}
                  ${isSelected ? "ring-2 ring-inset" : "hover:bg-muted/40"}
                `}
                style={
                  isSelected
                    ? { background: `${currentTheme?.from}12`, ringColor: currentTheme?.from }
                    : isToday
                    ? { background: `${currentTheme?.from}08` }
                    : {}
                }
              >
                <span
                  className={`text-sm font-semibold flex items-center justify-center w-7 h-7 rounded-full transition-all
                    ${isToday ? "text-white shadow-md" : isCurrentMonth ? "text-foreground" : "text-muted-foreground"}
                  `}
                  style={isToday ? { background: currentTheme?.heroGradient } : {}}
                >
                  {d.date()}
                </span>
                {reg && isCurrentMonth && (
                  <div className="mt-1 space-y-0.5">
                    {dayTotal > 0 && (
                      <div className="text-xs font-bold truncate" style={{ color: currentTheme?.from }}>
                        {fmtMoneda(dayTotal)}
                      </div>
                    )}
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: reg.status === "closed" ? "#22c55e" : "#f59e0b" }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-4 py-3 border-t border-border/50 bg-muted/20">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground">{lang === "en" ? "Closed" : "Cerrada"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-xs text-muted-foreground">{lang === "en" ? "Open" : "Abierta"}</span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: currentTheme?.heroGradient }} />
            <span className="text-xs text-muted-foreground">{lang === "en" ? "Today" : "Hoy"}</span>
          </div>
        </div>
      </div>

      {selectedDate && (
        <div className="rounded-2xl bg-card border border-border p-6 space-y-4 shadow-md" style={{ borderColor: `${currentTheme?.from}30` }}>
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 rounded-full" style={{ background: currentTheme?.heroGradient }} />
            <h3 className="font-bold text-lg capitalize">
              {formatLongDate(selectedDate)}
            </h3>
          </div>

          {selectedReg ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-muted/30 p-4">
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  {t("apertura")}
                </div>
                <p className="text-xl font-bold">{fmtMoneda(selectedReg.opening_balance)}</p>
              </div>
              <div className="rounded-xl bg-primary/5 p-4">
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {t("ventasDelDia")}
                </div>
                <p className="text-xl font-bold text-primary">{fmtMoneda(selectedTotal)}</p>
              </div>
              <div className="rounded-xl bg-success/5 p-4">
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <ArrowRight className="w-3 h-3" />
                  {selectedReg.status === "closed" ? t("cierre") : t("balanceActual")}
                </div>
                <p className="text-xl font-bold text-success">
                  {selectedReg.status === "closed"
                    ? fmtMoneda(selectedReg.closing_balance)
                    : fmtMoneda(selectedReg.opening_balance + selectedTotal)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{t("sinCajaEsteDia")}</p>
          )}

          {selectedSales.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                {t("ventas")} ({selectedSales.length})
              </h4>
              <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                {selectedSales.map((sale) => (
                  <div key={sale.id} className="p-3 flex items-center justify-between hover:bg-muted/20 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{sale.product_name}</p>
                      <p className="text-xs text-muted-foreground">{sale.quantity} × {fmtMoneda(sale.unit_price)}</p>
                    </div>
                    <span className="font-bold text-sm">{fmtMoneda(sale.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}