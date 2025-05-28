import Image from "next/image";

export default function SidebarBrand() {
  return (
    <h1 className="navbar-brand navbar-brand-autodark p-3">
      <a href="#">
        <Image
          src="/logo-edger.png"
          alt="MY IT CREW"
          width={1024}
          height={1024}
          className="navbar-brand-image"
        />
      </a>
    </h1>
  );
}
