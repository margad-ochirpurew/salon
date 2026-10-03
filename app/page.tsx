\"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";

interface Barber {
  id: string;
  name: string;
  role: string;
  experience: string;
  image: string;
  awards: string[];
  specialties: string[];
  bio: string;
  email: string;
  workingDays?: number[];
  startTime?: string;
  endTime?: string;
  blockedSlots?: string[];
}

const ALL_HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i < 10 ? `0${i}` : `${i}`;
  return `${h}:00`;
});

const SERVICES = [
  { name: "Үс засалт", price: "30,000₮" },
  { name: "Сахал хэлбэржүүлэлт", price: "20,000₮" },
  { name: "Үс будалт", price: "80,000₮" },
  { name: "Угаалт, стейлинг", price: "15,000₮" },
];

export default function HomePage() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loadingBarbers, setLoadingBarbers] = useState(true);

  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedDate, setSelectedDate] = useState("2026-10-03");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedService, setSelectedService] = useState(SERVICES[0].name);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false); 

  const [bookedTimes, setBookedTimes] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "barbers"), (snapshot) => {
      const list: Barber[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<Barber, "id">) });
      });
      setBarbers(list);
      setLoadingBarbers(false);
    });

    return () => unsubscribe();
  }, []);

  // Composite index шаардахгүйгээр зөвхөн barberId-аар шүүнэ
  useEffect(() => {
    if (!selectedBarber || !selectedDate) return;

    const q = query(
      collection(db, "appointments"),
      where("barberId", "==", selectedBarber.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const times: string[] = [];
      snapshot.forEach((d) => {
        const item = d.data();
        if (item.date === selectedDate && item.status === "confirmed") {
          times.push(item.time);
        }
      });
      setBookedTimes(times);
    });

    return () => unsubscribe();
  }, [selectedBarber, selectedDate]);

  const getAvailableHours = () => {
    if (!selectedBarber) return ALL_HOURS;
    const start = selectedBarber.startTime || "00:00";
    const end = selectedBarber.endTime || "24:00";
    return ALL_HOURS.filter((h) => h >= start && h < end);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBarber || !selectedTime) {
      alert("Цагаа сонгоно уу!");
      return;
    }

    setSubmitting(true);
    try {
      const checkQ = query(
        collection(db, "appointments"),
        where("barberId", "==", selectedBarber.id)
      );
      const existingSnap = await getDocs(checkQ);
      const isAlreadyTaken = existingSnap.docs.some((docItem) => {
        const d = docItem.data();
        return (
          d.date === selectedDate &&
          d.time === selectedTime &&
          d.status === "confirmed"
        );
      });

      if (isAlreadyTaken) {
        alert("Уучлаарай, энэ цаг саяхан захиалагдсан байна! Өөр цаг сонгоно уу.");
        setSelectedTime("");
        setSubmitting(false);
        return;
      }

      await addDoc(collection(db, "appointments"), {
        barberId: selectedBarber.id,
        barberName: selectedBarber.name,
        barberEmail: selectedBarber.email || "",
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        serviceName: selectedService,
        date: selectedDate,
        time: selectedTime,
        notes: notes.trim(),
        status: "confirmed",
        createdAt: serverTimestamp(),
      });

      setIsSuccess(true);
    } catch (error) {
      console.error(error);
      alert("Алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setSelectedBarber(null);
    setIsSuccess(false);
    setSelectedTime("");
    setCustomerName("");
    setCustomerPhone("");
    setNotes("");
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="border-b border-neutral-800 bg-[#121212]/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img
              src="/icon.png"
              alt="Victoria Salon Logo"
              className="h-9 w-auto object-contain rounded-lg"
              onError={(e) => {
                // Хэрэв public/icon.png хараахан байхгүй бол хайчны дүрс харуулна
                (e.target as HTMLElement).style.display = "none";
              }}
            />
            <span className="font-extrabold text-lg tracking-wider text-amber-500">
              VICTORIA SALON
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/login"
              className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3.5 py-2 rounded-xl transition font-bold"
            >
              Үсчин нэвтрэх 🔐
            </Link>

            <a
              href="#barbers"
              className="bg-amber-500 text-black font-bold px-4 py-2 rounded-xl hover:bg-amber-400 transition text-xs shadow-md"
            >
              Цаг захиалах
            </a>
          </div>
        </div>
      </header>

      {/* Салоны танилцуулга */}
      <section className="max-w-6xl mx-auto px-6 pt-12 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="text-amber-500 text-xs font-bold uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              Мэргэжлийн үйлчилгээ
            </span>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight mt-4 mb-4 leading-tight">
              Танд тохирох <span className="text-amber-500">мастераа сонгон</span> цагаа товлоорой
            </h1>
            <p className="text-neutral-400 text-sm leading-relaxed mb-6">
              Манай салон нь мэргэжлийн үсчид, тухтай орчин, чанартай үйлчилгээг санал болгож байна.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-neutral-800">
              <div className="bg-neutral-900 p-3 rounded-xl border border-neutral-800">
                <p className="text-[11px] text-neutral-400">🕒 Үйлчилгээний цаг</p>
                <p className="font-bold text-xs mt-0.5">24/7 Цагийн сонголт</p>
                <p className="text-[10px] text-amber-500">Хуваарийн дагуу</p>
              </div>
              <div className="bg-neutral-900 p-3 rounded-xl border border-neutral-800">
                <p className="text-[11px] text-neutral-400">📍 Байршил</p>
                <p className="font-bold text-xs mt-0.5">Сүхбаатар дүүрэг</p>
                <p className="text-[10px] text-neutral-400">1-р хороо</p>
              </div>
              <div className="bg-neutral-900 p-3 rounded-xl border border-neutral-800 col-span-2 sm:col-span-1">
                <p className="text-[11px] text-neutral-400">📞 Холбогдох</p>
                <p className="font-bold text-xs mt-0.5">7711-XXXX</p>
                <p className="text-[10px] text-neutral-400">Урьдчилж лавлах</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop&q=80"
              alt="Salon Interior"
              className="rounded-3xl border border-neutral-800 object-cover w-full h-[320px]"
            />
          </div>
        </div>
      </section>

      {/* Үсчдийн каталог */}
      <section id="barbers" className="max-w-6xl mx-auto px-6 py-10 border-t border-neutral-900">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-3 border-b border-neutral-800">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold">Үсчдийн каталог</h2>
            <p className="text-xs text-neutral-400 mt-1">Туршлага, ур чадвартай нь танилцан сонголтоо хийнэ үү</p>
          </div>
          <span className="text-xs text-amber-500 font-semibold mt-2 sm:mt-0">
            {loadingBarbers ? "Уншиж байна..." : `Нийт ${barbers.length} үсчин бэлэн`}
          </span>
        </div>

        {loadingBarbers ? (
          <div className="py-20 text-center text-neutral-500 text-sm">
            Үсчдийг татаж байна...
          </div>
        ) : barbers.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-12 text-center text-neutral-500">
            Одоогоор бүртгэлтэй үсчин байхгүй байна.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {barbers.map((barber) => (
              <div
                key={barber.id}
                className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden hover:border-amber-500/50 transition flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-64 w-full overflow-hidden bg-neutral-800">
                    <img
                      src={barber.image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80"}
                      alt={barber.name}
                      className="w-full h-full object-cover object-top hover:scale-105 transition duration-300"
                    />
                    {barber.experience && (
                      <div className="absolute top-3 right-3 bg-neutral-950/80 backdrop-blur px-2.5 py-1 rounded-full border border-neutral-700 text-xs font-semibold text-amber-400">
                        {barber.experience}
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <h3 className="text-lg font-bold">{barber.name}</h3>
                    <p className="text-xs text-amber-500 font-medium">{barber.role}</p>
                    {barber.bio && (
                      <p className="text-xs text-neutral-400 mt-2 line-clamp-2 leading-relaxed">{barber.bio}</p>
                    )}

                    {barber.specialties && barber.specialties.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {barber.specialties.map((item, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded"
                          >
                            #{item}
                          </span>
                        ))}
                      </div>
                    )}

                    {barber.awards && barber.awards.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-neutral-800/80">
                        <p className="text-[11px] font-semibold text-neutral-400 mb-1">🏆 Шагнал, амжилт:</p>
                        <div className="flex flex-col gap-1">
                          {barber.awards.map((award, idx) => (
                            <span key={idx} className="text-[11px] text-neutral-300 truncate">
                              • {award}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <button
                    onClick={() => setSelectedBarber(barber)}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition text-sm shadow-md"
                  >
                    Цаг захиалах
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Захиалгын Модал Цонх */}
      {selectedBarber && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 relative">
            <button
              onClick={closeModal}
              className="absolute top-5 right-5 text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 w-8 h-8 rounded-full flex items-center justify-center text-sm"
            >
              ✕
            </button>

            {!isSuccess ? (
              <form onSubmit={handleBookingSubmit} className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-neutral-800">
                  <img
                    src={selectedBarber.image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80"}
                    alt={selectedBarber.name}
                    className="w-12 h-12 rounded-full object-cover border border-amber-500"
                  />
                  <div>
                    <h3 className="font-bold text-base">{selectedBarber.name} дээр цаг авах</h3>
                    <p className="text-xs text-neutral-400">{selectedBarber.role}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Үйлчилгээ сонгох:
                  </label>
                  <select
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500"
                  >
                    {SERVICES.map((s, idx) => (
                      <option key={idx} value={s.name}>
                        {s.name} ({s.price})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Огноо сонгох:
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setSelectedTime("");
                    }}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Боломжит цагууд:
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1 border border-neutral-800 rounded-xl">
                    {getAvailableHours().map((time) => {
                      const isBlocked = selectedBarber.blockedSlots?.includes(`${selectedDate}_${time}`);
                      const isAlreadyBooked = bookedTimes.includes(time);
                      const isUnavailable = isBlocked || isAlreadyBooked;
                      const isSelected = selectedTime === time;

                      return (
                        <button
                          key={time}
                          type="button"
                          disabled={isUnavailable}
                          onClick={() => setSelectedTime(time)}
                          className={`py-2 rounded-lg text-xs font-semibold transition border ${
                            isUnavailable
                              ? "bg-neutral-900 border-neutral-800 text-neutral-600 line-through cursor-not-allowed"
                              : isSelected
                              ? "bg-amber-500 text-black border-amber-500"
                              : "bg-neutral-800 border-neutral-700 text-neutral-200 hover:border-neutral-500"
                          }`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">Таны нэр:</label>
                    <input
                      required
                      type="text"
                      placeholder="Жишээ нь: Болд"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">Утасны дугаар:</label>
                    <input
                      required
                      type="tel"
                      placeholder="Жишээ нь: 99112233"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Нэмэлт хүсэлт:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Үсний зураг, санамж байвал бичнэ үү..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition text-sm mt-3 disabled:opacity-50"
                >
                  {submitting ? "Шалгаж баталгаажуулж байна..." : "Захиалга баталгаажуулах"}
                </button>
              </form>
            ) : (
              <div className="text-center py-6">
                <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
                  ✓
                </div>
                <h3 className="text-xl font-bold mb-1">Цаг амжилттай захиалагдлаа!</h3>
                <p className="text-xs text-neutral-400 mb-6">
                  {selectedBarber.name} мастер дээр {selectedDate} өдрийн {selectedTime} цагт таны цаг товлогдлоо.
                </p>

                <div className="bg-neutral-800/80 border border-neutral-700 p-4 rounded-2xl text-left mb-6">
                  <p className="text-xs text-amber-400 font-semibold mb-1">💳 Төлбөрийн санамж:</p>
                  <p className="text-xs text-neutral-300">
                    Урьдчилгаа төлбөр шаардлагагүй. Салон дээр ирээд кассан дээрх QPay QR кодоор тооцоогоо хийнэ.
                  </p>
                </div>

                <button
                  onClick={closeModal}
                  className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded-xl text-sm transition"
                >
                  Хаах
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}