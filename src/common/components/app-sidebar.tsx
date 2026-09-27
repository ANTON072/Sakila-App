"use client";

import {
  BarChart3,
  Clapperboard,
  Film,
  LayoutDashboard,
  type LucideIcon,
  Package,
  ReceiptText,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "./ui";

type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  children?: { title: string; href: string }[];
};

const mainNav: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Films", href: "/films", icon: Film },
  { title: "Actors", href: "/actors", icon: Clapperboard },
  { title: "Customers", href: "/customers", icon: Users },
  {
    title: "Rentals",
    href: "/rentals",
    icon: ReceiptText,
    children: [
      { title: "All Rentals", href: "/rentals" },
      { title: "New Rental", href: "/rentals/new" },
      { title: "Outstanding", href: "/rentals/outstanding" },
    ],
  },
  { title: "Inventory", href: "/inventory", icon: Package },
  {
    title: "Reports",
    href: "/reports/sales",
    icon: BarChart3,
    children: [
      { title: "Sales", href: "/reports/sales" },
      { title: "Customers", href: "/reports/customers" },
      { title: "Films", href: "/reports/films" },
    ],
  },
];

const adminNav: NavItem[] = [{ title: "Staff", href: "/staff", icon: UserCog }];

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavMenu({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton
            isActive={!item.children && isActivePath(pathname, item.href)}
            render={<Link href={item.href} />}
          >
            <item.icon />
            <span>{item.title}</span>
          </SidebarMenuButton>
          {item.children && (
            <SidebarMenuSub>
              {item.children.map((child) => (
                <SidebarMenuSubItem key={child.href}>
                  <SidebarMenuSubButton
                    isActive={pathname === child.href}
                    render={<Link href={child.href} />}
                  >
                    <span>{child.title}</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          )}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/" className="px-2 py-1.5 font-semibold text-lg">
          Sakila Console
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <NavMenu items={mainNav} pathname={pathname} />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavMenu items={adminNav} pathname={pathname} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
