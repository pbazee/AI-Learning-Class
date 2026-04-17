import Link from "next/link";
import { Lock, RefreshCcw } from "lucide-react";

export function ExpiredSubscriptionNotice({
  renewHref = "/pricing",
  title = "Your subscription has expired",
  description = "Renew to continue learning. Your lesson progress, notes, and completed work are still saved and will be waiting for you when access is restored.",
}: {
  renewHref?: string;
  title?: string;
  description?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl rounded-[32px] border border-white/10 bg-slate-950/88 p-8 text-center shadow-[0_30px_100px_-50px_rgba(15,23,42,0.95)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-blue/12 text-primary-blue">
        <Lock className="h-6 w-6" />
      </div>
      <h1 className="mt-5 text-3xl font-black text-white">{title}</h1>
      <p className="mt-4 text-sm leading-7 text-slate-300">{description}</p>
      <Link
        href={renewHref}
        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary-blue px-5 py-3 text-sm font-semibold text-white hover:bg-primary-blue/90"
      >
        <RefreshCcw className="h-4 w-4" />
        Renew subscription
      </Link>
    </div>
  );
}
