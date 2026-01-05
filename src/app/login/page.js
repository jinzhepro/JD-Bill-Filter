"use client";

import React from "react";
import { LoginPage } from "@/components/LoginPage";
import { RouteGuard } from "@/components/RouteGuard";

export default function Login() {
  return (
    <RouteGuard>
      <LoginPage />
    </RouteGuard>
  );
}
