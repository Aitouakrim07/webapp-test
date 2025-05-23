import Header from "../ui/common/Header";
import users from "@/lib/placeholder-data";
import Sidebar from "../ui/common/Sidebar";
import Footer from "../ui/common/Footer";

export default function Layout({ children }: { children: React.ReactNode }) {
  const userName = users[0].name;
  return (
    <>
      <script src="https://cdn.jsdelivr.net/npm/@tabler/core@1.3.2/dist/js/tabler.min.js"></script>
      <div className="page app-content">
        <Sidebar />
        <Header userName={userName} />
        <div className="page-wrapper">
          <div className="container-fluid p-3">{children}</div>
          <Footer />
        </div>
      </div>
    </>
  );
}
