import { useEffect, useId, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Icon } from './Icons';

export function Button({
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  return <button {...props} className={`btn ${variant} ${props.className ?? ''}`.trim()} />;
}

export function IconButton({
  label,
  name,
  pressed,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  name: Parameters<typeof Icon>[0]['name'];
  pressed?: boolean;
}) {
  return (
    <button {...props} className={`icon-btn ${props.className ?? ''}`.trim()} aria-label={label} aria-pressed={pressed}>
      <Icon name={name} />
    </button>
  );
}

export function Stepper({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}) {
  const id = useId();
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  const commit = (raw: string) => {
    const digits = raw.replace(/[^\d]/g, '');
    const parsed = digits === '' ? min : Number(digits);
    const next = Math.min(max, Math.max(min, parsed));
    onChange(next);
    setText(format ? format(next) : String(next));
  };

  return (
    <div className="field">
      <div className="field-copy">
        <label htmlFor={id}>{label}</label>
        {hint ? <p>{hint}</p> : null}
      </div>
      <div className="stepper">
        <button type="button" aria-label={`Decrease ${label}`} onClick={() => onChange(Math.max(min, value - step))}>
          −
        </button>
        <input
          id={id}
          inputMode="numeric"
          value={focused ? text : format ? format(value) : text}
          onFocus={() => {
            setFocused(true);
            setText(String(value));
          }}
          onChange={(event) => setText(event.target.value)}
          onBlur={(event) => {
            setFocused(false);
            commit(event.target.value);
          }}
        />
        <button type="button" aria-label={`Increase ${label}`} onClick={() => onChange(Math.min(max, value + step))}>
          +
        </button>
      </div>
    </div>
  );
}

export function Dialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="modal-root" role="presentation" onClick={onCancel}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="dialog-title">{title}</h2>
        <p>{body}</p>
        <div className="modal-actions">
          <Button variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} autoFocus>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Screen({
  children,
  footer,
  tabs = false,
}: {
  children: ReactNode;
  footer?: ReactNode;
  tabs?: boolean;
}) {
  return (
    <section className={`screen ${tabs ? 'with-tabs' : ''}`}>
      <div className="scroll">{children}</div>
      {footer}
    </section>
  );
}
