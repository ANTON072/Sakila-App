import { Separator, SidebarTrigger } from "./ui";
import { UserMenu } from "./user-menu";

export function AppHeader({ userLabel }: { userLabel: string }) {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2" />
      <div className="ml-auto">
        <UserMenu label={userLabel} />
      </div>
    </header>
  );
}
