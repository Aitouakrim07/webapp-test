"use server";
import Header from "../ui/common/Header";
import Sidebar from "../ui/common/Sidebar";
import Footer from "../ui/common/Footer";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="page app-content">
        <Sidebar />
        <Header />
        <div className="page-wrapper">
          <div className="container-fluid p-3">{children}</div>
          <Footer />
        </div>
      </div>
    </>
  );
}
