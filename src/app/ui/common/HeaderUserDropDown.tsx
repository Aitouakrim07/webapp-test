"use server";
import { signout } from "@/lib/actions";
import { auth } from "@/auth";
import { IconUser } from "@tabler/icons-react";

export default async function SidebarUserDropDown() {
  const session = await auth();
  return (
    <div className="nav-item dropdown">
      <div
        className="nav-link d-flex lh-1 text-reset p-0"
        data-bs-toggle="dropdown"
        aria-label="Open user menu"
      >
        <div className="d-xl-block ps-2">
          <div>{session?.user?.name}</div>
          <div className="mt-1 small text-muted">Administrator</div>
        </div>
        <span className="avatar avatar-sm ms-2">
          <IconUser size={24} />
        </span>
      </div>
      <div className="dropdown-menu dropdown-menu-end dropdown-menu-arrow">
        <a href="#" className="dropdown-item">
          Profile
        </a>
        <a href="#" className="dropdown-item">
          Settings
        </a>
        <div className="dropdown-divider"></div>
        <form
          className="dropdown-item d-flex align-items-center"
          action={signout}
        >
          <button className="dropdown-item p-0">Sign out</button>
        </form>
      </div>
    </div>
  );
}
