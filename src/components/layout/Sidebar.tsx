import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Activity,
  Calendar,
  Stethoscope,
  FlaskConical,
  Pill,
  Syringe,
  Heart,
  ClipboardList,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  BarChart3,
  BedDouble,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['admin', 'nurse', 'doctor', 'lab_technician', 'pharmacist'] },
  { label: 'Patients', icon: Users, path: '/patients', roles: ['admin', 'nurse', 'doctor'] },
  { label: 'Register Patient', icon: UserPlus, path: '/patients/register', roles: ['admin', 'nurse'] },
  { label: 'Vitals', icon: Activity, path: '/vitals', roles: ['admin', 'nurse'] },
  { label: 'Appointments', icon: Calendar, path: '/appointments', roles: ['admin', 'nurse', 'doctor'] },
  { label: 'My Patients', icon: Stethoscope, path: '/doctor/patients', roles: ['doctor'] },
  { label: 'Lab Orders', icon: FlaskConical, path: '/lab/orders', roles: ['admin', 'doctor', 'lab_technician'] },
  { label: 'Lab Results', icon: ClipboardList, path: '/lab/results', roles: ['admin', 'lab_technician'] },
  { label: 'Prescriptions', icon: Pill, path: '/prescriptions', roles: ['admin', 'doctor', 'pharmacist'] },
  { label: 'Pharmacy', icon: Pill, path: '/pharmacy', roles: ['admin', 'pharmacist'] },
  { label: 'Surgeries', icon: Syringe, path: '/surgeries', roles: ['admin', 'doctor', 'nurse'] },
  { label: 'ICU', icon: BedDouble, path: '/icu', roles: ['admin', 'doctor', 'nurse'] },
  { label: 'Follow-ups', icon: Heart, path: '/follow-ups', roles: ['admin', 'doctor', 'nurse'] },
  { label: 'Reports', icon: BarChart3, path: '/reports', roles: ['admin', 'doctor', 'nurse'] },
  { label: 'User Management', icon: Shield, path: '/admin/users', roles: ['admin'] },
  { label: 'Settings', icon: Settings, path: '/settings', roles: ['admin'] },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { role } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();

  const filteredItems = navItems.filter(item => 
    role && item.roles.includes(role)
  );

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen transition-all duration-300 ease-in-out',
        'bg-sidebar flex flex-col border-r border-sidebar-border',
        collapsed ? 'w-20' : 'w-64'
      )}
      style={{ background: 'var(--gradient-sidebar)' }}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-16 px-4 border-b border-sidebar-border',
        collapsed ? 'justify-center' : 'justify-between'
      )}>
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center glow-primary">
              <Heart className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg text-sidebar-foreground truncate">
              {settings?.site_name || 'CardioRegistry'}
            </span>
          </div>
        )}
        {collapsed && (
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center glow-primary">
            <Heart className="w-5 h-5 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-3">
        <ul className="space-y-1">
          {filteredItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            
            const linkContent = (
              <NavLink
                to={item.path}
                className={cn(
                  'sidebar-item',
                  isActive && 'sidebar-item-active'
                )}
              >
                <item.icon className={cn('w-5 h-5 flex-shrink-0', collapsed && 'mx-auto')} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );

            return (
              <li key={item.path}>
                {collapsed ? (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      {linkContent}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  linkContent
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse Button */}
      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent',
            collapsed && 'px-0 justify-center'
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5 mr-2" />
              Collapse
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
