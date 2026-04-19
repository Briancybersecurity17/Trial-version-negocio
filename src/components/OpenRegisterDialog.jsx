import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign } from "lucide-react";

export default function OpenRegisterDialog({ open, onOpenChange, suggestedBalance, onConfirm }) {
  const [balance, setBalance] = useState(suggestedBalance || 0);

  const handleConfirm = () => {
    onConfirm(balance);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Abrir Caja del Día
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {suggestedBalance > 0 && (
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-sm">
              <p className="text-muted-foreground">Balance sugerido del día anterior:</p>
              <p className="text-lg font-bold text-primary">${suggestedBalance.toFixed(2)}</p>
            </div>
          )}
          <div className="space-y-2">
            <Label>Balance Inicial</Label>
            <Input
              type="number"
              value={balance}
              onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
              min={0}
              step={0.01}
              placeholder="0.00"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm}>Abrir Caja</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}