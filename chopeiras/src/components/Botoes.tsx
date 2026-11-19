'use client';
import { useFormStatus } from 'react-dom';

export function BotaoEnviar({ children, className = 'btn-primario w-full', confirmar }: { children: React.ReactNode; className?: string; confirmar?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (confirmar && !window.confirm(confirmar)) e.preventDefault();
      }}
    >
      {pending ? 'Aguarde…' : children}
    </button>
  );
}
