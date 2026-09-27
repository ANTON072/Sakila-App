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
  { title: "ダッシュボード", href: "/", icon: LayoutDashboard },
  { title: "作品", href: "/films", icon: Film },
  { title: "俳優", href: "/actors", icon: Clapperboard },
  { title: "顧客", href: "/customers", icon: Users },
  {
    title: "レンタル",
    href: "/rentals",
    icon: ReceiptText,
    children: [
      { title: "一覧", href: "/rentals" },
      { title: "新規貸出", href: "/rentals/new" },
      { title: "未返却", href: "/rentals/outstanding" },
    ],
  },
  { title: "在庫", href: "/inventory", icon: Package },
  {
    title: "レポート",
    href: "/reports/sales",
    icon: BarChart3,
    children: [
      { title: "売上", href: "/reports/sales" },
      { title: "顧客", href: "/reports/customers" },
      { title: "作品", href: "/reports/films" },
    ],
  },
];

const adminNav: NavItem[] = [
  { title: "スタッフ", href: "/staff", icon: UserCog },
];

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
          <SidebarGroupLabel>管理</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavMenu items={adminNav} pathname={pathname} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
