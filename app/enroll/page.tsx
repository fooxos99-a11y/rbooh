"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase-client";
import { toast } from "@/hooks/use-toast";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SiteLoader } from "@/components/ui/site-loader"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { User, Phone, Hash, GraduationCap, BookOpen, UserPlus, ChevronDown } from "lucide-react";
import {
  formatPartialJuzRange,
  formatEnrollmentMemorizedAmount,
  getContiguousSelectedJuzRange,
  getJuzAyahBoundsForSurah,
  getJuzSurahOptions,
  getPartialJuzRangeForJuz,
  isFullJuzPageRange,
  normalizeEnrollmentPartialJuzRanges,
  type EnrollmentPartialJuzRange,
} from "@/lib/enrollment-test-utils";

const ALL_JUZS = Array.from({ length: 30 }, (_, index) => index + 1);

export default function EnrollPage() {
  const pendingJuzClickRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isEnrollmentOpen, setIsEnrollmentOpen] = useState(true);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isMemorizedDialogOpen, setIsMemorizedDialogOpen] = useState(false);
  const [editingPartialJuzRange, setEditingPartialJuzRange] = useState<{
    juzNumber: number;
    startSurahNumber: number;
    startAyahNumber: number;
    endSurahNumber: number;
    endAyahNumber: number;
  } | null>(null);
  
  useEffect(() => {
    const fetchEnrollmentStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('programs')
          .select('is_active')
          .eq('id', '00000000-0000-0000-0000-000000000000')
          .maybeSingle();
        
        if (!error && data) {
          setIsEnrollmentOpen(data.is_active);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingStatus(false);
      }
    };
    
    fetchEnrollmentStatus();
  }, []);
  const [formData, setFormData] = useState({
    fullName: "",
    guardianPhone: "",
    idNumber: "",
    educationalStage: "",
    selectedJuzs: [] as number[],
    partialJuzRanges: [] as EnrollmentPartialJuzRange[],
  });

  const memorizedSummary = useMemo(
    () => formatEnrollmentMemorizedAmount(undefined, formData.selectedJuzs, formData.partialJuzRanges),
    [formData.partialJuzRanges, formData.selectedJuzs],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name } = e.target;
    let value = e.target.value;
    
    // Only allow numbers for ID and Phone
    if (name === "idNumber" || name === "guardianPhone") {
      value = value.replace(/\D/g, "");
    }

    setFormData((current) => ({ ...current, [name]: value }));
  };

  const toggleFullJuzSelection = (juzNumber: number) => {
    setFormData((current) => {
      const selectedJuzs = current.selectedJuzs.includes(juzNumber)
        ? current.selectedJuzs.filter((item) => item !== juzNumber)
        : [...current.selectedJuzs, juzNumber].sort((left, right) => left - right);
      const partialJuzRanges = current.partialJuzRanges.filter((range) => range.juzNumber !== juzNumber);

      return {
        ...current,
        selectedJuzs,
        partialJuzRanges,
      };
    });
  };

  const handleSingleJuzClick = (juzNumber: number) => {
    if (pendingJuzClickRef.current) {
      window.clearTimeout(pendingJuzClickRef.current);
    }

    pendingJuzClickRef.current = window.setTimeout(() => {
      toggleFullJuzSelection(juzNumber);
      pendingJuzClickRef.current = null;
    }, 220);
  };

  const handleDoubleJuzClick = (juzNumber: number) => {
    if (pendingJuzClickRef.current) {
      window.clearTimeout(pendingJuzClickRef.current);
      pendingJuzClickRef.current = null;
    }

    openPartialJuzRangeDialog(juzNumber);
  };

  const openPartialJuzRangeDialog = (juzNumber: number) => {
    const surahOptions = getJuzSurahOptions(juzNumber);
    if (surahOptions.length === 0) {
      return;
    }

    const existingRange = getPartialJuzRangeForJuz(juzNumber, formData.partialJuzRanges);
    const firstSurah = surahOptions[0];
    const lastSurah = surahOptions[surahOptions.length - 1];

    setEditingPartialJuzRange({
      juzNumber,
      startSurahNumber: existingRange?.startSurahNumber ?? firstSurah.surahNumber,
      startAyahNumber: existingRange?.startAyahNumber ?? firstSurah.minAyah,
      endSurahNumber: existingRange?.endSurahNumber ?? lastSurah.surahNumber,
      endAyahNumber: existingRange?.endAyahNumber ?? lastSurah.maxAyah,
    });
  };

  const savePartialJuzRange = () => {
    if (!editingPartialJuzRange) {
      return;
    }

    const normalizedRange = normalizeEnrollmentPartialJuzRanges([editingPartialJuzRange])[0];
    if (!normalizedRange) {
      return;
    }

    setFormData((current) => {
      const selectedJuzsWithoutCurrent = current.selectedJuzs.filter((item) => item !== normalizedRange.juzNumber);
      const partialRangesWithoutCurrent = current.partialJuzRanges.filter((range) => range.juzNumber !== normalizedRange.juzNumber);

      if (isFullJuzPageRange(normalizedRange)) {
        return {
          ...current,
          selectedJuzs: [...selectedJuzsWithoutCurrent, normalizedRange.juzNumber].sort((left, right) => left - right),
          partialJuzRanges: partialRangesWithoutCurrent,
        };
      }

      return {
        ...current,
        selectedJuzs: selectedJuzsWithoutCurrent,
        partialJuzRanges: [...partialRangesWithoutCurrent, normalizedRange].sort((left, right) => left.juzNumber - right.juzNumber),
      };
    });

    setEditingPartialJuzRange(null);
  };

  const clearPartialJuzRange = (juzNumber: number) => {
    setFormData((current) => ({
      ...current,
      partialJuzRanges: current.partialJuzRanges.filter((range) => range.juzNumber !== juzNumber),
    }));
    setEditingPartialJuzRange((current) => (current?.juzNumber === juzNumber ? null : current));
  };

  const clearSelectedJuzs = () => {
    setFormData((current) => ({
      ...current,
      selectedJuzs: [],
      partialJuzRanges: [],
    }));
  };

  useEffect(() => {
    return () => {
      if (pendingJuzClickRef.current) {
        window.clearTimeout(pendingJuzClickRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEnrollmentOpen) {
      toast({ title: "عذرًا، التسجيل مغلق حاليًا", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    try {
      const normalizedPartialJuzRanges = normalizeEnrollmentPartialJuzRanges(formData.partialJuzRanges);
      const contiguousRange = normalizedPartialJuzRanges.length === 0 ? getContiguousSelectedJuzRange(formData.selectedJuzs) : null;
      const { error } = await supabase.from("enrollment_requests").insert([
        {
          full_name: formData.fullName,
          guardian_phone: formData.guardianPhone,
          id_number: formData.idNumber,
          educational_stage: formData.educationalStage,
          memorized_amount: contiguousRange ? `${contiguousRange.fromJuz}-${contiguousRange.toJuz}` : "",
          selected_juzs: formData.selectedJuzs,
          partial_juz_ranges: normalizedPartialJuzRanges,
        },
      ]);

      if (error) throw error;

      toast({ title: "تم إرسال طلب التسجيل بنجاح!", variant: "default" });
      setFormData({
        fullName: "",
        guardianPhone: "",
        idNumber: "",
        educationalStage: "",
        selectedJuzs: [],
        partialJuzRanges: [],
      });
      setIsMemorizedDialogOpen(false);
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
      // Optionally redirect or show a success message
    } catch (error: any) {
      console.error('Error submitting request:', JSON.stringify(error, null, 2)); console.error('Error raw:', error);
      toast({ title: error.message || "حدث خطأ أثناء إرسال الطلب", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f5f1e8] to-white dir-rtl font-cairo">
      <Header />
      
      <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-2xl md:text-4xl font-bold text-[#023232] mb-2 md:mb-3">طلب تسجيل</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-[#3453a7]/20 relative p-6 md:p-8">

            {isLoadingStatus ? (
              <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in duration-300">
                <SiteLoader size="lg" />
              </div>
            ) : !isEnrollmentOpen ? (
              <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in duration-300">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-red-600 mb-2">عذرًا، التسجيل مغلق حاليًا</h3>
                <p className="text-gray-500">تم إيقاف التسجيل في المجمع في الوقت الحالي.</p>
              </div>
            ) : (
              <>
                {isSuccess && (
                  <div className="absolute inset-0 bg-white rounded-2xl flex flex-col items-center justify-center z-10 animate-in fade-in duration-300 left-0 top-0 w-full h-full">
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-10 h-10 text-green-500 animate-in zoom-in duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-[#023232] mb-2">تم الإرسال بنجاح!</h3>
                    <p className="text-gray-500">سيتم التواصل معك قريبًا.</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
              <div className="space-y-2">
                <label htmlFor="fullName" className="text-[#023232] font-semibold text-sm md:text-base flex items-center gap-2">
                  <User className="w-4 h-4 text-[#003f55]" />
                  الاسم الثلاثي للطالب <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full h-12 px-4 text-base border-2 border-gray-200 rounded-lg focus:ring-0 focus:border-[#3453a7] outline-none transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="guardianPhone" className="text-[#023232] font-semibold text-sm md:text-base flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#003f55]" />
                  رقم ولي الأمر <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="guardianPhone"
                  name="guardianPhone"
                    maxLength={10}
                    required
                  value={formData.guardianPhone}
                  onChange={handleChange}
                  className="w-full h-12 px-4 text-base border-2 border-gray-200 rounded-lg focus:ring-0 focus:border-[#3453a7] outline-none transition-colors text-right"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="idNumber" className="text-[#023232] font-semibold text-sm md:text-base flex items-center gap-2">
                  <Hash className="w-4 h-4 text-[#003f55]" />
                  رقم الهوية <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="idNumber"
                  name="idNumber"
                    maxLength={10}
                    required
                  value={formData.idNumber}
                  onChange={handleChange}
                  className="w-full h-12 px-4 text-base border-2 border-gray-200 rounded-lg focus:ring-0 focus:border-[#3453a7] outline-none transition-colors"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="educationalStage" className="text-[#023232] font-semibold text-sm md:text-base flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-[#003f55]" />
                  العمر <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="educationalStage"
                  name="educationalStage"
                  required
                  value={formData.educationalStage}
                  onChange={handleChange}
                  className="w-full h-12 px-4 text-base border-2 border-gray-200 rounded-lg focus:ring-0 focus:border-[#3453a7] outline-none transition-colors"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[#023232] font-semibold text-sm md:text-base flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#003f55]" />
                  المحفوظ <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3 rounded-xl border-2 border-gray-200 p-3">
                  <button
                    type="button"
                    onClick={() => setIsMemorizedDialogOpen(true)}
                    className="flex h-12 w-full items-center justify-between rounded-lg border border-[#3453a7]/20 bg-[#fafcff] px-4 text-base text-[#023232] transition-colors hover:bg-[#f3f7ff]"
                  >
                    <span>{formData.selectedJuzs.length === 0 && formData.partialJuzRanges.length === 0 ? "لا يوجد حفظ سابق" : memorizedSummary}</span>
                    <ChevronDown className="h-4 w-4 text-[#3453a7]" />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 md:h-14 bg-white border border-[#3453a7]/35 hover:bg-[#f7f9ff] text-neutral-600 font-medium text-base md:text-lg rounded-lg transition-all duration-300 flex justify-center items-center gap-2 mt-4"
              >
                {isSubmitting ? (
                  <>
                    <SiteLoader color="#525252" />
                    <span>جاري الإرسال...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 text-neutral-600" />
                    <span>إرسال الطلب</span>
                  </>
                )}
              </button>
            </form>
            </>
            )}
          </div>
        </div>
      </main>

      <Footer />

      <Dialog open={isMemorizedDialogOpen} onOpenChange={setIsMemorizedDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-[92vw] sm:w-[470px] sm:max-w-[470px] overflow-hidden rounded-[26px] border border-[#3453a7]/18 bg-[linear-gradient(180deg,#f8fbff_0%,#f6f9ff_100%)] p-0 shadow-[0_26px_60px_-40px_rgba(52,83,167,0.34)]" dir="rtl">
          <DialogHeader className="border-b border-[#3453a7]/10 bg-[linear-gradient(180deg,rgba(237,243,255,0.96)_0%,rgba(248,251,255,0.94)_100%)] px-4 py-4 text-right sm:px-5">
            <DialogTitle className="text-right text-xl font-black text-black">اختيار المحفوظ</DialogTitle>
            <DialogDescription className="mt-1 text-right text-sm leading-6 text-[#5f6b7a]">
              اختر الأجزاء التي تحفظها. ضغطة واحدة تحدد الجزء كاملًا، وضغطتان اذا كنت حافظ بعض من الجزء.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 bg-[linear-gradient(180deg,rgba(248,251,255,0.86)_0%,rgba(255,255,255,0.94)_100%)] px-2.5 py-2.5 sm:px-3 sm:py-3">
            <div className="flex items-center justify-end gap-3">
              {(formData.selectedJuzs.length > 0 || formData.partialJuzRanges.length > 0) && (
                <button
                  type="button"
                  onClick={clearSelectedJuzs}
                  className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-bold text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                >
                  مسح التحديد
                </button>
              )}
            </div>

            <div className="mx-auto w-fit space-y-0.5">
              {Array.from({ length: Math.ceil(ALL_JUZS.length / 6) }, (_, rowIndex) => {
                const rowItems = ALL_JUZS.slice(rowIndex * 6, rowIndex * 6 + 6).slice().reverse();

                return (
                  <div key={`juz-row-${rowIndex}`} className="flex justify-end gap-0.5" dir="ltr">
                    {rowItems.map((juzNumber) => {
                      const isSelected = formData.selectedJuzs.includes(juzNumber);
                      const partialRange = getPartialJuzRangeForJuz(juzNumber, formData.partialJuzRanges);

                      return (
                        <button
                          type="button"
                          key={juzNumber}
                          onClick={() => handleSingleJuzClick(juzNumber)}
                          onDoubleClick={() => handleDoubleJuzClick(juzNumber)}
                          className={`flex h-[44px] w-[62px] items-center justify-center rounded-[13px] border px-1 py-1 text-[#1a2332] transition-all ${isSelected ? "border-[#3453a7] bg-[#3453a7] text-white shadow-[0_14px_24px_-22px_rgba(52,83,167,0.52)]" : partialRange ? "border-[#76a8e8] bg-[linear-gradient(180deg,#eef4ff_0%,#f8fbff_100%)] text-[#3453a7] shadow-[0_12px_20px_-24px_rgba(52,83,167,0.28)]" : "border-[#dbe3f4] bg-white/94 hover:border-[#3453a7]/28 hover:bg-[#fafcff]"}`}
                        >
                          <span className={`text-[1.05rem] font-black leading-none ${isSelected ? "text-white" : "text-[#1a2332]"}`}>{juzNumber}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-0.5">
              <button
                type="button"
                onClick={() => setIsMemorizedDialogOpen(false)}
                className="h-9 rounded-2xl bg-[#3453a7] px-5 text-sm font-bold text-white transition-colors hover:bg-[#27428d]"
              >
                تم
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingPartialJuzRange)} onOpenChange={(open) => !open && setEditingPartialJuzRange(null)}>
        <DialogContent className="max-w-[92vw] sm:max-w-[372px] overflow-hidden rounded-[24px] border border-[#3453a7]/16 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-0 shadow-[0_24px_60px_-40px_rgba(52,83,167,0.38)]" dir="rtl">
          <DialogHeader className="border-b border-[#3453a7]/10 bg-[linear-gradient(180deg,rgba(237,243,255,0.94)_0%,rgba(248,251,255,0.94)_100%)] px-5 py-4 text-right">
            <DialogTitle className="text-right text-lg font-black text-[#023232]">
              {editingPartialJuzRange ? `تحديد المحفوظ داخل ${editingPartialJuzRange.juzNumber}` : "تحديد جزئي"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-right text-sm leading-6 text-[#5f6b7a]">
              اختر من السورة والآية التي يبدأ منها الحفظ إلى السورة والآية التي ينتهي عندها داخل هذا الجزء.
            </DialogDescription>
          </DialogHeader>

          {editingPartialJuzRange ? (() => {
            const surahOptions = getJuzSurahOptions(editingPartialJuzRange.juzNumber);
            const startSurahBounds = getJuzAyahBoundsForSurah(editingPartialJuzRange.juzNumber, editingPartialJuzRange.startSurahNumber);
            const endSurahBounds = getJuzAyahBoundsForSurah(editingPartialJuzRange.juzNumber, editingPartialJuzRange.endSurahNumber);
            if (surahOptions.length === 0 || !startSurahBounds || !endSurahBounds) return null;

            const startAyahOptions = Array.from(
              { length: startSurahBounds.maxAyah - startSurahBounds.minAyah + 1 },
              (_, index) => startSurahBounds.minAyah + index,
            );
            const endAyahOptions = Array.from(
              { length: endSurahBounds.maxAyah - endSurahBounds.minAyah + 1 },
              (_, index) => endSurahBounds.minAyah + index,
            );

            return (
              <div className="space-y-3 bg-[linear-gradient(180deg,rgba(248,251,255,0.84)_0%,rgba(255,255,255,0.96)_100%)] px-4 py-3">
                <div className="grid grid-cols-1 gap-3">
                  <div className="rounded-2xl border border-[#dbe3f4] bg-[#f4f8ff] px-3 py-3 text-sm font-semibold text-[#3453a7]">
                    <div className="text-xs font-black tracking-[0.12em] text-[#3453a7]">من</div>
                    <div className="mt-2 grid grid-cols-[1.5fr_1fr] gap-2">
                      <select
                        value={editingPartialJuzRange.startSurahNumber}
                        onChange={(event) => {
                          const nextSurahNumber = Number.parseInt(event.target.value, 10);
                          const nextBounds = getJuzAyahBoundsForSurah(editingPartialJuzRange.juzNumber, nextSurahNumber);
                          if (!nextBounds) return;
                          setEditingPartialJuzRange((current) => current ? {
                            ...current,
                            startSurahNumber: nextSurahNumber,
                            startAyahNumber: nextBounds.minAyah,
                          } : current);
                        }}
                        className="h-10 w-full rounded-xl border border-[#d7e1f5] bg-white px-3 text-sm font-bold text-[#1a2332] outline-none focus:border-[#3453a7]"
                      >
                        {surahOptions.map((surah) => (
                          <option key={`start-surah-${surah.surahNumber}`} value={surah.surahNumber}>{surah.surahName}</option>
                        ))}
                      </select>
                      <select
                        value={editingPartialJuzRange.startAyahNumber}
                        onChange={(event) => setEditingPartialJuzRange((current) => current ? { ...current, startAyahNumber: Number.parseInt(event.target.value, 10) } : current)}
                        className="h-10 w-full rounded-xl border border-[#d7e1f5] bg-white px-3 text-sm font-bold text-[#1a2332] outline-none focus:border-[#3453a7]"
                      >
                        {startAyahOptions.map((ayahNumber) => (
                          <option key={`start-ayah-${ayahNumber}`} value={ayahNumber}>آية {ayahNumber}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#dbe3f4] bg-[#f4f8ff] px-3 py-3 text-sm font-semibold text-[#3453a7]">
                    <div className="text-xs font-black tracking-[0.12em] text-[#3453a7]">إلى</div>
                    <div className="mt-2 grid grid-cols-[1.5fr_1fr] gap-2">
                      <select
                        value={editingPartialJuzRange.endSurahNumber}
                        onChange={(event) => {
                          const nextSurahNumber = Number.parseInt(event.target.value, 10);
                          const nextBounds = getJuzAyahBoundsForSurah(editingPartialJuzRange.juzNumber, nextSurahNumber);
                          if (!nextBounds) return;
                          setEditingPartialJuzRange((current) => current ? {
                            ...current,
                            endSurahNumber: nextSurahNumber,
                            endAyahNumber: nextBounds.maxAyah,
                          } : current);
                        }}
                        className="h-10 w-full rounded-xl border border-[#d7e1f5] bg-white px-3 text-sm font-bold text-[#1a2332] outline-none focus:border-[#3453a7]"
                      >
                        {surahOptions.map((surah) => (
                          <option key={`end-surah-${surah.surahNumber}`} value={surah.surahNumber}>{surah.surahName}</option>
                        ))}
                      </select>
                      <select
                        value={editingPartialJuzRange.endAyahNumber}
                        onChange={(event) => setEditingPartialJuzRange((current) => current ? { ...current, endAyahNumber: Number.parseInt(event.target.value, 10) } : current)}
                        className="h-10 w-full rounded-xl border border-[#d7e1f5] bg-white px-3 text-sm font-bold text-[#1a2332] outline-none focus:border-[#3453a7]"
                      >
                        {endAyahOptions.map((ayahNumber) => (
                          <option key={`end-ayah-${ayahNumber}`} value={ayahNumber}>آية {ayahNumber}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2 pt-0.5">
                  {getPartialJuzRangeForJuz(editingPartialJuzRange.juzNumber, formData.partialJuzRanges) ? (
                    <button
                      type="button"
                      onClick={() => clearPartialJuzRange(editingPartialJuzRange.juzNumber)}
                      className="h-10 rounded-xl border border-red-200 bg-white px-4 text-sm font-bold text-red-600 transition-colors hover:bg-red-50"
                    >
                      حذف التحديد الجزئي
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setEditingPartialJuzRange(null)}
                    className="h-10 rounded-xl border border-[#d7e1f5] bg-white px-4 text-sm font-bold text-[#6b7280] transition-colors hover:bg-[#f8fafc]"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={savePartialJuzRange}
                    className="h-10 rounded-xl bg-[#3453a7] px-5 text-sm font-black text-white transition-colors hover:bg-[#27428d]"
                  >
                    حفظ التحديد
                  </button>
                </div>
              </div>
            );
          })() : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}


