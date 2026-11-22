"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import TherapistDailyReportView from "@/components/TherapistDailyReportView";

function TherapistReportsPageContent() {
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId") || "patient_aanya_rao";
  return <TherapistDailyReportView patientId={patientId} />;
}

export default function TherapistReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex items-center justify-center font-sans">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
        </div>
      }
    >
      <TherapistReportsPageContent />
    </Suspense>
  );
}
