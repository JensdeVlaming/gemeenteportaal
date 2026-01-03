import { signInWithEmail } from "@/services/authService";
import { Mail } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { session } = useAuth();

  useEffect(() => {
    if (session) {
      navigate("/", { replace: true });
    }
  }, [navigate, session]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await signInWithEmail(email);
      navigate("/login/instructions", { state: { email } });
    } catch (err: any) {
      setError(err.message ?? "Er ging iets mis.");
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-linear-to-br from-orange-50 to-white px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-10 shadow-xl ring-1 ring-gray-100">
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
            Verstuur loginlink
          </button>

          {error && <p className="text-center text-sm text-red-600">{error}</p>}
        </form>

        <footer className="mt-8 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Gemeenteportaal
        </footer>
      </div>
    </div>
  );
}
