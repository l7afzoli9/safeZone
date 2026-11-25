import React from 'react';
import { Toaster, toast } from 'sonner';
import { useI18n } from '../../i18n';
import { useTheme } from '../../context/ThemeContext';

export { toast };

export const AppToaster: React.FC = () => {
  const { dir } = useI18n();
  const { resolvedTheme } = useTheme();

  return (
    <Toaster
      dir={dir}
      theme={resolvedTheme}
      position="top-center"
      closeButton
      toastOptions={{
        style: {
          background: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          fontSize: '0.9375rem',
        },
      }}
    />
  );
};
