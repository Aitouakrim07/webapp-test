import SidebarToggler from "./SidebarToggler";
import SidebarBrand from "./SidebarBrand";
import SidebarUserDropDown from "./SidebarUserDropDown";
import SidebarMenuItems from "./SidebarMenuItems";

export default async function Sidebar() {
  return (
    <aside
      className="navbar navbar-vertical navbar-expand-lg"
      data-bs-theme="dark"
    >
      <div className="container-fluid">
        <SidebarToggler />
        <SidebarBrand />
        <SidebarUserDropDown />
        <SidebarMenuItems />
      </div>
    </aside>
  );
}
