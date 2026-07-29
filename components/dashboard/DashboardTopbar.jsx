'use client';
import * as Icons from 'lucide-react';

export default function DashboardTopbar() {
  return (
    <div className="e-topbar">
      <div className="e-search">
        <Icons.Search size={16} />
        <span>Cari perhitungan, alat, atau standar...</span>
        <kbd>Ctrl+K</kbd>
      </div>
      <div className="e-topbar-actions">
        <Icons.Bell size={18} color="#5B6472" />
        <div className="e-avatar"><Icons.User size={17} /></div>
      </div>
    </div>
  );
}
