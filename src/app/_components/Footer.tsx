import Link from "next/link";

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-teal-100/70 bg-white/50 px-4 py-6 text-sm text-gray-600">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 sm:justify-start">
          <Link href="/" className="font-semibold hover:text-gray-900">
            Carpool
          </Link>
          <Link href="/guides/line-carpool-management" className="hover:text-gray-900 underline underline-offset-4">
            配車管理ガイド
          </Link>
        </div>
        <div>
          お問い合わせ:{" "}
          <a
            href="mailto:carpool.app.2026@gmail.com"
            className="hover:text-gray-900 underline"
          >
            carpool.app.2026@gmail.com
          </a>
        </div>
      </div>
    </footer>
  );
};
