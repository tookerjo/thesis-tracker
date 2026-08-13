"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/topics", label: "Topics" },
  { href: "/views", label: "Views" },
];

// Public/auth routes where the authenticated-app nav shouldn't appear. The root
// layout wraps every route, so this pathname guard scopes the nav without a
// route-group refactor.
const HIDDEN_PREFIXES = ["/login", "/dev-login", "/auth"];

export function SiteNav() {
  const pathname = usePathname();

  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <nav className="flex w-full flex-wrap items-center gap-6 border-b border-neutral-200 px-8 py-4">
      {NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              active
                ? "text-sm font-semibold text-foreground underline underline-offset-4"
                : "text-sm text-neutral-500 hover:underline"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
