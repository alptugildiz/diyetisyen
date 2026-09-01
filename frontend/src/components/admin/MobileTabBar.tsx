"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_ITEMS, isActive } from "./AdminNav";
import { usePendingRequests } from "./useBadges";
import Modal from "./ui/Modal";

const PRIMARY = NAV_ITEMS.filter((i) => i.mobile);
const SECONDARY = NAV_ITEMS.filter((i) => !i.mobile);

export default function MobileTabBar({
  signOut,
}: {
  signOut: React.ReactNode;
}) {
  const pathname = usePathname();
  const pendingRequests = usePendingRequests();
  const [moreOpen, setMoreOpen] = useState(false);

  // Dokunma hedefi en az 56px: tek elle kullanılabilsin.
  const tabCls = (active: boolean) =>
    `flex-1 flex flex-col items-center gap-0.5 py-2 min-h-[56px] justify-center text-[11px] font-medium ${
      active ? "text-brand-600" : "text-gray-500"
    }`;

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 flex">
        {PRIMARY.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(pathname, item.href) ? "page" : undefined}
            className={tabCls(isActive(pathname, item.href))}
          >
            <span aria-hidden className="text-base">
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
        <button
          onClick={() => setMoreOpen(true)}
          className={`${tabCls(false)} relative`}
        >
          <span aria-hidden className="text-base">
            ⋯
          </span>
          Daha fazla
          {pendingRequests > 0 && (
            <span className="absolute top-2 right-1/4 w-2 h-2 rounded-full bg-brand-500" />
          )}
        </button>
      </nav>

      <Modal
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="Daha fazla"
      >
        <ul className="space-y-1">
          {SECONDARY.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-gray-700 hover:bg-gray-50"
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
        <div className="mt-4 pt-4 border-t border-gray-200">{signOut}</div>
      </Modal>
    </>
  );
}
