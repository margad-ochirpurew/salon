"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import Link from "next/link";

const DAYS = [
  { id: 1, name: "Даваа" },
  { id: 2, name: "Мягмар" },
  { id: 3, name: "Лхагва" },
  { id: 4, name: "Пүрэв" },
  { id: 5, name: "Баасан" },
  { id: 6, name: "Бямба" },
  { id: 0, name: "Ням" },
];

const ALL_HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i < 10 ? `0${i}` : `${i}`;
  return `${h}:00`;
});

export default function BarberAdminUnifiedPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1);

  // Pop-up Toast мэдэгдэл
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. Профайл
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [experience, setExperience] = useState("");
  const [image, setImage] = useState("");
  const [bio, setBio] = useState("");
  const [specialtiesText, setSpecialtiesText] = useState("");
  const [awardsText, setAwardsText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // 2. Хуваарь
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("21:00");
  const [blockDate, setBlockDate] = useState("2026-10-03");
  const [blockedSlots, setBlockedSlots] = useState<string[]>([]);
  const [savingSchedule, setSavingSchedule] = useState(false);

  // 3. Захиалга
  const [appointments, setAppointments] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchDate, setSearchDate] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/admin/login");
        return;
      }
      setCurrentUser(user);

      try {
        const barberRef = doc(db, "barbers", user.uid);
        const snap = await getDoc(barberRef);
        if (snap.exists()) {
          const d = snap.data();
          setName(d.name || "");
          setRole(d.role || "");
          setExperience(d.experience || "");
          setImage(d.image || "");
          setBio(d.bio || "");
          setSpecialtiesText(d.specialties ? d.specialties.join(", ") : "");
          setAwardsText(d.awards ? d.awards.join("\n") : "");
          if (d.workingDays) setWorkingDays(d.workingDays);
          if (d.startTime) setStartTime(d.startTime);
          if (d.endTime) setEndTime(d.endTime);
          if (d.blockedSlots) setBlockedSlots(d.blockedSlots);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }

      // Сүүлийн 3 сарын өгөгдлийг татах (Composite Index асуудалгүй болгохын тулд client талдаа огноог шүүнэ)
      const qApp = query(
        collection(db, "appointments"),
        where("barberId", "==", user.uid)
      );

      const unsubscribeSnap = onSnapshot(qApp, (snapshot) => {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const minDateStr = threeMonthsAgo.toISOString().split("T")[0];

        const list: any[] = [];
        snapshot.forEach((docItem) => {
          const itemData = docItem.data();
          if (!itemData.date || itemData.date >= minDateStr) {
            list.push({ id: docItem.id, ...itemData });
          }
        });
        list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.time > b.time ? 1 : -1));
        setAppointments(list);
      });

      return () => unsubscribeSnap();
    });

    return () => unsubscribeAuth();
  }, [router]);

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Зөвхөн зураг сонгоно уу!");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSavingProfile(true);

    try {
      const specialtiesArray = specialtiesText
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const awardsArray = awardsText
        .split("\n")
        .map((a) => a.trim())
        .filter((a) => a.length > 0);

      await setDoc(
        doc(db, "barbers", currentUser.uid),
        {
          name: name.trim(),
          role: role.trim(),
          experience: experience.trim(),
          image: image.trim(),
          bio: bio.trim(),
          specialties: specialtiesArray,
          awards: awardsArray,
          email: currentUser.email?.toLowerCase(),
        },
        { merge: true }
      );
      showToast("Таны профайл мэдээлэл амжилттай хадгалагдлаа! ✓");
    } catch (e) {
      console.error(e);
      alert("Хадгалахад алдаа гарлаа!");
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleDay = (dayId: number) => {
    if (workingDays.includes(dayId)) {
      setWorkingDays(workingDays.filter((d) => d !== dayId));
    } else {
      setWorkingDays([...workingDays, dayId]);
    }
  };

  const toggleBlockSlot = (time: string) => {
    const slotKey = `${blockDate}_${time}`;
    if (blockedSlots.includes(slotKey)) {
      setBlockedSlots(blockedSlots.filter((k) => k !== slotKey));
    } else {
      setBlockedSlots([...blockedSlots, slotKey]);
    }
  };

  const handleSaveSchedule = async () => {
    if (!currentUser) return;
    setSavingSchedule(true);
    try {
      await setDoc(
        doc(db, "barbers", currentUser.uid),
        {
          workingDays,
          startTime,
          endTime,
          blockedSlots,
        },
        { merge: true }
      );
      showToast("Ажлын цагийн хуваарь амжилттай хадгалагдлаа! ✓");
    } catch (e) {
      console.error(e);
      alert("Алдаа гарлаа!");
    } finally {
      setSavingSchedule(false);
    }
  };

  // Төлөв өөрчлөх & Pop-up мэдэгдэл гаргах
  const handleStatusChange = async (id: string, newStatus: string, customerName: string) => {
    try {
      await updateDoc(doc(db, "appointments", id), { status: newStatus });
      if (newStatus === "completed") {
        showToast(`✓ [${customerName}] үйлчилгээ дууссан төлөвт шилжлээ.`);
      } else if (newStatus === "cancelled") {
        showToast(`✕ [${customerName}] захиалга амжилттай цуцлагдлаа.`);
      }
    } catch (e) {
      console.error(e);
      alert("Төлөв өөрчлөхөд алдаа гарлаа!");
    }
  };

  const handleExportCSV = () => {
    if (appointments.length === 0) {
      alert("Татах захиалга байхгүй байна!");
      return;
    }

    const headers = ["Огноо", "Цаг", "Үйлчлүүлэгч", "Утас", "Үйлчилгээ", "Төлөв", "Хүсэлт"];
    const rows = appointments.map((app) => [
      `"${app.date || ""}"`,
      `"${app.time || ""}"`,
      `"${app.customerName || ""}"`,
      `"${app.customerPhone || ""}"`,
      `"${app.serviceName || ""}"`,
      `"${app.status === "confirmed" ? "Батлагдсан" : app.status === "completed" ? "Дууссан" : "Цуцалсан"}"`,
      `"${(app.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Barber_Appointments_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Excel (.csv) тайлан амжилттай татагдлаа! 📥");
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/admin/login");
  };

  const filteredAppointments = appointments.filter((app) => {
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    const matchesDate = !searchDate || app.date === searchDate;
    return matchesStatus && matchesDate;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-neutral-400 text-xs">Ачааллаж байна...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 sm:p-8 relative">
      {/* Toast Pop-up мэдэгдэл */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 border border-amber-500 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-neutral-800">
          <div>
            <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              Үсчний Удирдах Самбар
            </span>
            <h1 className="text-2xl sm:text-3xl font-black mt-2">
              Тавтай морил, {name || "Үсчин"}!
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              Имэйл: <span className="text-amber-400">{currentUser?.email}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 px-3.5 py-2.5 rounded-xl transition text-neutral-300"
            >
              ← Нүүр хуудас
            </Link>
            <button
              onClick={handleLogout}
              className="text-xs bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 px-4 py-2.5 rounded-xl transition font-semibold"
            >
              Гарах 🚪
            </button>
          </div>
        </header>

        {/* 3 Таб шилжих товчлуур */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 my-8 bg-neutral-900/90 p-1.5 rounded-2xl border border-neutral-800">
          <button
            onClick={() => setActiveTab(1)}
            className={`py-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 1
                ? "bg-amber-500 text-black shadow-lg"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <span>👤</span> <span className="hidden sm:inline">1. Миний</span> Профайл
          </button>

          <button
            onClick={() => setActiveTab(2)}
            className={`py-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 2
                ? "bg-amber-500 text-black shadow-lg"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <span>🗓️</span> <span className="hidden sm:inline">2. Ажлын</span> Хуваарь
          </button>

          <button
            onClick={() => setActiveTab(3)}
            className={`py-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 3
                ? "bg-amber-500 text-black shadow-lg"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <span>📊</span> <span className="hidden sm:inline">3. Захиалга &</span> Тайлан
          </button>
        </div>

        {/* ТАБ 1: ПРОФАЙЛ */}
        {activeTab === 1 && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 animate-in fade-in">
            <h2 className="text-xl font-bold text-amber-400 mb-1">👤 Хувийн мэдээлэл & Зураг</h2>
            <p className="text-xs text-neutral-400 mb-6">
              Энд оруулсан мэдээлэл үйлчлүүлэгчдэд нүүр хуудасны каталог дээр харагдана.
            </p>

            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-2">
                  Үсчний зураг (Drag & Drop эсвэл дарж сонгоно уу):
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center relative ${
                    isDragging
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-neutral-700 hover:border-neutral-500 bg-neutral-950/50"
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files && handleImageFile(e.target.files[0])}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {image ? (
                    <div className="flex flex-col items-center gap-2">
                      <img
                        src={image}
                        alt="Profile Preview"
                        className="w-28 h-28 object-cover rounded-2xl border-2 border-amber-500 shadow-md"
                      />
                      <span className="text-xs text-neutral-400">
                        Өөр зураг оруулах бол дарж эсвэл дахин чирж тавина уу
                      </span>
                    </div>
                  ) : (
                    <div className="py-4">
                      <div className="text-3xl mb-1">📸</div>
                      <p className="text-xs font-bold text-neutral-200">
                        Зургаа энд чирж тавих (Drag & Drop) эсвэл дарж сонгоно уу
                      </p>
                      <p className="text-[11px] text-neutral-500 mt-1">PNG, JPG зураг</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Овог нэр:
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Жишээ: Б. Батболд"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Албан тушаал / Цол:
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Жишээ: Senior Master Barber"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Ажилласан туршлага:
                  </label>
                  <input
                    type="text"
                    placeholder="Жишээ: 6 жил"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Хийдэг гол засварууд (Таслалаар тусгаарлана):
                  </label>
                  <input
                    type="text"
                    placeholder="Fade, Wolfcut, Будалт"
                    value={specialtiesText}
                    onChange={(e) => setSpecialtiesText(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Гавьяа шагнал, амжилтууд (Мөр тус бүрт 1 шагнал):
                </label>
                <textarea
                  rows={3}
                  placeholder={"Улсын Аварга Үсчин 2024\nSeoul Barber Cup мөнгөн медаль"}
                  value={awardsText}
                  onChange={(e) => setAwardsText(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Танилцуулга (Bio):
                </label>
                <textarea
                  rows={2}
                  placeholder="Үйлчлүүлэгчдэд хандсан товч танилцуулга..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-8 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl transition shadow-lg disabled:opacity-50"
                >
                  {savingProfile ? "Хадгалж байна..." : "Профайлыг хадгалах ✓"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ТАБ 2: АЖЛЫН ХУВААРЬ (00:00 - 24:00) */}
        {activeTab === 2 && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6 animate-in fade-in">
            <div>
              <h2 className="text-xl font-bold text-blue-400 mb-1">🗓️ Ажлын цаг & Хуваарь (00:00 - 24:00)</h2>
              <p className="text-xs text-neutral-400">
                Та 00:00-оос 24:00 хүртэлх цагуудаас сонгон ажиллах өдөр, цаг болон хаах цагаа блоклоно.
              </p>
            </div>

            <div className="bg-neutral-950/60 border border-neutral-800 p-5 rounded-2xl">
              <label className="text-xs font-bold text-neutral-200 block mb-3">
                7 хоногийн ажиллах өдрүүд:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {DAYS.map((d) => {
                  const isActive = workingDays.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleDay(d.id)}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition ${
                        isActive
                          ? "bg-amber-500 text-black border-amber-500"
                          : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500"
                      }`}
                    >
                      {d.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-neutral-950/60 border border-neutral-800 p-5 rounded-2xl">
              <label className="text-xs font-bold text-neutral-200 block mb-3">
                Ажиллах цагийн интервал (00:00 - 24:00):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Эхлэх цаг:</label>
                  <select
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 text-white rounded-xl px-3 py-2 text-sm focus:border-amber-500"
                  >
                    {ALL_HOURS.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Дуусах цаг:</label>
                  <select
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 text-white rounded-xl px-3 py-2 text-sm focus:border-amber-500"
                  >
                    {ALL_HOURS.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                    <option value="24:00">24:00</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-neutral-950/60 border border-neutral-800 p-5 rounded-2xl">
              <label className="text-xs font-bold text-neutral-200 block mb-1">
                ⛔ Зарим цагийг хааж блоклох:
              </label>
              <p className="text-xs text-neutral-400 mb-3">
                Тухайн өдрийн хүссэн цаг дээрээ дарж үйлчлүүлэгч цаг авахаас сэргийлж хаана.
              </p>

              <div className="mb-4 max-w-xs">
                <input
                  type="date"
                  value={blockDate}
                  onChange={(e) => setBlockDate(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 text-white rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {ALL_HOURS.map((hour) => {
                  const isBlocked = blockedSlots.includes(`${blockDate}_${hour}`);
                  return (
                    <button
                      key={hour}
                      type="button"
                      onClick={() => toggleBlockSlot(hour)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition ${
                        isBlocked
                          ? "bg-red-600/30 border-red-500 text-red-300 line-through"
                          : "bg-neutral-800 border-neutral-700 text-neutral-300 hover:border-neutral-500"
                      }`}
                    >
                      {hour} {isBlocked ? "(Хаасан)" : ""}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveSchedule}
                disabled={savingSchedule}
                className="px-8 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl transition shadow-lg disabled:opacity-50"
              >
                {savingSchedule ? "Хадгалж байна..." : "Хуваарийг хадгалах ✓"}
              </button>
            </div>
          </div>
        )}

        {/* ТАБ 3: ЗАХИАЛГА ХЯНАХ & EXCEL (Pop-up Toast-той) */}
        {activeTab === 3 && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-neutral-800 mb-6 gap-4">
              <div>
                <h2 className="text-xl font-bold text-emerald-400 mb-1">
                  📊 Сүүлийн 3 сарын захиалгууд
                </h2>
                <p className="text-xs text-neutral-400">
                  Нийт бүртгэгдсэн: <span className="text-white font-bold">{appointments.length}</span> үйлчлүүлэгч
                </p>
              </div>

              <button
                onClick={handleExportCSV}
                className="text-xs bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 px-4 py-2.5 rounded-xl transition font-bold flex items-center justify-center gap-1.5 shadow-lg"
              >
                📥 Excel (.csv) татах
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-neutral-950/60 border border-neutral-800 p-3.5 rounded-2xl flex items-center gap-3">
                <label className="text-xs text-neutral-400 shrink-0">Огноо:</label>
                <input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-1.5 text-xs text-white"
                />
                {searchDate && (
                  <button
                    onClick={() => setSearchDate("")}
                    className="text-xs text-neutral-400 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="bg-neutral-950/60 border border-neutral-800 p-3.5 rounded-2xl flex items-center gap-3">
                <label className="text-xs text-neutral-400 shrink-0">Төлөв:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-1.5 text-xs text-white"
                >
                  <option value="all">Бүгд ({appointments.length})</option>
                  <option value="confirmed">Баталгаажсан</option>
                  <option value="completed">Дууссан</option>
                  <option value="cancelled">Цуцлагдсан</option>
                </select>
              </div>
            </div>

            {filteredAppointments.length === 0 ? (
              <div className="bg-neutral-950/40 border border-neutral-800 rounded-2xl p-10 text-center text-neutral-500 text-xs">
                Энэ шүүлтүүрт тохирох захиалга олдсонгүй.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAppointments.map((app) => (
                  <div
                    key={app.id}
                    className={`bg-neutral-950/70 border rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row justify-between gap-4 transition ${
                      app.status === "cancelled"
                        ? "border-red-950/40 opacity-50"
                        : app.status === "completed"
                        ? "border-emerald-900/50 bg-emerald-950/10"
                        : "border-neutral-800"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="bg-neutral-900 border border-neutral-800 px-3.5 py-2 rounded-2xl text-center min-w-[85px]">
                        <span className="text-xs text-amber-500 font-bold block">{app.date}</span>
                        <span className="text-base font-black text-white">{app.time}</span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-sm text-white">{app.customerName}</h3>
                          <a
                            href={`tel:${app.customerPhone}`}
                            className="text-xs text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 font-medium"
                          >
                            📞 {app.customerPhone}
                          </a>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                              app.status === "confirmed"
                                ? "bg-blue-500/20 text-blue-400"
                                : app.status === "completed"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {app.status === "confirmed"
                              ? "Баталгаажсан"
                              : app.status === "completed"
                              ? "Дууссан"
                              : "Цуцлагдсан"}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-neutral-300 mt-1">
                          ✂️ {app.serviceName}
                        </p>

                        {app.notes && (
                          <p className="text-xs text-neutral-400 bg-neutral-900/80 p-2 rounded-xl border border-neutral-800 mt-2 max-w-xl">
                            💬 {app.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col justify-end gap-2 shrink-0">
                      {app.status === "confirmed" && (
                        <>
                          <button
                            onClick={() => handleStatusChange(app.id, "completed", app.customerName)}
                            className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 active:scale-95 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-xl text-xs font-semibold transition"
                          >
                            ✓ Дууссан
                          </button>
                          <button
                            onClick={() => handleStatusChange(app.id, "cancelled", app.customerName)}
                            className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600 active:scale-95 text-red-400 hover:text-white border border-red-500/30 rounded-xl text-xs font-semibold transition"
                          >
                            ✕ Цуцлах
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}