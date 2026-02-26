import Link from "next/link";
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import NextAuthProvider from "@/providers/NextAuthProvider";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <NextAuthProvider>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar */}
        <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <p className="font-bold text-emerald-600 text-lg">Admin Panel</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {session?.user?.email}
            </p>
          </div>
          <nav className="flex-1 p-4">
            <ul className="space-y-1">
              {[
                { href: "/admin", label: "📊 Dashboard" },
                { href: "/admin/blog", label: "📝 Blog Yazıları" },
                { href: "/admin/sss", label: "❓ SSS" },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 text-sm font-medium transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="p-4 border-t border-gray-200">
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/admin/login" });
              }}
            >
              <button
                type="submit"
                className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:text-red-500 transition-colors"
              >
                🚪 Çıkış Yap
              </button>
            </form>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </NextAuthProvider>
  );
}
