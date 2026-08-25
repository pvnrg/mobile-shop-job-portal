import {
  LayoutDashboard,
  Wrench,
  Users,
  CreditCard,
  Receipt,
  Settings,
  Boxes,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Jobs", href: "/dashboard/jobs", icon: Wrench },
  { title: "Customers", href: "/dashboard/customers", icon: Users },
  { title: "Inventory", href: "/dashboard/inventory", icon: Boxes },
  { title: "Payments", href: "/dashboard/payments", icon: CreditCard },
  { title: "Invoices (GST)", href: "/dashboard/invoices", icon: Receipt },
  { title: "Reports", href: "/dashboard/reports", icon: BarChart3 },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
];
