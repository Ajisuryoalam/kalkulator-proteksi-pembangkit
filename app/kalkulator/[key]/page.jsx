import { EQUIP, ORDER } from '../../../lib/equipment';
import Sidebar from '../../../components/Sidebar';
import EquipmentCalculator from '../../../components/EquipmentCalculator';
import Coordination from '../../../components/Coordination';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  return ORDER.map(key => ({ key }));
}

export default function KalkulatorPage({ params }) {
  if (!EQUIP[params.key]) return notFound();

  return (
    <div className="app">
      <header>
        <div>
          <div className="brand-eyebrow">Panel Koordinasi Proteksi</div>
          <h1>Kalkulator Setting Proteksi Unit Pembangkit</h1>
          <div className="sub">Generator → Trafo → Busbar → Feeder → Kabel → Motor. Perhitungan indikatif berbasis IEEE C37.2 / IEC 60255.</div>
        </div>
      </header>
      <div className="layout">
        <Sidebar />
        <main>
          {params.key === 'koordinasi' ? <Coordination /> : <EquipmentCalculator equipKey={params.key} />}
          <div className="nameplate">
            <span className="nameplate-dot" />
            Disusun oleh <b>Aji Suryo Alam</b> · Panel Koordinasi Proteksi v1
          </div>
        </main>
      </div>
    </div>
  );
}
