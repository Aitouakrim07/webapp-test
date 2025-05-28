"use client";

import {
  IconHome,
  IconServer,
  IconUsers,
  IconApps,
  IconSettings,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export default function SidebarMenuItems() {
  const pathname = usePathname();
  const links = [
    {
      name: "dashboard",
      path: "/dashboard",
      icon: <IconHome />,
      label: "Dashboard",
    },
    {
      name: "ucpes",
      path: "/dashboard/ucpes",
      icon: <IconServer />,
      label: "My UCPEs",
    },
    {
      name: "containers",
      path: "/dashboard/containers",
      icon: <IconApps />,
      label: "My Containers",
    },
    {
      name: "users",
      path: "/dashboard/users",
      icon: <IconUsers />,
      label: "Users Management",
    },
    {
      name: "settings",
      path: "/dashboard/settings",
      icon: <IconSettings />,
      label: "Settings",
    },
  ];

  return (
    <div className="navbar-collapse collapse" id="sidebar-menu">
      <ul className="navbar-nav pt-lg-3">
        {links.map((link) => (
          <li
            key={link.path}
            className={clsx("nav-item", { active: pathname === link.path })}
          >
            <Link key={link.name} href={link.path} className="nav-link">
              <span className="nav-link-icon">{link.icon}</span>
              <span className="nav-link-title">{link.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
