import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Trophy,
  FileText,
  MessageSquare,
  Settings,
  LogOut,
  BarChart3
} from 'lucide-react';
import { useApp } from './AppContext';
import authService from '../services/authService';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/coach/dashboard' },
  { icon: Users, label: 'Player Management', path: '/coach/players' },
  { icon: CalendarCheck, label: 'Mark Attendance', path: '/coach/attendance' },
  { icon: BarChart3, label: 'Player Statistics', path: '/coach/statistics' },
  { icon: Trophy, label: 'AI Best XI', path: '/coach/best-xi' },
  { icon: FileText, label: 'Generate Reports', path: '/coach/reports' },
  { icon: MessageSquare, label: 'Messages', path: '/coach/messages' },
  { icon: Settings, label: 'Settings', path: '/coach/settings' },
];

export function CoachSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useApp();

  const handleLogout = () => {
    // Clear localStorage and React state
    authService.logout();
    setUser(null);
    navigate('/');
  };

  return (
    <div className="w-64 bg-sidebar h-screen flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-3 w-full hover:opacity-80 transition-opacity"
        >
          <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <span className="text-sidebar-primary-foreground">CM</span>
          </div>
          <div className="text-left">
            <h2 className="text-sidebar-foreground">CricMate</h2>
            <p className="text-xs text-sidebar-foreground/70">Coach Portal</p>
          </div>
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
