"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-client";
import { toast } from "@/hooks/use-toast";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SiteLoader } from "@/components/ui/site-loader"
import { UserPlus, User, Phone, Hash, GraduationCap, Flag, Lock } from "lucide-react";

export default function EnrollPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isEnrollmentOpen, setIsEnrollmentOpen] = useState(true);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  
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
    nationality: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEnrollmentOpen) {
      toast({ title: "عذراً، التسجيل مغلق حالياً", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("enrollment_requests").insert([
        {
          full_name: formData.fullName,
          guardian_phone: formData.guardianPhone,
          id_number: formData.idNumber,
          educational_stage: formData.educationalStage,
          nationality: formData.nationality,
        },
      ]);

      if (error) throw error;

      toast({ title: "تم إرسال طلب الإلتحاق بنجاح!", variant: "default" });
      setFormData({
        fullName: "",
        guardianPhone: "",
        idNumber: "",
        educationalStage: "",
        nationality: "",
      });
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
      // Optionally redirect or show a success message
    } catch (error: any) {
      console.error("Error submitting request:", error);
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
            <h1 className="text-2xl md:text-4xl font-bold text-[#023232] mb-2 md:mb-3">طلب الإلتحاق بالمجمع</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-[#d8a355]/30 relative p-6 md:p-8">

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
                <h3 className="text-xl font-bold text-red-600 mb-2">عذراً، التسجيل مغلق حالياً</h3>
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
                    <p className="text-gray-500">سيتم التواصل معك قريباً.</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
              <div className="space-y-2">
                <label htmlFor="fullName" className="text-[#023232] font-semibold text-sm md:text-base flex items-center gap-2">
                  <User className="w-4 h-4 text-[#d8a355]" />
                  الاسم الثلاثي للطالب <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full h-12 px-4 text-base border-2 border-gray-200 rounded-lg focus:ring-0 focus:border-[#d8a355] outline-none transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="guardianPhone" className="text-[#023232] font-semibold text-sm md:text-base flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#d8a355]" />
                  رقم ولي الأمر <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="guardianPhone"
                  name="guardianPhone"
                  required
                  value={formData.guardianPhone}
                  onChange={handleChange}
                  className="w-full h-12 px-4 text-base border-2 border-gray-200 rounded-lg focus:ring-0 focus:border-[#d8a355] outline-none transition-colors text-right"
                  placeholder="05XXXXXXXX"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="idNumber" className="text-[#023232] font-semibold text-sm md:text-base flex items-center gap-2">
                  <Hash className="w-4 h-4 text-[#d8a355]" />
                  رقم الهوية <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="idNumber"
                  name="idNumber"
                  required
                  value={formData.idNumber}
                  onChange={handleChange}
                  className="w-full h-12 px-4 text-base border-2 border-gray-200 rounded-lg focus:ring-0 focus:border-[#d8a355] outline-none transition-colors"
                  placeholder="10XXXXXXXX"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="educationalStage" className="text-[#023232] font-semibold text-sm md:text-base flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-[#d8a355]" />
                  المرحلة الدراسية <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="educationalStage"
                  name="educationalStage"
                  required
                  value={formData.educationalStage}
                  onChange={handleChange}
                  className="w-full h-12 px-4 text-base border-2 border-gray-200 rounded-lg focus:ring-0 focus:border-[#d8a355] outline-none transition-colors"
                  placeholder="مثال: ثالث متوسط"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="nationality" className="text-[#023232] font-semibold text-sm md:text-base flex items-center gap-2">
                  <Flag className="w-4 h-4 text-[#d8a355]" />
                  الجنسية <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="nationality"
                  name="nationality"
                  required
                  value={formData.nationality}
                  onChange={handleChange}
                  className="w-full h-12 px-4 text-base border-2 border-gray-200 rounded-lg focus:ring-0 focus:border-[#d8a355] outline-none transition-colors"
                  placeholder="سعودي"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 md:h-14 bg-white border border-[#D4AF37]/50 hover:bg-neutral-50 text-neutral-600 font-medium text-base md:text-lg rounded-lg transition-all duration-300 flex justify-center items-center gap-2 mt-4"
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
    </div>
  );
}
