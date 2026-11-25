import React from 'react';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';

interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  confirmVariant?: 'primary' | 'alert';
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  children?: React.ReactNode;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  confirmVariant = 'primary',
  onConfirm,
  loading,
  children,
}) => {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
    >
      <div className="flex flex-col gap-4">
        {children}
        <div className="flex flex-col gap-2.5 pt-1 sm:flex-row-reverse">
          <Button
            variant={confirmVariant}
            size="lg"
            fullWidth
            disabled={loading}
            onClick={() => void onConfirm()}
          >
            {confirmLabel}
          </Button>
          <Button
            variant="outline"
            size="lg"
            fullWidth
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};
