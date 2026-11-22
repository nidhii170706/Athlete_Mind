"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PatientHeader } from "@/components/PatientHeader";
import { useAuth } from "@/lib/auth-context";
import { CarePlan, getPublishedPlan } from "@/lib/care-plan";
import {
  ChatMessage,
  getMessages,
  sendMessage,
  markMessagesAsRead,
} from "@/lib/messages";

function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId") || undefined;
  const isPreview = searchParams.get("preview") === "true";

  const { user, isLoading, signOut } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [plan, setPlan] = useState<CarePlan | null>(null);

  const effectivePatientId = patientId || user?.id || "patient_aanya_rao";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
    setPlan(getPublishedPlan(patientId));
  }, [patientId]);

  // Load messages and mark as read for current viewer
  useEffect(() => {
    if (isMounted) {
      const list = getMessages(effectivePatientId);
      setMessages(list);
      const readerRole = user?.role === "physiotherapist" ? "physiotherapist" : "patient";
      markMessagesAsRead(effectivePatientId, readerRole);
    }
  }, [isMounted, effectivePatientId, user?.role]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setSending(true);
    setSendError(null);

    const isTherapist = user?.role === "physiotherapist";
    const currentSender = {
      id: user?.id || (isTherapist ? "therapist_meera_joshi" : "patient_aanya_rao"),
      name: user?.fullName || (isTherapist ? "Dr. Meera Joshi, PT" : plan ? plan.patientName : "Aanya Rao"),
      role: (user?.role || "patient") as "patient" | "physiotherapist",
    };

    try {
      const sent = await sendMessage(effectivePatientId, currentSender, inputText);
      setMessages((prev) => [...prev, sent]);
      setInputText("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to deliver message.";
      setSendError(msg);
    } finally {
      setSending(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  if (!isMounted || !plan || isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Loading clinical messages...</span>
        </div>
      </div>
    );
  }

  const isTherapist = user?.role === "physiotherapist";
  const partnerName = isTherapist ? plan.patientName : (plan.clinicianName || "Dr. Meera Joshi, PT");
  const partnerInitials = partnerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col antialiased">
      {/* If patient, render patient header; if therapist, render professional header */}
      {isTherapist ? (
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-4">
            <Link
              href="/therapist/workspace"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
            >
              <span>←</span>
              <span>Back to Therapist Workspace</span>
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            <span className="text-xs font-bold text-slate-900">
              Clinical Channel: {plan.patientName} (ID: {effectivePatientId})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
              Physiotherapist View
            </span>
            <button
              onClick={handleSignOut}
              className="text-xs font-bold text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 px-3 py-1 rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              Sign out
            </button>
          </div>
        </header>
      ) : (
        <PatientHeader
          patientName={plan.patientName}
          patientId={patientId}
          isPreview={isPreview}
        />
      )}

      <main className="p-4 sm:p-8 max-w-4xl mx-auto w-full flex flex-col gap-4 flex-1">
        {/* Chat Thread Partner Header */}
        <div className="bg-white rounded-2xl border border-slate-200 px-6 py-4 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-sm flex items-center justify-center">
              {partnerInitials}
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">{partnerName}</h1>
              <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  {isTherapist
                    ? `Direct Channel with ${plan.patientName} • ${plan.planTitle}`
                    : "Active Clinical Direct Channel"}
                </span>
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md hidden sm:inline">
            Encrypted Health Chat
          </span>
        </div>

        {/* Message Bubble History Box */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-4 flex-1 min-h-[420px] max-h-[580px] overflow-y-auto shadow-xs">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 gap-2 my-auto">
              <span className="text-3xl">💬</span>
              <span className="text-xs font-semibold">
                No messages yet. Send a note to {partnerName}.
              </span>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.senderRole === (user?.role || "patient");
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-slate-400">
                      {m.senderName}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {new Date(m.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div
                    className={`max-w-md px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                      isMe
                        ? isTherapist
                          ? "bg-emerald-800 text-white rounded-tr-xs"
                          : "bg-teal-800 text-white rounded-tr-xs"
                        : "bg-slate-100 text-slate-800 rounded-tl-xs border border-slate-200/80"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Send Error Notice */}
        {sendError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
            <span>⚠ {sendError}</span>
            <button
              onClick={() => setSendError(null)}
              className="font-bold underline text-[11px] cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Message Input Form */}
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isTherapist
                ? `Type clinical feedback or instructions for ${plan.patientName}...`
                : "Type a clinical question or feedback about your knee hold..."
            }
            className="flex-1 px-4 py-3 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 shadow-2xs"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !inputText.trim()}
            className={`px-5 py-3 rounded-xl text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer shadow-xs ${
              isTherapist ? "bg-emerald-700 hover:bg-emerald-800" : "bg-teal-700 hover:bg-teal-800"
            }`}
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </form>
      </main>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex items-center justify-center font-sans">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}
