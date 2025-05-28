import Link from "next/link";

export default function SidebarItem({ icon, label, href }) {
  return (
    <Link href={href} className="sidebar-link">
      <span className="icon">{icon}</span>
      {label}
    </Link>
  );
} 