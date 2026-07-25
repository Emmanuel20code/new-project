import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  CreditCard,
  Users,
  Monitor,
  Ticket,
  Router,
  Activity,
  BarChart3,
  Settings,
  LogOut,
  MoreHorizontal,
  Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";

type NavItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/admin", icon: <LayoutDashboard size={18} /> },
  { label: "Packages", path: "/admin/packages", icon: <Package size={18} /> },
  { label: "Payments", path: "/admin/payments", icon: <CreditCard size={18} /> },
  { label: "Customers", path: "/admin/customers", icon: <Users size={18} /> },
  { label: "Devices", path: "/admin/devices", icon: <Monitor size={18} /> },
  { label: "Vouchers", path: "/admin/vouchers", icon: <Ticket size={18} /> },
  { label: "Routers", path: "/admin/routers", icon: <Router size={18} /> },
  { label: "Sessions", path: "/admin/sessions", icon: <Activity size={18} /> },
  { label: "Reports", path: "/admin/reports", icon: <BarChart3 size={18} /> },
  { label: "Settings", path: "/admin/settings", icon: <Settings size={18} /> },
];

const mainNavItems = navItems.slice(0, 5);
const moreNavItems = navItems.slice(5);

function SidebarLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.path}
      end={item.path === "/admin"}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        )
      }
    >
      {item.icon}
      {item.label}
    </NavLink>
  );
}

export default function AdminLayout() {
  const { signout, user } = useAuth();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const currentUser = useQuery(api.users.getCurrentUser);

  const handleSignOut = async () => {
    await signout();
    navigate("/");
  };

  const displayName = currentUser?.name ?? user?.profile.name ?? "Admin";
  const displayEmail = currentUser?.email ?? user?.profile.email ?? "";

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-60 flex-col bg-sidebar border-r border-sidebar-border shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-5 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Wifi size={16} className="text-sidebar-primary-foreground" />
          </div>
          <div>
            <span className="text-sidebar-foreground font-bold text-sm tracking-wide">EMMATECH</span>
            <span className="ml-1.5 text-[10px] bg-sidebar-primary text-sidebar-primary-foreground px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">
              Admin
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <SidebarLink key={item.path} item={item} />
          ))}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center shrink-0">
              <span className="text-sidebar-primary-foreground text-xs font-bold">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sidebar-foreground text-sm font-medium truncate">{displayName}</p>
              {displayEmail && (
                <p className="text-sidebar-foreground/50 text-xs truncate">{displayEmail}</p>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className="text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors cursor-pointer"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 flex justify-around items-center h-16 border-t bg-sidebar md:hidden z-50">
        {mainNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/admin"}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium transition-colors",
                isActive
                  ? "text-sidebar-primary"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
              )
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
        <DropdownMenu open={moreOpen} onOpenChange={setMoreOpen}>
          <DropdownMenuTrigger asChild>
            <button className="flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground cursor-pointer">
              <MoreHorizontal size={18} />
              More
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="mb-2">
            {moreNavItems.map((item) => (
              <DropdownMenuItem key={item.path} asChild>
                <NavLink to={item.path} className="flex items-center gap-2">
                  {item.icon}
                  {item.label}
                </NavLink>
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
              <LogOut size={16} />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </div>
  );
}
