"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { adminGetBadges } from "@/lib/api";

// Sidebar rozeti. Sayfa geçişlerinde tazelenir; hata sessizce yutulur —
// rozet kritik bilgi değil, panelin çalışmasını engellememeli.
export function usePendingRequests() {
  const { data: session } = useSession();
  const token = (session as { backendToken?: string })?.backendToken ?? "";
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!token) return;
    adminGetBadges(token)
      .then((b) => setCount(b.pendingRequests))
      .catch(() => {});
  }, [token, pathname]);

  return count;
}
