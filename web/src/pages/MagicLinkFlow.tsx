import { verifyOtpCode } from "@/services/authService";
import { Mail } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const OTP_LENGTH_PROD = 8;
const OTP_LENGTH_DEV = 6;
const OTP_LENGTH = import.meta.env.DEV ? OTP_LENGTH_DEV : OTP_LENGTH_PROD;

type LocationState = {
  email?: string;
};

export default function MagicLinkFlow() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialEmail = (location.state as LocationState)?.email ?? "";
  const emailDisplay = initialEmail || "je e-mailadres";
  const hasEmail = Boolean(initialEmail);
  const [otpDigits, setOtpDigits] = useState<string[]>(() =>
    Array.from({ length: OTP_LENGTH }, () => "")
  );
  const [otpError, setOtpError] = useState("");
  const [otpStatus, setOtpStatus] = useState("");
  const [otpVerifying, setOtpVerifying] = useState(false);
  const otpRefs = useRef<HTMLInputElement[]>([]);
  const { session } = useAuth();

  useEffect(() => {
    if (session) {
      navigate("/", { replace: true });
    }
  }, [navigate, session]);

  async function handleVerifyOtpCode(digits?: string[]) {
    if (!hasEmail) {
      setOtpError(
        "Ga terug naar het inlogscherm om een loginlink aan te vragen."
      );
      return;
    }
    const digitsToUse = digits ?? otpDigits;
    const joinedCode = digitsToUse.join("");
    if (joinedCode.length < OTP_LENGTH) {
      setOtpError(`Vul de volledige ${OTP_LENGTH}-cijferige code in.`);
      return;
    }
    setOtpError("");
    setOtpStatus("");
    setOtpVerifying(true);
    try {
      const data = await verifyOtpCode(initialEmail, joinedCode);
      setOtpStatus("Code geverifieerd. Je wordt ingelogd.");
      setOtpDigits(Array.from({ length: OTP_LENGTH }, () => ""));
      otpRefs.current[0]?.focus();
      const redirectPath =
        data?.session?.user?.app_metadata?.redirect_to ?? "/";
      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      setOtpError(
        err.message ?? "Er ging iets mis bij het bevestigen van de code."
      );
    } finally {
      setOtpVerifying(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-linear-to-br from-orange-50 to-white px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-10 shadow-xl ring-1 ring-gray-100">
        <div className="mb-6 text-center">
          <div
            className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#E98C00] text-white"
            aria-hidden="true"
          >
            <Mail size={22} />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Loginlink verstuurd
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            We hebben de loginlink verstuurd naar {emailDisplay}. Controleer je
            inbox en bevestig je login.
          </p>
          {!hasEmail && (
            <p className="mt-2 text-xs text-red-600">
              Geen e-mailadres gevonden? Ga terug naar{" "}
              <Link className="font-semibold text-[#E98C00]" to="/login">
                inloggen
              </Link>
              .
            </p>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-[#E98C00] bg-[#fff7ef] p-6 text-sm text-[#1F2A44] shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#E98C00]">
            Wat doe je hier?
          </p>
          <p className="mt-2 text-sm leading-relaxed">
            Je hebt een loginlink (en code) ontvangen in je e-mail. Druk op de
            knop in de e-mail om automatisch in te loggen. Als dat niet lukt,
            kun je de {OTP_LENGTH}-cijferige code hieronder invoeren om je
            login te bevestigen.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-[#1F2A44]">
          <p className="text-sm font-semibold">
            Alternatief: de {OTP_LENGTH}-cijferige code
          </p>
          <p className="mt-1 text-xs text-[#475569]">
            Plak of tik de {OTP_LENGTH} cijfers uit de e-mail en bevestig.
          </p>
          <div
            className="mt-3 grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${OTP_LENGTH}, minmax(0, 1fr))`,
            }}
          >
            {otpDigits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  if (el) otpRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  const prevFull = otpDigits.every((digit) => digit !== "");
                  const newDigits = [...otpDigits];
                  newDigits[index] = value.slice(-1);
                  setOtpError("");
                  setOtpDigits(newDigits);
                  if (value && index < OTP_LENGTH - 1) {
                    otpRefs.current[index + 1]?.focus();
                  }
                  const isFull = newDigits.every((digit) => digit !== "");
                  const inputType = (e.nativeEvent as InputEvent)?.inputType;
                  if (isFull && !prevFull && inputType !== "insertFromPaste") {
                    void handleVerifyOtpCode(newDigits);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !digit && index > 0) {
                    otpRefs.current[index - 1]?.focus();
                    setOtpDigits((prev) => {
                      const copy = [...prev];
                      copy[index - 1] = "";
                      return copy;
                    });
                  }
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const paste = e.clipboardData
                    .getData("text")
                    .replace(/\D/g, "")
                    .slice(0, OTP_LENGTH);
                  if (!paste) return;
                  const pasteDigits = Array.from(
                    { length: OTP_LENGTH },
                    (_, i) => paste[i] ?? ""
                  );
                  setOtpDigits(pasteDigits);
                  const nextIndex = Math.min(paste.length, OTP_LENGTH - 1);
                  otpRefs.current[nextIndex]?.focus();
                  if (pasteDigits.every((digit) => digit)) {
                    void handleVerifyOtpCode(pasteDigits);
                  }
                }}
                className="h-12 w-full rounded-lg border border-gray-300 bg-white text-center text-xl tracking-widest focus:border-[#1F2A44] focus:outline-none focus:ring-2 focus:ring-[#1F2A44] focus:ring-offset-1"
              />
            ))}
          </div>
          <div className="mt-3 flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                void handleVerifyOtpCode();
              }}
              disabled={
                otpVerifying ||
                otpDigits.some((digit) => digit === "") ||
                !hasEmail
              }
              className="flex-1 rounded-lg bg-[#1F2A44] px-3 py-2 text-xs text-white transition focus:outline-none focus:ring-2 focus:ring-[#1F2A44] focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {otpVerifying ? "Verifieer..." : "Bevestig"}
            </button>
          </div>
          {otpStatus && (
            <p className="mt-3 text-center text-xs text-[#0F9574]">
              {otpStatus}
            </p>
          )}
          {otpError && (
            <p className="mt-3 text-center text-xs text-red-600">{otpError}</p>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-lg border border-[#E98C00] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[#E98C00] transition hover:bg-[#E98C00]/10"
          >
            Terug naar inloggen
          </Link>
        </div>
      </div>
    </div>
  );
}
