import Link from "next/link";

interface NewButtonProps {
  href: string;
}

export const NewButton: React.FC<NewButtonProps> = ({
  href,
}) => {
  return (
    <Link 
      href={href} 
      className="bg-[#2f6f68] text-white px-4 py-2 rounded-lg hover:bg-[#2a5f5a]"
    >
      ＋ 新規作成
    </Link>
  );
};