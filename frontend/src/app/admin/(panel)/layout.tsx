import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import NextAuthProvider from "@/providers/NextAuthProvider";
import { ConfirmProvider, ToastProvider } from "@/components/admin/ui";
import AdminNav from "@/components/admin/AdminNav";
import MobileTabBar from "@/components/admin/MobileTabBar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const signOutButton = (
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
  );

  return (
    <NextAuthProvider>
      <ConfirmProvider>
        <ToastProvider>
          <div className="min-h-screen bg-gray-50 flex">
            <AdminNav
              email={session.user?.email ?? ""}
              signOut={signOutButton}
            />
            {/* Alt sekme çubuğunun altında kalmaması için mobilde alt boşluk */}
            <main className="flex-1 min-w-0 p-4 md:p-8 pb-24 md:pb-8 overflow-auto">
              {children}
            </main>
            <MobileTabBar signOut={signOutButton} />
          </div>
        </ToastProvider>
      </ConfirmProvider>
    </NextAuthProvider>
  );
}
