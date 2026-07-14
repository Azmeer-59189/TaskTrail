import Link from "next/link";
import { signOut } from "../app/auth/actions";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: "/jobs", label: "Tasks" },
  { href: "/notifications", label: "Notifications" },
  { href: "/team", label: "Team" },
];

export function AppShell({
  workspaceName,
  currentPath,
  children,
}: {
  workspaceName: string;
  currentPath: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen">
      <div className="mx-auto flex max-w-7xl gap-6 px-5 py-6">
        <aside className="hidden w-60 shrink-0 border-r border-zinc-200 pr-5 lg:block">
          <Link className="mb-8 flex items-center gap-3" href="/">
            <span className="grid h-10 w-10 place-items-center rounded bg-field font-bold text-white">
              TT
            </span>
            <span>
              <span className="block text-sm font-semibold text-ink">
                TaskTrail
              </span>
              <span className="block max-w-36 truncate text-xs text-zinc-500">
                {workspaceName}
              </span>
            </span>
          </Link>
          <nav className="space-y-1 text-sm">
            {links.map((link) => (
              <Link
                className={`block rounded px-3 py-2 font-medium ${currentPath === link.href ? "bg-white text-ink shadow-sm" : "text-zinc-600 hover:bg-white"}`}
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <form action={signOut} className="mt-8 border-t border-zinc-200 pt-4">
            <button className="w-full rounded px-3 py-2 text-left text-sm font-medium text-zinc-500 hover:bg-white">
              Sign out
            </button>
          </form>
        </aside>
        <section className="min-w-0 flex-1">
          <div className="mb-5 flex gap-2 overflow-x-auto lg:hidden">
            {links.map((link) => (
              <Link
                className={`whitespace-nowrap rounded px-3 py-2 text-sm font-medium ${currentPath === link.href ? "bg-ink text-white" : "bg-white text-zinc-600"}`}
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}

export function Notice({
  type = "error",
  children,
}: {
  type?: "error" | "success";
  children?: React.ReactNode;
}) {
  if (!children) return null;
  return (
    <div
      className={`mb-5 rounded border px-4 py-3 text-sm ${type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}
    >
      {children}
    </div>
  );
}
