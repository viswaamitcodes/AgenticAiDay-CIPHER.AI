
'use client';

import {
  Sidebar,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarContent,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Video,
  ShieldAlert,
  BarChart3,
  Users,
  Settings,
  Bell,
  Mic,
  Siren,
  CalendarCheck,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export function SidebarNav() {
  const pathname = usePathname();
  const params = useParams();
  const eventId = params.eventId as string;
  const { userProfile } = useAuth();
  
  const isActive = (path: string) => pathname === `/event/${eventId}${path}`;

  const menuItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/cameras', icon: Video, label: 'Cameras', disallowedRoles: ['Operator'] },
    { href: '/incidents', icon: ShieldAlert, label: 'Incidents' },
    { href: '/alerts', icon: Bell, label: 'Alerts' },
    { href: '/analytics', icon: BarChart3, label: 'Analytics' },
    { href: '/emergency-response', icon: Siren, label: 'Emergency Response' },
    { href: '/ai-command-center', icon: Mic, label: 'Talk with Drishti' },
    { href: '/users', icon: Users, label: 'Users', requiredRole: 'Admin' },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
              <Link href="/" passHref>
                <SidebarMenuButton as="a" tooltip="Change Event">
                  <CalendarCheck />
                  <span>Change Event</span>
                </SidebarMenuButton>
              </Link>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {menuItems.map((item) => {
            if (item.requiredRole && userProfile?.role !== item.requiredRole) {
              return null;
            }
            if (item.disallowedRoles && item.disallowedRoles.includes(userProfile?.role || '')) {
              return null;
            }
            return (
              <SidebarMenuItem key={item.href}>
                <Link href={`/event/${eventId}${item.href}`} passHref>
                  <SidebarMenuButton
                    as="a"
                    isActive={isActive(item.href)}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {userProfile?.role !== 'Operator' && (
            <SidebarMenuItem>
              <Link href={`/event/${eventId}/settings`} passHref>
                <SidebarMenuButton
                  as="a"
                  isActive={isActive('/settings')}
                  tooltip="Settings"
                >
                  <Settings />
                  <span>Settings</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
