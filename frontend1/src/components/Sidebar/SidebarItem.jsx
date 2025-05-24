import Link from "next/link";

export default function SidebarItem({ icon, label, href }) {
  return (
    <Link href={href} className="flex items-center p-3 hover:bg-gray-100">
      <span className="mr-3">{icon}</span>
      {label}
    </Link>
  );
} 