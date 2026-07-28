'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { EQUIP, ORDER } from '../lib/equipment';

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <nav className="equip-nav">
      {ORDER.map(key => {
        const e = EQUIP[key];
        const href = `/kalkulator/${key}`;
        const active = pathname === href;
        return (
          <Link href={href} key={key} className={'equip-btn' + (active ? ' active' : '')}>
            {e.label}
            <div className="dev">{e.dev}</div>
          </Link>
        );
      })}
    </nav>
  );
}
