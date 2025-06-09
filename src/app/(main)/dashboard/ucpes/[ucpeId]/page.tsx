import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconPlayerPlay } from "@tabler/icons-react";
import UcpeDetailClientPart from "@/app/ui/ucpeUI/UCPEDetailClientPart";
import { Status } from "@/app/generated/prisma";
import UCPEStatusBadge from "@/app/ui/ucpeUI/UCPEStatusBadge";

interface UcpeDetailProps {
  params: { ucpeId: string };
}

export default async function UcpeDetail({ params }: UcpeDetailProps) {
  const ucpeId = (await params).ucpeId;
  const ucpe = await prisma.uCPE.findUnique({ where: { id: ucpeId } });

  if (!ucpe) {
    notFound();
  }

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap">
        <h2 className="h4 mb-2 mb-md-0 me-3">{ucpe.name} Details</h2>
        <div className="d-flex align-items-center">
          {ucpe.status === Status.ONLINE ? (
            <Link
              href={`/dashboard/ucpes/${ucpeId}/terminal`}
              className="btn btn-sm btn-success me-2"
              title="Open Terminal"
            >
              <IconPlayerPlay size={16} className="me-1" />
              Terminal
            </Link>
          ) : (
            <button
              className="btn btn-sm btn-secondary me-2"
              title="Terminal unavailable (UCPE is offline)"
              disabled
            >
              <IconPlayerPlay size={16} className="me-1" />
              Terminal (Offline)
            </button>
          )}
          <UcpeDetailClientPart ucpe={ucpe} />
        </div>
      </div>

      <div className="row">
        <div className="col-md-6 mb-3">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title mb-3">Device Information</h5>
              <p className="mb-1">
                <strong>Status:</strong>{" "}
                <UCPEStatusBadge status={ucpe.status} />
              </p>
              <p className="mb-1">
                <strong>IP Address:</strong> {ucpe.ipAddress}
              </p>
              <p className="mb-0">
                <strong>Location:</strong> {ucpe.location}
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-6 mb-3">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title mb-3">Timestamps</h5>
              <p className="mb-1">
                <strong>Last Seen:</strong> {ucpe.lastSeen.toLocaleString()}
              </p>
              <p className="mb-1">
                <strong>Created At:</strong> {ucpe.createdAt.toLocaleString()}
              </p>
              <p className="mb-0">
                <strong>Updated At:</strong> {ucpe.updatedAt.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
