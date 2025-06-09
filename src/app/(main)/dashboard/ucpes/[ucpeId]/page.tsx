// src/app/(main)/dashboard/ucpes/[ucpeId]/page.tsx
// Enhanced uCPE detail page with frp port information

import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconPlayerPlay, IconTerminal, IconInfoCircle } from "@tabler/icons-react";
import UcpeDetailClientPart from "@/app/ui/ucpeUI/UcpeDetailClientPart";
import { Status } from "@/app/generated/prisma";
import UCPEStatusBadge from "@/app/ui/ucpeUI/UCPEStatusBadge";

interface UcpeDetailProps {
  params: Promise<{ ucpeId: string }>;
}

export default async function UcpeDetail({ params }: UcpeDetailProps) {
  const ucpeId = (await params).ucpeId;
  
  // Fetch uCPE with all necessary information
  const ucpe = await prisma.uCPE.findUnique({ 
    where: { id: ucpeId },
    select: {
      id: true,
      name: true,
      ipAddress: true,
      location: true,
      status: true,
      frpPort: true,        // Include frp port information
      lastSeen: true,
      createdAt: true,
      updatedAt: true,
    }
  });

  if (!ucpe) {
    notFound();
  }

  // Determine terminal availability
  const canAccessTerminal = ucpe.status === Status.ONLINE && ucpe.frpPort !== null;
  const terminalUnavailableReason = 
    ucpe.status !== Status.ONLINE 
      ? "uCPE is offline" 
      : !ucpe.frpPort 
      ? "No frp port configured" 
      : null;

  // Generate SSH command for manual access (if frp port exists)
  const sshCommand = ucpe.frpPort 
    ? `ssh -p ${ucpe.frpPort} ouakrim@lab0.myitcrew.io`
    : null;

  return (
    <div className="p-4">
      {/* Header Section */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap">
        <h2 className="h4 mb-2 mb-md-0 me-3">{ucpe.name} Details</h2>
        <div className="d-flex align-items-center">
          {/* Terminal Button */}
          {canAccessTerminal ? (
            <Link
              href={`/dashboard/ucpes/${ucpeId}/terminal`}
              className="btn btn-sm btn-success me-2"
              title="Open Web Terminal"
            >
              <IconPlayerPlay size={16} className="me-1" />
              Terminal
            </Link>
          ) : (
            <button
              className="btn btn-sm btn-secondary me-2"
              title={`Terminal unavailable: ${terminalUnavailableReason}`}
              disabled
            >
              <IconPlayerPlay size={16} className="me-1" />
              Terminal ({terminalUnavailableReason})
            </button>
          )}
          
          {/* Edit/Delete Buttons */}
          <UcpeDetailClientPart ucpe={ucpe} />
        </div>
      </div>

      {/* Information Cards */}
      <div className="row">
        {/* Device Information Card */}
        <div className="col-md-6 mb-3">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title mb-3">Device Information</h5>
              <p className="mb-2">
                <strong>Status:</strong>{" "}
                <UCPEStatusBadge status={ucpe.status} />
              </p>
              <p className="mb-2">
                <strong>IP Address:</strong> {ucpe.ipAddress}
              </p>
              <p className="mb-0">
                <strong>Location:</strong> {ucpe.location}
              </p>
            </div>
          </div>
        </div>

        {/* Remote Access Information Card */}
        <div className="col-md-6 mb-3">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title mb-3">
                <IconTerminal size={20} className="me-2" />
                Remote Access
              </h5>
              
              {ucpe.frpPort ? (
                <>
                  <p className="mb-2">
                    <strong>frp Port:</strong> 
                    <span className="badge bg-blue-lt ms-2">{ucpe.frpPort}</span>
                  </p>
                  <p className="mb-2">
                    <strong>SSH Access:</strong>
                  </p>
                  <div className="mb-2">
                    <code className="bg-light p-2 rounded d-block small">
                      {sshCommand}
                    </code>
                  </div>
                  
                  {/* Web Terminal Status */}
                  <div className="d-flex align-items-center">
                    <strong className="me-2">Web Terminal:</strong>
                    {canAccessTerminal ? (
                      <span className="badge bg-green-lt">Available</span>
                    ) : (
                      <span className="badge bg-red-lt">
                        Unavailable ({terminalUnavailableReason})
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-muted">
                  <IconInfoCircle size={16} className="me-1" />
                  No remote access configured. 
                  <br />
                  Edit this uCPE to assign an frp port for terminal access.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Timestamps Card */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title mb-3">Timestamps</h5>
              <div className="row">
                <div className="col-md-4">
                  <p className="mb-1">
                    <strong>Last Seen:</strong>
                    <br />
                    <span className="text-muted">
                      {ucpe.lastSeen.toLocaleString()}
                    </span>
                  </p>
                </div>
                <div className="col-md-4">
                  <p className="mb-1">
                    <strong>Created At:</strong>
                    <br />
                    <span className="text-muted">
                      {ucpe.createdAt.toLocaleString()}
                    </span>
                  </p>
                </div>
                <div className="col-md-4">
                  <p className="mb-1">
                    <strong>Updated At:</strong>
                    <br />
                    <span className="text-muted">
                      {ucpe.updatedAt.toLocaleString()}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* frp Configuration Helper */}
      {ucpe.frpPort && (
        <div className="row mt-3">
          <div className="col-12">
            <div className="alert alert-info">
              <h6 className="alert-heading">
                <IconInfoCircle size={18} className="me-1" />
                frp Configuration for uCPE Device
              </h6>
              <p className="mb-2">
                This uCPE is configured for remote access through frp port <strong>{ucpe.frpPort}</strong>.
              </p>
              <p className="mb-0">
                <strong>To configure frpc on your uCPE device:</strong>
                <br />
                1. Install frpc on the uCPE device
                <br />
                2. Configure frpc.toml with server: <code>lab0.myitcrew.io:7000</code> and remote port: <code>{ucpe.frpPort}</code>
                <br />
                3. Ensure SSH service is running on the uCPE
                <br />
                4. Start frpc service to establish connection
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}