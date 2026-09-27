import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppHeader, AppSidebar, SidebarInset, SidebarProvider } from "@/common";
import { auth } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  // サイドバーの開閉状態
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset>
        <AppHeader userLabel={session.user?.name ?? "スタッフ"} />
        <div className="flex-1 p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
