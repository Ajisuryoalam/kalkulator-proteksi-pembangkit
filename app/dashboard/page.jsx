import '../dashboard.css';
import DashboardSidebar from '../../components/dashboard/DashboardSidebar';
import DashboardTopbar from '../../components/dashboard/DashboardTopbar';
import StatsCards from '../../components/dashboard/StatsCards';
import CategoryGrid from '../../components/dashboard/CategoryGrid';
import RecentAndFavorites from '../../components/dashboard/RecentAndFavorites';

export const metadata = {
  title: 'Dashboard — Enginova',
};

export default function DashboardPage() {
  return (
    <div className="enginova">
      <div className="e-shell">
        <DashboardSidebar />
        <div>
          <DashboardTopbar />
          <div className="e-main">
            <div className="e-hero">
              <h1>Selamat datang, Engineer! 👋</h1>
              <p>Hitung dengan akurat, rancang dengan percaya diri, lindungi yang tak tergantikan.</p>
            </div>
            <StatsCards />
            <CategoryGrid />
            <RecentAndFavorites />
          </div>
        </div>
      </div>
    </div>
  );
}
