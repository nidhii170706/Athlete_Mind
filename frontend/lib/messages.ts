// ---------------------------------------------------------------------------
// AthleteMind Messaging Store
// Authorized messaging between patient and linked physiotherapist
// ---------------------------------------------------------------------------

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "patient" | "physiotherapist";
  text: string;
  timestamp: string;
  readByPatient: boolean;
  readByTherapist: boolean;
}

const STORAGE_PREFIX = "athletemind_messages_";

function getStorageKey(patientId: string): string {
  return `${STORAGE_PREFIX}${patientId || "patient_aanya_rao"}`;
}

export function getMessages(patientId: string): ChatMessage[] {
  if (typeof window === "undefined") return [];
  const key = getStorageKey(patientId);
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Error reading messages", e);
  }

  // Initial seed conversation for demo patient
  const seedMessages: ChatMessage[] = [
    {
      id: "msg_seed_1",
      senderId: "therapist_meera_joshi",
      senderName: "Dr. Meera Joshi, PT",
      senderRole: "physiotherapist",
      text: "Welcome to your knee rehabilitation protocol! Remember to hold at 35°–45° for 1 full second during each deflection.",
      timestamp: "Nov 22, 10:30 AM",
      readByPatient: false,
      readByTherapist: true,
    },
    {
      id: "msg_seed_2",
      senderId: "patient_aanya_rao",
      senderName: "Aanya Rao",
      senderRole: "patient",
      text: "Thank you Dr. Joshi! I just completed my first calibrated session.",
      timestamp: "Nov 22, 11:15 AM",
      readByPatient: true,
      readByTherapist: true,
    },
    {
      id: "msg_seed_3",
      senderId: "therapist_meera_joshi",
      senderName: "Dr. Meera Joshi, PT",
      senderRole: "physiotherapist",
      text: "Great work on the clean holds! If you feel any joint fatigue, remember to take the full 30-second rest intervals between sets.",
      timestamp: "Nov 23, 09:00 AM",
      readByPatient: false,
      readByTherapist: true,
    },
  ];

  try {
    localStorage.setItem(key, JSON.stringify(seedMessages));
  } catch (e) {}

  return seedMessages;
}

export function getUnreadCount(patientId: string, role: "patient" | "physiotherapist"): number {
  if (typeof window === "undefined") return 0;
  const messages = getMessages(patientId);
  if (role === "patient") {
    return messages.filter((m) => !m.readByPatient && m.senderRole !== "patient").length;
  } else {
    return messages.filter((m) => !m.readByTherapist && m.senderRole !== "physiotherapist").length;
  }
}

export function markMessagesAsRead(patientId: string, role: "patient" | "physiotherapist"): void {
  if (typeof window === "undefined") return;
  const key = getStorageKey(patientId);
  try {
    const messages = getMessages(patientId);
    let changed = false;
    const updated = messages.map((m) => {
      if (role === "patient" && !m.readByPatient) {
        changed = true;
        return { ...m, readByPatient: true };
      }
      if (role === "physiotherapist" && !m.readByTherapist) {
        changed = true;
        return { ...m, readByTherapist: true };
      }
      return m;
    });

    if (changed) {
      localStorage.setItem(key, JSON.stringify(updated));
    }
  } catch (e) {
    console.warn("Failed marking messages read", e);
  }
}

export async function sendMessage(
  patientId: string,
  sender: { id: string; name: string; role: "patient" | "physiotherapist" },
  text: string
): Promise<ChatMessage> {
  if (typeof window === "undefined") {
    throw new Error("Window unavailable");
  }
  const key = getStorageKey(patientId);
  const messages = getMessages(patientId);

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString([], { month: "short", day: "numeric" });

  const newMessage: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    senderId: sender.id,
    senderName: sender.name,
    senderRole: sender.role,
    text: text.trim(),
    timestamp: `${dateStr}, ${timeStr}`,
    readByPatient: sender.role === "patient",
    readByTherapist: sender.role === "physiotherapist",
  };

  messages.push(newMessage);
  localStorage.setItem(key, JSON.stringify(messages));

  return newMessage;
}
