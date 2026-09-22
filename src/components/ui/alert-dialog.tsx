import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface AlertDialogProps {
  open: boolean;
  title: string;
  description: string;
  cancelText?: string;
  confirmText?: string;
  confirming?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  children?: ReactNode;
}

export function AlertDialog({
  open,
  title,
  description,
  cancelText = 'Cancelar',
  confirmText = 'Confirmar',
  confirming = false,
  onCancel,
  onConfirm,
  children,
}: AlertDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-lg rounded-xl border bg-card p-5 shadow-lg">
        <div className="mb-3 flex items-start gap-3">
          <div className="rounded-full bg-destructive/10 p-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>

        {children}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={confirming}>
            {cancelText}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={confirming}>
            {confirming ? 'Procesando...' : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
