// src/components/common/Header.tsx

"use server";

import DarkModeIcon from "./DarkModeIcon";
import NotificationsDropDown from "./NotificationsDropDown";
import HeaderUserDropDown from "./HeaderUserDropDown";

export default async function Header() {
  return (
    <header className="navbar navbar-expand-md d-none d-lg-flex d-print-none">
      <div className="container-fluid navbar-nav flex-row order-md-last justify-content-end pe-2">
        <DarkModeIcon />
        <NotificationsDropDown />
        <HeaderUserDropDown />
      </div>
    </header>
  );
}
