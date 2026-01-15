import { pb } from "@/lib/pocketbaseClient";

type OTPAuthResponse = {
  token: string;
  record: Record<string, unknown>;
};

const OTP_STORAGE_KEY = "pb_last_otp";

type StoredOtp = {
  email: string;
  otpId: string;
  createdAt: number;
};

function storeOtp(email: string, otpId: string) {
  if (typeof window === "undefined") return;
  const payload: StoredOtp = {
    email,
    otpId,
    createdAt: Date.now(),
  };
  window.localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(payload));
}

export function getStoredOtpId(email?: string) {
  if (typeof window === "undefined") return "";
  try {
    const raw = window.localStorage.getItem(OTP_STORAGE_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as StoredOtp;
    if (!parsed?.otpId) return "";
    if (email && parsed.email !== email) return "";
    return parsed.otpId;
  } catch {
    return "";
  }
}

export async function signInWithEmail(email: string) {
  const data = await pb.collection("users").requestOTP(email);
  if (!data?.otpId) {
    throw new Error("Geen verificatiecode ontvangen.");
  }
  storeOtp(email, data.otpId);
  return data.otpId;
}

export async function verifyOtpCode(otpId: string, token: string) {
  const data = await pb
    .collection("users")
    .authWithOTP<OTPAuthResponse>(otpId, token);
  if (!data?.token) {
    throw new Error("Ongeldig serverantwoord.");
  }
  return data;
}

export async function signOut() {
  pb.authStore.clear();
}

export function onAuthStateChange(cb: () => void) {
  return pb.authStore.onChange(() => cb(), true);
}

export async function getSession() {
  if (!pb.authStore.isValid) return null;
  return {
    token: pb.authStore.token,
    record: pb.authStore.record ?? null,
  };
}
