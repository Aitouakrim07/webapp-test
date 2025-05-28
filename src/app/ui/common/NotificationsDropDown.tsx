import { IconBell } from "@tabler/icons-react";

export default function NotificationsDropDown() {
  return (
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
  );
}
