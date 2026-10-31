import type { ReactNode } from 'react';

type AdminTableScrollProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

export default function AdminTableScroll({ label, children, className = '' }: AdminTableScrollProps) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className={`min-w-0 max-w-full overflow-x-auto overscroll-x-contain focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--gold) ${className}`}
    >
      {children}
    </div>
  );
}
