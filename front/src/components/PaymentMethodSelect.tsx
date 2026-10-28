import React from 'react';

export const SAVINGS_WITHDRAWAL = 'Retiro de Ahorros';

interface Props {
  value: string;
  methods: string[];
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Lista desplegable de medios de pago. Siempre incluye el valor actual
 * (aunque ya no esté en la lista) para no alterar gastos existentes.
 */
export const PaymentMethodSelect: React.FC<Props> = ({ value, methods, onChange, className }) => {
  const current = (value || '').trim();
  const known = [...methods, SAVINGS_WITHDRAWAL];
  const extra =
    current && !known.some((m) => m.toLowerCase() === current.toLowerCase()) ? [current] : [];

  return (
    <select
      className={className}
      value={current}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">— Sin especificar —</option>
      {methods.map((m) => (
        <option key={m} value={m}>
          {m}
        </option>
      ))}
      <option value={SAVINGS_WITHDRAWAL}>💰 {SAVINGS_WITHDRAWAL}</option>
      {extra.map((m) => (
        <option key={`extra-${m}`} value={m}>
          {m}
        </option>
      ))}
    </select>
  );
};
