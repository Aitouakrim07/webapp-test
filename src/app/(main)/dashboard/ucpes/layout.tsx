import prisma from "@/lib/prisma";
import UCPEManagement from "@/app/ui/ucpeUI/UCPEManagement";
import { ReactNode } from "react";

// This is a Server Component, since it uses `await` to fetch data
export default async function UcpesLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Fetch all uCPEs for the left pane
  const ucpes = await prisma.uCPE.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="d-flex vh-100">
      {/* Left pane: uCPE list */}
      <aside className="border-end" style={{ width: "50%", overflowY: "auto" }}>
        <UCPEManagement ucpes={ucpes} />
      </aside>

      {/* Right pane: dynamic content (details and features) */}
      <section className="flex-fill overflow-auto">{children}</section>
    </div>
  );
}
