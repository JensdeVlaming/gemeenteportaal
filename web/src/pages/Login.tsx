import { signInWithEmail, verifyOtpCode } from "@/services/authService";
import { Mail } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(() =>
    Array.from({ length: 6 }, () => "")
  );
  const [otpError, setOtpError] = useState("");
  const [otpStatus, setOtpStatus] = useState("");
  const [otpVerifying, setOtpVerifying] = useState(false);
  const otpRefs = useRef<HTMLInputElement[]>([]);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await signInWithEmail(email);
      setSent(true);
    } catch (err: any) {
      setError(err.message ?? "Er ging iets mis.");
    }
  }

  async function handleVerifyOtpCode(digits?: string[]) {
    const digitsToUse = digits ?? otpDigits;
    const joinedCode = digitsToUse.join("");
    if (!email || joinedCode.length < 6) {
      setOtpError("Vul je e-mailadres en de ontvangen code in.");
      return;
    }
    setOtpError("");
    setOtpStatus("");
    setOtpVerifying(true);
    try {
      await verifyOtpCode(email, joinedCode);
      setOtpStatus("Code geverifieerd. Je wordt ingelogd.");
      setOtpDigits(Array.from({ length: 6 }, () => ""));
      otpRefs.current[0]?.focus();
      navigate("/", { replace: true });
    } catch (err: any) {
      setOtpError(
        err.message ?? "Er ging iets mis bij het bevestigen van de code."
      );
    } finally {
      setOtpVerifying(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-linear-to-br from-orange-50 to-white">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl ring-1 ring-gray-100">
        <div className="mb-6 text-center">
          <div
            className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: "#E98C00" }}
          >
            <Mail size={22} />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Gemeenteportaal
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Log in om diensten en collectes te beheren
          </p>
        </div>

        {sent ? (
          <>
            <div
              className="rounded-lg p-4 text-center text-sm"
              style={{
                backgroundColor: "#FFF5E6",
                color: "#E98C00",
              }}
            >
              Magic link verstuurd naar <b>{email}</b>. Controleer je mailbox om
              in te loggen.
              <p className="mt-2 text-sm text-gray-600">
                Open de e-mail en tik op de link: zodra je de link aanklikt
                wordt je automatisch ingelogd en kom je terug in het portaal.
                Staat hij niet in je inbox? Kijk even in de spambox.
              </p>
            </div>
            <div className="mt-6">
              <span className="block h-px bg-gray-200" />
            </div>
            <div
              className="mt-4 rounded-lg p-4 text-center text-sm"
              style={{ backgroundColor: "#F7F7F7", color: "#1F2A44" }}
            >
              <p className="text-sm font-semibold">
                Alternatief: gebruik de 6-cijferige code
              </p>
              <p className="mt-2 text-sm text-gray-500">
                De code staat in hetzelfde bericht als de magic link. Voer de
                code in en druk op bevestig.
              </p>
              <div className="mt-3">
                <div className="grid grid-cols-6 gap-2">
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
                        const inputType = (e.nativeEvent as InputEvent)
                          ?.inputType;
                        const prevFull = otpDigits.every(
                          (digit) => digit !== ""
                        );
                        const newDigits = [...otpDigits];
                        newDigits[index] = value.slice(-1);
                        setOtpError("");
                        setOtpDigits(newDigits);
                        if (value && index < 5) {
                          otpRefs.current[index + 1]?.focus();
                        }
                        const isFull = newDigits.every((digit) => digit !== "");
                        if (
                          isFull &&
                          !prevFull &&
                          inputType !== "insertFromPaste"
                        ) {
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
                          .slice(0, 6);
                        if (!paste) return;
                        const pasteDigits = Array.from(
                          { length: 6 },
                          (_, i) => paste[i] ?? ""
                        );
                        setOtpDigits(pasteDigits);
                        const nextIndex = Math.min(paste.length, 5);
                        otpRefs.current[nextIndex]?.focus();
                        if (pasteDigits.every((digit) => digit)) {
                          void handleVerifyOtpCode(pasteDigits);
                        }
                      }}
                      className="h-12 w-full rounded-lg border border-gray-300 bg-white text-center text-xl tracking-widest focus:border-[#1F2A44] focus:outline-none focus:ring-2 focus:ring-[#1F2A44] focus:ring-offset-1"
                    />
                  ))}
                </div>
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
                    !email
                  }
                  className="flex-1 rounded-lg bg-[#1F2A44] px-3 py-2 text-xs text-white transition focus:outline-none focus:ring-2 focus:ring-[#1F2A44] focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {otpVerifying ? "Verifieer..." : "Bevestig"}
                </button>
              </div>
              {otpStatus && (
                <p className="mt-2 text-center text-xs text-[#0F9574]">
                  {otpStatus}
                </p>
              )}
              {otpError && (
                <p className="mt-2 text-center text-xs text-red-600">
                  {otpError}
                </p>
              )}
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                E-mailadres
              </label>
              <input
                id="email"
                type="email"
                placeholder="jij@voorbeeld.nl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#E98C00] focus:ring-offset-1"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg py-2 text-sm font-medium text-white transition focus:outline-none focus:ring-2 focus:ring-offset-1"
              style={{
                backgroundColor: "#E98C00",
              }}
            >
              Verstuur magic link
            </button>

            {error && (
              <p className="text-center text-sm text-red-600">{error}</p>
            )}
          </form>
        )}

        <footer className="mt-8 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Gemeenteportaal
        </footer>
      </div>
    </div>
  );
}
