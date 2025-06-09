"use client";

import { createUCPE, updateUCPE } from "@/app/(main)/dashboard/ucpes/actions";
import { Status } from "@/app/generated/prisma";
import { useRouter } from "next/navigation";
import { useState, useEffect, useTransition } from "react";

type UCPEPayload = {
  name: string;
  ipAddress: string;
  location: string;
  status: Status;
};

export interface UCPEForEdit extends UCPEPayload {
  id: string;
  lastSeen: string;
}

/**
 * Props for the UCPEFormModal component.
 * @property isOpen - Controls whether the modal is visible.
 * @property onClose - Function to call when the modal should be closed.
 * @property ucpe - The uCPE object to be edited. Should be null for 'add' mode.
 * @property mode - Determines if the modal is for adding or editing a uCPE.
 */
interface Props {
  isOpen: boolean;
  onClose: () => void;
  ucpe?: UCPEForEdit | null;
  mode: "add" | "edit";
}

export default function UCPEFormModal({ isOpen, onClose, ucpe, mode }: Props) {
  const [isPending, startTransition] = useTransition();

  // --- State ---
  // Holds the current data of the form fields.
  const [formData, setFormData] = useState<UCPEPayload>({
    name: "",
    ipAddress: "",
    location: "",
    status: Status.OFFLINE,
  });

  // --- Effects ---
  // This effect synchronizes the form data with the `ucpe` prop.
  // When the modal is opened in 'edit' mode, it pre-fills the form with the uCPE's data.
  // When in 'add' mode, it resets the form to default values.
  useEffect(() => {
    if (mode === "edit" && ucpe) {
      setFormData({
        name: ucpe.name,
        ipAddress: ucpe.ipAddress,
        location: ucpe.location,
        status: ucpe.status as Status,
      });
    } else if (mode === "add") {
      setFormData({
        name: "",
        ipAddress: "",
        location: "",
        status: Status.OFFLINE,
      });
    }
  }, [isOpen, mode, ucpe]);

  // --- Handlers ---
  // A generic handler for updating form state when an input value changes.
  // It works for both text inputs and select dropdowns.
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    // Special handling for the 'status' enum to ensure type correctness.
    if (name === "status") {
      setFormData((prev) => ({ ...prev, status: value as Status }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  }

  // Calls the appropriate server action (create or update).
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); // prevent the default form submission behavior.

    // `startTransition` wraps the async operation, setting `isPending` to true
    // while the server action is running.
    startTransition(async () => {
      // Conditionally call the server action based on the mode.
      const res =
        mode === "add"
          ? await createUCPE(formData)
          : await updateUCPE(ucpe!.id, formData);

      // After the action completes, close the modal if it was successful.
      if (res.success) {
        onClose();
      } else {
        alert("Error: " + (res as unknown as { error: unknown }).error);
      }
    });
  }

  // Do not render the modal if it's not open.
  if (!isOpen) return null;

  return (
    <div className="modal modal-blur show d-block" tabIndex={-1}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              {mode === "add" ? "Add New UCPE" : "Edit UCPE"}
            </h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {/* Name Input */}
              <div className="mb-3">
                <label className="form-label">Device Name</label>
                <input
                  type="text"
                  className="form-control"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* IP Address Input */}
              <div className="mb-3">
                <label className="form-label">IP Address</label>
                <input
                  type="text"
                  className="form-control"
                  name="ipAddress"
                  value={formData.ipAddress}
                  onChange={handleChange}
                  pattern="^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
                  title="Valid IPv4 address, e.g. 192.168.1.10"
                  required
                />
              </div>

              {/* Location Input */}
              <div className="mb-3">
                <label className="form-label">Location</label>
                <input
                  type="text"
                  className="form-control"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Status Select Dropdown */}
              <div className="mb-3">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  {Object.values(Status).map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isPending}
              >
                {/* Dynamically change button text based on pending state and mode */}
                {isPending
                  ? "Saving…"
                  : mode === "add"
                  ? "Add UCPE"
                  : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
