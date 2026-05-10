import Link from "next/link";
import { Plus } from "lucide-react";

interface NewButtonProps {
  href: string;
}

export const NewButton: React.FC<NewButtonProps> = ({
  href,
}) => {
  return (
    <Link 
      href={href} 
      className="group inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-teal-600/20 bg-gradient-to-br from-teal-700 via-teal-700 to-teal-900 px-5 py-2.5 text-sm font-bold text-white shadow-[0_14px_34px_rgba(15,118,110,0.22)] ring-1 ring-white/30 transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(15,118,110,0.28)] focus:outline-none focus:ring-4 focus:ring-teal-700/20"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/15 transition group-hover:bg-white/25">
        <Plus size={14} strokeWidth={2.5} />
      </span>
      新規作成
    </Link>
  );
};
