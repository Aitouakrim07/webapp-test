// src/components/common/Sidebar.tsx
"use client";

import {
  IconHome,
  IconServer,
  IconUsers,
  IconApps,
  IconSettings,
} from "@tabler/icons-react";
import { useState } from "react";
import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);
  const handleCollapseClick = () => {
    setCollapsed(!collapsed);
  };

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
    <aside
      className="navbar navbar-vertical navbar-expand-lg"
      data-bs-theme="dark"
    >
      <div className="container-fluid">
        <button
          className="navbar-toggler"
          type="button"
          onClick={handleCollapseClick}
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <h1 className="navbar-brand navbar-brand-autodark p-3">
          <a href="#">
            <Image
              src="/logo_myitcrew.png"
              alt="MY IT CREW"
              width={2193}
              height={283}
              className="navbar-brand-image"
            />
          </a>
        </h1>

        <div
          className={clsx("navbar-collapse", {
            collapse: collapsed,
          })}
          id="sidebar-menu"
        >
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
      </div>
    </aside>
  );
}
