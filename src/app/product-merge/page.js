"use client";

import React from "react";
import { MainLayout } from "@/components/MainLayout";
import { ProductMergeContent } from "@/components/ProductMergeContent";
import { ProductMergeProvider } from "@/context/ProductMergeContext";

export default function ProductMergePage() {
  return (
    <MainLayout>
      <ProductMergeProvider>
        <ProductMergeContent />
      </ProductMergeProvider>
    </MainLayout>
  );
}