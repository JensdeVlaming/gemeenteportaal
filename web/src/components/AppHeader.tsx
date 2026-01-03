import { supabase } from "@/lib/supabaseClient";
import clsx from "clsx";
import { BookOpen, CalendarDays, HandCoins, LogOut } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

export default function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { name: "Agenda", path: "/", icon: CalendarDays },
    { name: "Preken", path: "/sermons", icon: BookOpen },
    { name: "Collectes", path: "/collections", icon: HandCoins },
  ];

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <header className="sticky top-3 z-50 flex justify-center">
      <div className="flex w-[95%] max-w-6xl items-center justify-between rounded-2xl bg-white/40 backdrop-blur-xl shadow-lg border border-white/50 px-4 py-5 transition-colors">
        {/* Logo / App name */}
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-lg font-semibold text-[#E98C00] cursor-pointer"
        >
          <img
            src="/logo.png"
            alt="Gemeenteportaal logo"
            className="h-10 w-10 rounded-full border border-[#E98C00]/50 object-cover"
            loading="lazy"
          />
          <span>Gemeenteportaal</span>
        </button>

        {/* Navigation */}
        <nav className="flex items-center gap-5">
          {navItems.map(({ name, path, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={clsx(
                  "flex items-center gap-1.5 text-sm font-medium transition-colors",
                  active
                    ? "text-[#E98C00]"
                    : "text-gray-700 hover:text-[#E98C00]"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={16} strokeWidth={2} />
                {name}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg bg-[#E98C00]/10 px-3 py-1.5 text-sm text-[#E98C00] font-medium transition hover:bg-[#E98C00]/20"
        >
          <LogOut size={16} strokeWidth={2} />
          Uitloggen
        </button>
      </div>
    </header>
  );
}
