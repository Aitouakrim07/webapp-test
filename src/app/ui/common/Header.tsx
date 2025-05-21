// src/components/common/Header.tsx

import { IconBell, IconMoon, IconSun, IconUser } from "@tabler/icons-react";

interface HeaderProps {
  userName: string;
}

const Header = ({ userName }: HeaderProps) => {
  return (
    <header className="navbar navbar-expand-md d-none d-lg-flex d-print-none">
      <div className="container-fluid navbar-nav flex-row order-md-last justify-content-end pe-2">
        <div className="nav-item me-2">
          <button className="nav-link px-0" title={""}>
            {<IconMoon size={24} />}
          </button>
        </div>

        <div className="nav-item dropdown me-2">
          <a
            href="#"
            className="nav-link px-0"
            data-bs-toggle="dropdown"
            tabIndex={-1}
            aria-label="Show notifications"
          >
            <IconBell size={24} />
            <span className="badge bg-red"></span>
          </a>
          <div className="dropdown-menu dropdown-menu-end dropdown-menu-card">
            <div className="card">
              <div className="card-body">
                <div className="text-center">No new notifications</div>
              </div>
            </div>
          </div>
        </div>

        <div className="nav-item dropdown">
          <a
            href="#"
            className="nav-link d-flex lh-1 text-reset p-0"
            data-bs-toggle="dropdown"
            aria-label="Open user menu"
          >
            <div className="d-xl-block ps-2">
              <div>{userName}</div>
              <div className="mt-1 small text-muted">Administrator</div>
            </div>
            <span className="avatar avatar-sm ms-2">
              <IconUser size={24} />
            </span>
          </a>
          <div className="dropdown-menu dropdown-menu-end dropdown-menu-arrow">
            <a href="#" className="dropdown-item">
              Profile
            </a>
            <a href="#" className="dropdown-item">
              Settings
            </a>
            <div className="dropdown-divider"></div>
            <button className="dropdown-item">Logout</button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
