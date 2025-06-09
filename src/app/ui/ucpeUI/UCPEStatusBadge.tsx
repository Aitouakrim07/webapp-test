"use client";

import { Status } from "@/app/generated/prisma";
import clsx from "clsx";

export default function UCPEStatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={clsx(
        "badge",
        { "bg-green-lt": status === Status.ONLINE },
        { "bg-red-lt": status === Status.OFFLINE },
        { "bg-yellow-lt": status === Status.MAINTENANCE }
      )}
    >
      {status}
    </span>
  );
}
