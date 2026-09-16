import { LoginForm } from "@/feature/login";

export default function LoginPage() {
  return (
    <div className="grid place-items-center h-svh">
      <div className="grid gap-4 w-full max-w-sm">
        <h1 className="font-semibold text-2xl text-center">Sakila Console</h1>
        <LoginForm />
      </div>
    </div>
  );
}
