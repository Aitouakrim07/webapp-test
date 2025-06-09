"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { IconPlus } from "@tabler/icons-react";
import { UCPE, Status } from "@/app/generated/prisma";
import UCPEFormModal from "./UCPEFormModal";
import clsx from "clsx";
import UCPEStatusBadge from "./UCPEStatusBadge";

interface Props {
  ucpes: UCPE[];
}

export default function UCPEManagement({ ucpes }: Props) {
  // --- Hooks ---
  const router = useRouter(); // router for navigation
  const pathname = usePathname(); // get the current URL path for active state highlighting

  // --- State ---
  const [isFormOpen, setFormOpen] = useState(false);

  // --- Handlers ---

  // Opens the UCPEFormModal in 'add' mode.
  const handleOpenAddModal = () => {
    setFormOpen(true);
  };

  // Closes the UCPEFormModal. This is passed down to the modal component.
  const handleCloseFormModal = () => {
    setFormOpen(false);
  };

  // Navigates to the detail page for a specific uCPE.
  const handleRowClick = (ucpeId: string) => {
    router.push(`/dashboard/ucpes/${ucpeId}`);
  };

  return (
    <>
      {/* Page Header */}
      <div className="page-header d-print-none mb-3">
        <div className="row align-items-center">
          <div className="col">
            <h1 className="page-title">uCPE Devices</h1>
          </div>
          {/* Add uCPE Button */}
          <div className="col-auto ms-auto">
            <button
              className="btn btn-primary me-2"
              onClick={handleOpenAddModal}
            >
              <IconPlus size={18} /> Add uCPE
            </button>
          </div>
        </div>
      </div>

      {/* uCPE List Table */}
      <div className="table-responsive">
        <table className="table card-table table-vcenter text-nowrap">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {ucpes.map((u) => {
              // Determine if the current row corresponds to the active page
              const isActive = pathname === `/dashboard/ucpes/${u.id}`;
              return (
                <tr
                  key={u.id}
                  // Apply 'table-active' class if the row is for the current page
                  className={isActive ? "table-active" : ""}
                  // Navigate on click
                  onClick={() => handleRowClick(u.id)}
                  style={{ cursor: "pointer" }}
                >
                  <td className="text-truncate" style={{ maxWidth: "150px" }}>
                    {u.name}
                  </td>
                  <td>
                    <UCPEStatusBadge status={u.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add uCPE Modal */}
      {isFormOpen && (
        <UCPEFormModal
          isOpen={isFormOpen}
          onClose={handleCloseFormModal}
          ucpe={null} // Pass null for 'ucpe' because we are in 'add' mode
          mode={"add"}
        />
      )}
    </>
  );
}
