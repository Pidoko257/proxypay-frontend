import React from "react";
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "",
  environment: process.env.NODE_ENV,
});

export default function Root({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}