"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase-client";
import { toast } from "@/hooks/use-toast";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SiteLoader } from "@/components/ui/site-loader"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { User, Phone, Hash, GraduationCap, BookOpen, UserPlus, ChevronDown } from "lucide-react";
import { formatEnrollmentMemorizedAmount, getContiguousSelectedJuzRange } from "@/lib/enrollment-test-utils";

const ALL_JUZS = Array.from({ length: 30 }, (_, index) => index + 1);

export default function EnrollPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isEnrollmentOpen, setIsEnrollmentOpen] = useState(true);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isMemorizedDialogOpen, setIsMemorizedDialogOpen] = useState(false);
  
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
  });

  const memorizedSummary = useMemo(
    () => formatEnrollmentMemorizedAmount(undefined, formData.selectedJuzs),
    [formData.selectedJuzs],
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

  const toggleJuzSelection = (juzNumber: number) => {
    setFormData((current) => {
      const selectedJuzs = current.selectedJuzs.includes(juzNumber)
        ? current.selectedJuzs.filter((item) => item !== juzNumber)
        : [...current.selectedJuzs, juzNumber].sort((left, right) => left - right);

      return {
        ...current,
        selectedJuzs,
      };
    });
  };

  const clearSelectedJuzs = () => {
    setFormData((current) => ({
      ...current,
      selectedJuzs: [],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEnrollmentOpen) {
      toast({ title: "عذرًا، التسجيل مغلق حاليًا", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    try {
      const contiguousRange = getContiguousSelectedJuzRange(formData.selectedJuzs);
      const { error } = await supabase.from("enrollment_requests").insert([
        {
          full_name: formData.fullName,
          guardian_phone: formData.guardianPhone,
          id_number: formData.idNumber,
          educational_stage: formData.educationalStage,
          memorized_amount: contiguousRange ? `${contiguousRange.fromJuz}-${contiguousRange.toJuz}` : "",
          selected_juzs: formData.selectedJuzs,
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
                    <span>{formData.selectedJuzs.length === 0 ? "لا يوجد حفظ سابق" : memorizedSummary}</span>
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
        <DialogContent className="max-w-[92vw] sm:max-w-[620px] rounded-2xl border-[#3453a7]/20 p-0" dir="rtl">
          <DialogHeader className="border-b border-[#3453a7]/15 bg-[#fafcff] px-5 py-4 text-right">
            <DialogTitle className="text-right text-lg font-bold text-[#023232]">اختيار المحفوظ</DialogTitle>
            <DialogDescription className="text-right text-sm text-gray-500">
              اختر الأجزاء التي يحفظها الطالب، حتى لو كانت متفرقة.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#023232]">
                {formData.selectedJuzs.length === 0 ? "لا يوجد حفظ سابق" : memorizedSummary}
              </p>
              {formData.selectedJuzs.length > 0 && (
                <button
                  type="button"
                  onClick={clearSelectedJuzs}
                  className="text-xs font-semibold text-red-600 transition-colors hover:text-red-700"
                >
                  مسح التحديد
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ALL_JUZS.map((juzNumber) => {
                const isSelected = formData.selectedJuzs.includes(juzNumber);

                return (
                  <label
                    key={juzNumber}
                    className={`plan-history-checkbox w-full justify-between rounded-2xl border px-4 py-3 text-[#1a2332] transition-colors ${isSelected ? "border-[#3453a7] bg-[#f3f7ff]" : "border-gray-200 bg-white hover:border-[#3453a7]/35"}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleJuzSelection(juzNumber)}
                    />
                    <span className="plan-history-checkbox__label text-base font-bold leading-none">{juzNumber}</span>
                    <span className="plan-history-checkbox__mark" aria-hidden="true" />
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsMemorizedDialogOpen(false)}
                className="h-11 rounded-xl bg-[#3453a7] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#27428d]"
              >
                تم
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


