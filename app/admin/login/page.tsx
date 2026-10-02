"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";

export default function BarberLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isResetMode, setIsResetMode] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace("/admin");
      } else {
        setCheckingAuth(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfoMsg("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      router.replace("/admin");
    } catch (err: any) {
      console.error(err);
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        setError("Имэйл эсвэл нууц үг буруу байна.");
      } else {
        setError("Нэвтрэхэд алдаа гарлаа. Дахин оролдоно уу.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Бүртгэлтэй имэйл хаягаа оруулна уу.");
      return;
    }
    setError("");
    setInfoMsg("");
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      setInfoMsg("Нууц үг шинэчлэх холбоос таны имэйл рүү илгээгдлээ. (Spam хавтсаа мөн шалгана уу)");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/user-not-found") {
        setError("Бүртгэлгүй имэйл хаяг байна.");
      } else {
        setError("Хүсэлт илгээхэд алдаа гарлаа.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-neutral-400 text-xs">Ачааллаж байна...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl max-w-md w-full shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3">
            🔐
          </div>
          <h1 className="text-2xl font-black">
            {isResetMode ? "Нууц үг сэргээх" : "Үсчний Нэвтрэх Хэсэг"}
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            {isResetMode
              ? "Бүртгэлтэй имэйл хаягаа оруулж холбоос авна уу"
              : "Албан ёсны имэйлээр нэвтэрч самбараа удирдана уу"}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mb-4 text-center font-medium">
            {error}
          </div>
        )}

        {infoMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-3 rounded-xl mb-4 text-center font-medium">
            {infoMsg}
          </div>
        )}

        {!isResetMode ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Имэйл хаяг:
              </label>
              <input
                required
                type="email"
                placeholder="Жишээ: batbold@salon.mn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition text-white"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Нууц үг:
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsResetMode(true);
                    setError("");
                    setInfoMsg("");
                  }}
                  className="text-[11px] text-amber-500 hover:underline"
                >
                  Нууц үгээ мартсан уу?
                </button>
              </div>
              <input
                required
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition text-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition text-sm disabled:opacity-50 mt-2 shadow-lg"
            >
              {loading ? "Нэвтэрч байна..." : "Хувийн самбарт нэвтрэх"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Бүртгэлтэй имэйл хаяг:
              </label>
              <input
                required
                type="email"
                placeholder="Жишээ: batbold@salon.mn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition text-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition text-sm disabled:opacity-50 mt-2 shadow-lg"
            >
              {loading ? "Илгээж байна..." : "Сэргээх холбоос илгээх"}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsResetMode(false);
                setError("");
                setInfoMsg("");
              }}
              className="w-full text-xs text-neutral-400 hover:text-white py-2 transition text-center"
            >
              ← Буцах (Нэвтрэх хэсэг рүү)
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-neutral-800 flex justify-between items-center text-xs text-neutral-400">
          <Link href="/" className="hover:text-amber-400 transition">
            ← Нүүр хуудас
          </Link>
          <span className="text-[11px] text-neutral-500">Urban Salon Security</span>
        </div>
      </div>
    </div>
  );
}