"use client";

import Link from "next/link";
import { redirect } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    redirect("/dashboard");
  }, []);

  return null;
}
