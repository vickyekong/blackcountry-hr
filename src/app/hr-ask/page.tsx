import { Suspense } from "react";
import HrAskClient from "./hr-ask-client";

export const dynamic = "force-dynamic";

export default function HrAskPage() {
  return (
    <Suspense fallback={<p className="p-8 text-muted">Loading…</p>}>
      <HrAskClient />
    </Suspense>
  );
}
