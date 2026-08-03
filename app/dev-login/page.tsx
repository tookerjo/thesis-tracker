import { notFound } from "next/navigation";
import { DevLoginForm } from "./dev-login-form";

// Defense in depth only -- the primary guarantee that this route never
// reaches production is structural: scripts/build.mjs physically removes
// this directory before `next build` runs on Vercel, so there is no route
// for this check to even gate on there. This check covers any other host
// (e.g. `next build && next start` off Vercel) where that stripping step
// wouldn't apply.
export default function DevLoginPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <DevLoginForm />;
}
