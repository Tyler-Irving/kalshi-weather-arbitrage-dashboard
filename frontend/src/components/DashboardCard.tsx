import { ReactNode } from 'react';

interface DashboardCardProps {
  children: ReactNode;
  className?: string;
}

export default function DashboardCard({ children, className = '' }: DashboardCardProps) {
  return (
    <div
      className={`dashboard-card frost-card h-full flex flex-col ${className}`}
    >
      {children}
    </div>
  );
}
