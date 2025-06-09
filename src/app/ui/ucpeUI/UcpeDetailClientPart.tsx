"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UCPE } from "@/app/generated/prisma";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import UCPEFormModal from "./UCPEFormModal";
import DeleteConfirmModal from "../common/DeleteConfirmModal";
import { deleteUCPE as serverDeleteUCPE } from "../../(main)/dashboard/ucpes/actions";

interface UcpeDetailClientPartProps {
  ucpe: UCPE;
}

export default function UcpeDetailClientPart({
  ucpe,
}: UcpeDetailClientPartProps) {
  // --- Hooks ---
  const router = useRouter(); // For navigation (used after deletion).
  const [isDeletePending, startDeleteTransition] = useTransition(); // For pending UI state during deletion.

  // --- State ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // --- Handlers ---

  // Opens the UCPEFormModal for editing.
  const handleOpenEditModal = () => setIsEditModalOpen(true);

  // Closes the UCPEFormModal. This is called by the modal when it's done.
  const handleCloseEditModal = () => setIsEditModalOpen(false);

  // Opens the DeleteConfirmModal.
  const handleOpenDeleteModal = () => setIsDeleteModalOpen(true);

  // Closes the DeleteConfirmModal.
  const handleCloseDeleteModal = () => setIsDeleteModalOpen(false);

  // Confirms and executes the deletion of the uCPE.
  // This function is passed to the DeleteConfirmModal.
  const handleConfirmDelete = () => {
    startDeleteTransition(async () => {
      try {
        await serverDeleteUCPE(ucpe.id);
        // On successful deletion, navigate back to the uCPE list.
        router.push("/dashboard/ucpes");
      } catch (error) {
        console.error("Failed to delete UCPE:", error);
      }
      // Close the modal, especially useful if the navigation or deletion fails.
      handleCloseDeleteModal();
    });
  };

  // The UCPEFormModal expects Date objects to be strings for serialization.
  const ucpeForForm = {
    ...ucpe,
    lastSeen: ucpe.lastSeen.toISOString(),
    createdAt: ucpe.createdAt.toISOString(),
    updatedAt: ucpe.updatedAt.toISOString(),
  };

  return (
    <>
      {/* Edit Button */}
      <button
        onClick={handleOpenEditModal}
        className="btn btn-sm btn-outline-primary me-2"
        title="Update UCPE"
      >
        <IconEdit size={16} />
      </button>
      {/* Delete Button */}
      <button
        onClick={handleOpenDeleteModal}
        className="btn btn-sm btn-outline-danger"
        title="Delete UCPE"
        disabled={isDeletePending} // Disable button while deletion is in progress.
      >
        <IconTrash size={16} />
      </button>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <UCPEFormModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          ucpe={ucpeForForm}
          mode="edit"
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={handleCloseDeleteModal}
          onConfirm={handleConfirmDelete}
          itemName={ucpe.name}
          itemType="UCPE"
          disabled={isDeletePending}
        />
      )}
    </>
  );
}
