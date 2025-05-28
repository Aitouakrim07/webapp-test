export default function SidebarToggler() {
  return (
    <button
      className="navbar-toggler collapsed"
      type="button"
      data-bs-toggle="collapse"
      data-bs-target="#sidebar-menu"
      aria-controls="sidebar-menu"
    >
      <span className="navbar-toggler-icon"></span>
    </button>
  );
}
