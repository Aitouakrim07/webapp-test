// src/app/ui/ucpeUI/UCPEFormModal.tsx
// Enhanced uCPE form modal with frp port configuration

"use client";

import { createUCPE, updateUCPE } from "@/app/(main)/dashboard/ucpes/actions";
import { Status } from "@/app/generated/prisma";
import { useState, useEffect, useTransition } from "react";

// Base data structure for uCPE
type UCPEPayload = {
  name: string;
  ipAddress: string;
  location: string;
  status: Status;
  autoAssignFrpPort?: boolean;  // Whether to automatically assign frp port
  frpPort?: number | null;      // Specific frp port number (can be null)
};

// Extended interface for editing (includes additional fields)
export interface UCPEForEdit extends UCPEPayload {
  id: string;
  lastSeen: string;             // Date as string for serialization
  frpPort?: number | null;      // Existing frp port assignment
}

// Component props interface
interface Props {
  isOpen: boolean;              // Controls modal visibility
  onClose: () => void;          // Callback when modal should close
  ucpe?: UCPEForEdit | null;    // uCPE data for editing (null for add mode)
  mode: "add" | "edit";         // Form mode
}

export default function UCPEFormModal({ isOpen, onClose, ucpe, mode }: Props) {
  const [isPending, startTransition] = useTransition();

  // --- Form State ---
  const [formData, setFormData] = useState<UCPEPayload>({
    name: "",
    ipAddress: "",
    location: "",
    status: Status.OFFLINE,
    autoAssignFrpPort: true,      // Default to auto-assign
    frpPort: undefined,
  });

  // Track frp port configuration mode
  const [frpPortMode, setFrpPortMode] = useState<'auto' | 'manual' | 'none'>('auto');

  // --- Effects ---

  /**
   * Sync form data with ucpe prop when modal opens or mode changes
   */
  useEffect(() => {
    if (mode === "edit" && ucpe) {
      // Edit mode: pre-fill form with existing uCPE data
      setFormData({
        name: ucpe.name,
        ipAddress: ucpe.ipAddress,
        location: ucpe.location,
        status: ucpe.status as Status,
        autoAssignFrpPort: !!ucpe.frpPort,  // Convert to boolean
        frpPort: ucpe.frpPort || undefined,
      });
      
      // Set frp port mode based on existing configuration
      if (ucpe.frpPort) {
        setFrpPortMode('manual');  // Has specific port
      } else {
        setFrpPortMode('none');    // No frp port assigned
      }
    } else if (mode === "add") {
      // Add mode: reset to default values
      setFormData({
        name: "",
        ipAddress: "",
        location: "",
        status: Status.OFFLINE,
        autoAssignFrpPort: true,
        frpPort: undefined,
      });
      setFrpPortMode('auto');  // Default to auto-assign for new uCPEs
    }
  }, [isOpen, mode, ucpe]);

  // --- Event Handlers ---

  /**
   * Handle changes to regular form inputs
   */
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value, type } = e.target;
    
    if (name === "status") {
      // Handle status enum conversion
      setFormData((prev) => ({ ...prev, status: value as Status }));
    } else if (name === "frpPort") {
      // Handle port number conversion
      const numValue = value ? parseInt(value, 10) : undefined;
      setFormData((prev) => ({ ...prev, frpPort: numValue }));
    } else if (type === "checkbox") {
      // Handle checkbox inputs
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      // Handle text inputs
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  }

  /**
   * Handle frp port mode changes (auto/manual/none)
   */
  function handleFrpPortModeChange(mode: 'auto' | 'manual' | 'none') {
    setFrpPortMode(mode);
    
    switch (mode) {
      case 'auto':
        // Auto-assign next available port
        setFormData(prev => ({ 
          ...prev, 
          autoAssignFrpPort: true, 
          frpPort: undefined 
        }));
        break;
      case 'manual':
        // User specifies port manually
        setFormData(prev => ({ 
          ...prev, 
          autoAssignFrpPort: false, 
          frpPort: prev.frpPort || 2001  // Default to 2001 if no port set
        }));
        break;
      case 'none':
        // No frp port assignment
        setFormData(prev => ({ 
          ...prev, 
          autoAssignFrpPort: false, 
          frpPort: undefined 
        }));
        break;
    }
  }

  /**
   * Handle form submission
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Prepare data based on frp port mode
    const submitData = {
    ...formData,
    autoAssignFrpPort: frpPortMode === 'auto',
    frpPort: frpPortMode === 'manual' ? (formData.frpPort ?? undefined) : undefined,
  };

    // Submit using server action
    startTransition(async () => {
      const res = mode === "add"
        ? await createUCPE(submitData)
        : await updateUCPE(ucpe!.id, submitData);

      if (res.success) {
        console.log(`uCPE ${mode === 'add' ? 'created' : 'updated'} successfully:`, res.message);
        onClose(); // Close modal on success
      } else {
        alert("Error: " + res.error); // Show error to user
      }
    });
  }

  // Don't render if modal is not open
  if (!isOpen) return null;

  return (
    <div className="modal modal-blur show d-block" tabIndex={-1}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content">
          {/* Modal Header */}
          <div className="modal-header">
            <h5 className="modal-title">
              {mode === "add" ? "Add New uCPE" : "Edit uCPE"}
            </h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>

          {/* Modal Body with Form */}
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="row">
                {/* Left Column - Basic Info */}
                <div className="col-md-6">
                  {/* Device Name */}
                  <div className="mb-3">
                    <label className="form-label">Device Name</label>
                    <input
                      type="text"
                      className="form-control"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g., Edge Device 001"
                      required
                    />
                  </div>

                  {/* IP Address */}
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
                      placeholder="192.168.1.100"
                      required
                    />
                  </div>

                  {/* Location */}
                  <div className="mb-3">
                    <label className="form-label">Location</label>
                    <input
                      type="text"
                      className="form-control"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="e.g., Remote Site A"
                      required
                    />
                  </div>
                </div>

                {/* Right Column - Status and frp Config */}
                <div className="col-md-6">
                  {/* Status */}
                  <div className="mb-3">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                    >
                      {Object.values(Status).map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* frp Port Configuration */}
                  <div className="mb-3">
                    <label className="form-label">
                      Remote Terminal Access (frp) 
                      <span className="text-muted ms-1">- Optional</span>
                    </label>
                    <div className="card">
                      <div className="card-body">
                        {/* Auto-assign option */}
                        <div className="mb-3">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="radio"
                              name="frpPortMode"
                              id="frpAuto"
                              checked={frpPortMode === 'auto'}
                              onChange={() => handleFrpPortModeChange('auto')}
                            />
                            <label className="form-check-label" htmlFor="frpAuto">
                              <strong>Auto-assign port</strong>
                            </label>
                            <div className="form-text">
                              Automatically assign next available port (2001-9999)
                            </div>
                          </div>
                        </div>

                        {/* Manual port option */}
                        <div className="mb-3">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="radio"
                              name="frpPortMode"
                              id="frpManual"
                              checked={frpPortMode === 'manual'}
                              onChange={() => handleFrpPortModeChange('manual')}
                            />
                            <label className="form-check-label" htmlFor="frpManual">
                              <strong>Specify port manually</strong>
                            </label>
                          </div>
                          
                          {/* Port input (shown only in manual mode) */}
                          {frpPortMode === 'manual' && (
                            <div className="mt-2">
                              <input
                                type="number"
                                className="form-control"
                                name="frpPort"
                                value={formData.frpPort || ''}
                                onChange={handleChange}
                                min="2001"
                                max="9999"
                                placeholder="e.g., 2001"
                                required
                              />
                              <div className="form-text">
                                Port range: 2001-9999
                              </div>
                            </div>
                          )}
                        </div>

                        {/* No frp option */}
                        <div className="mb-0">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="radio"
                              name="frpPortMode"
                              id="frpNone"
                              checked={frpPortMode === 'none'}
                              onChange={() => handleFrpPortModeChange('none')}
                            />
                            <label className="form-check-label" htmlFor="frpNone">
                              <strong>No remote access</strong>
                            </label>
                            <div className="form-text">
                              Terminal access will not be available
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Information Alert */}
              <div className="alert alert-info">
                <h6 className="alert-heading">ℹ️ Remote Access Information</h6>
                <p className="mb-0">
                  frp (Fast Reverse Proxy) enables SSH terminal access to uCPE devices 
                  behind NAT/firewall. Each uCPE needs a unique port for remote access.
                  {frpPortMode === 'manual' && formData.frpPort && (
                    <>
                      <br />
                      <strong>SSH Command:</strong> <code>
                        ssh -p {formData.frpPort} ouakrim@lab0.myitcrew.io
                      </code>
                    </>
                  )}
                  {frpPortMode === 'auto' && (
                    <>
                      <br />
                      <strong>Port will be assigned automatically after creation.</strong>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
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
                {isPending
                  ? "Saving…"
                  : mode === "add"
                  ? "Add uCPE"
                  : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}