'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RotateCcw, Trash2 } from 'lucide-react';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'default';
  icon?: 'trash' | 'revert' | 'warning';
  onConfirm: () => void;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'destructive',
  icon = 'trash',
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  const handleConfirm = React.useCallback(() => {
    onConfirm();
    onOpenChange(false);
  }, [onConfirm, onOpenChange]);

  const handleCancel = React.useCallback(() => {
    if (!loading) onOpenChange(false);
  }, [onOpenChange, loading]);

  if (!open) return null;

  const IconComponent =
    icon === 'trash' ? Trash2 : icon === 'revert' ? RotateCcw : AlertTriangle;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <Card
        className={cn(
          'relative z-10 w-full max-w-md border-2 shadow-2xl',
          variant === 'destructive'
            ? 'border-red-500/50 bg-[#1A1A1A] shadow-red-500/10'
            : 'border-[#3A3A3A] bg-[#1A1A1A]'
        )}
      >
        <CardHeader className="flex flex-row items-start gap-3">
          <div
            className={cn(
              'flex-shrink-0 flex items-center justify-center rounded-full p-2.5',
              variant === 'destructive' ? 'bg-red-500/20 text-red-400' : 'bg-[#fed094]/20 text-[#fed094]'
            )}
          >
            <IconComponent className="h-5 w-5" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle id="confirm-dialog-title" className="text-white text-lg">
              {title}
            </CardTitle>
            <p
              id="confirm-dialog-description"
              className="text-[#CCCCCC] mt-1 text-sm leading-relaxed"
            >
              {description}
            </p>
          </div>
        </CardHeader>
        <CardFooter className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
            className="border-[#3A3A3A] text-[#CCCCCC] hover:bg-[#2A2A2A] hover:text-white"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={loading}
            className={
              variant === 'destructive'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-[#fed094] text-[#1A1A1A] hover:bg-[#fed094]/90'
            }
          >
            {loading ? 'Processando...' : confirmLabel}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
