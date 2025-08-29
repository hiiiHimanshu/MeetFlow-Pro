import React from 'react';

export function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' }
) {
  const { children, variant = 'primary', className = '', disabled, ...rest } = props;
  const base = 'px-3 py-2 rounded text-sm font-medium';
  const styles =
    variant === 'primary'
      ? 'bg-blue-600 text-white hover:bg-blue-700'
      : 'bg-gray-200 text-gray-900 hover:bg-gray-300';
  const disabledCls = disabled ? 'opacity-50 cursor-not-allowed hover:bg-inherit' : '';
  return (
    <button {...rest} disabled={disabled} className={`${base} ${styles} ${disabledCls} ${className}`}>
      {children}
    </button>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  props,
  ref
) {
  return <input ref={ref} {...props} className={`border rounded px-3 py-2 w-full ${props.className ?? ''}`} />;
});

export const TextArea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea(
  props,
  ref
) {
  return <textarea ref={ref} {...props} className={`border rounded px-3 py-2 w-full ${props.className ?? ''}`} />;
});

export function Spinner() {
  return <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700 align-middle" />;
}

export function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">{children}</span>;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`border rounded px-3 py-2 ${props.className ?? ''}`} />;
}

export function Modal({ open, title, children, onClose }: { open: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded bg-white p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between"><h3 className="text-lg font-semibold">{title}</h3><button onClick={onClose}>✕</button></div>
        {children}
      </div>
    </div>
  );
}
