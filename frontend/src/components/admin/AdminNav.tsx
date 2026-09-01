"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePendingRequests } from "./useBadges";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  group: "gunluk" | "finans" | "icerik";
  mobile?: boolean;
}

// Kullanım sıklığına göre sıralı. `mobile: true` olanlar alt sekme
// çubuğunda görünür; kalanı "Daha fazla" sayfasına düşer.
export const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Bugün", icon: "☀️", group: "gunluk", mobile: true },
  { href: "/admin/takvim", label: "Takvim", icon: "📆", group: "gunluk", mobile: true },
  { href: "/admin/hastalar", label: "Danışanlar", icon: "👥", group: "gunluk", mobile: true },
  { href: "/admin/talepler", label: "Talepler", icon: "📨", group: "gunluk" },
  { href: "/admin/finans", label: "Finans", icon: "💰", group: "finans", mobile: true },
  { href: "/admin/istatistik", label: "İstatistikler", icon: "📈", group: "finans" },
  { href: "/admin/blog", label: "Blog Yazıları", icon: "📝", group: "icerik" },
  { href: "/admin/sss", label: "SSS", icon: "❓", group: "icerik" },
];

const GROUPS: { key: NavItem["group"]; label: string }[] = [
  { key: "gunluk", label: "Günlük" },
  { key: "finans", label: "Finans" },
  { key: "icerik", label: "İçerik" },
];

// "/admin" yalnızca tam eşleşmede aktif; diğerleri alt yolları da kapsar.
export function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export default function AdminNav({
  email,
  signOut,
}: {
  email: string;
  signOut: React.ReactNode;
}) {
  const pathname = usePathname();
  const pendingRequests = usePendingRequests();

  return (
    <aside className="hidden md:flex w-72 bg-white border-r border-gray-200 flex-col shrink-0">
      <div className="p-6 border-b border-gray-200">
        <p className="font-bold text-brand-600 text-lg">Admin Panel</p>
        <p className="text-xs text-gray-400 mt-0.5">{email}</p>
      </div>
      <nav className="flex-1 p-4 overflow-y-auto">
        {GROUPS.map((group) => (
          <div key={group.key} className="mb-5 last:mb-0">
            <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              {group.label}
            </p>
            <ul className="space-y-1">
              {NAV_ITEMS.filter((i) => i.group === group.key).map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(pathname, item.href) ? "page" : undefined}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(pathname, item.href)
                        ? "bg-brand-50 text-brand-600"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span aria-hidden>{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.href === "/admin/talepler" && pendingRequests > 0 && (
                      <span className="text-xs bg-brand-500 text-white rounded-full px-2 py-0.5">
                        {pendingRequests}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-200">{signOut}</div>
    </aside>
  );
}
