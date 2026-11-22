import React from "react";
import TherapistDailyReportView from "@/components/TherapistDailyReportView";

export function generateStaticParams() {
  return [
    { patientId: "[patientId]" },
    { patientId: "%5BpatientId%5D" },
    { patientId: "default" },
    { patientId: "patient_aanya_rao" },
    { patientId: "sample_dev_patel" },
    { patientId: "patient_karan_sharma" },
    { patientId: "patient_rohan_varma" },
    { patientId: "patient_priya_nair" },
  ];
}

interface PageProps {
  params: Promise<{ patientId: string }>;
}

export default async function TherapistPatientReportsPage({ params }: PageProps) {
  const resolvedParams = await params;
  const rawId = resolvedParams?.patientId;
  const patientId =
    !rawId || rawId === "[patientId]" || rawId === "%5BpatientId%5D" || rawId === "default"
      ? "patient_aanya_rao"
      : rawId;

  return <TherapistDailyReportView patientId={patientId} />;
}
