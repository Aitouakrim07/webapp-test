"use client";
import { IconAlertTriangle } from "@tabler/icons-react";

// Props 
interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string; // Name of the item being deleted
  itemType?: string; // Type of item (e.g., "UCPE", "Container", etc.)
  disabled?: boolean;
}

export default function DeleteConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  itemName, 
  itemType = "item",
  disabled = false
}: DeleteConfirmModalProps) {
  // Don't render if not open
  if (!isOpen) return null;

  // Handle confirm click
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <div className="modal modal-blur show d-block" tabIndex={-1}>
      <div className="modal-dialog modal-sm modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Confirm Delete</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
              disabled={disabled}
            />
          </div>
          <div className="modal-body">
            <div className="text-center">
              {/* Warning icon */}
              <IconAlertTriangle 
                className="icon mb-2 text-danger icon-lg" 
                size={48}
              />
              <h3>Are you sure?</h3>
              <div className="text-muted">
                Do you really want to delete <strong>{itemName}</strong>? 
                This {itemType} will be permanently removed.
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <div className="w-100">
              <div className="row">
                <div className="col">
                  <button 
                    className="btn btn-white w-100" 
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                </div>
                <div className="col">
                  <button 
                    className="btn btn-danger w-100" 
                    onClick={handleConfirm}
                    disabled={disabled}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};