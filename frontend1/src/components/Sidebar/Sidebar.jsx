import SidebarItem from "./SidebarItem.jsx";
import { FaHome, FaUser, FaCog } from "react-icons/fa";

export default function Sidebar() {
  return (
    <aside className="w-64 h-screen bg-white shadow-lg flex flex-col">
      <div className="p-4 font-bold text-xl">My Dashboard</div>
      <SidebarItem icon={<FaHome />} label="Home" href="/dashboard" />
      <SidebarItem icon={<FaUser />} label="Profile" href="/dashboard/profile" />
      <SidebarItem icon={<FaCog />} label="Settings" href="/dashboard/settings" />
    </aside>
  );
} 