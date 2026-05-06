"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function InvoiceHistoryPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/invoice");
  }, [router]);
  
  return null;
}