"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SiteLoader } from "@/components/ui/site-loader"
import { Copy, Check, ExternalLink, Lock, Unlock, Trash2 } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-client";
import { toast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/use-admin-auth"

interface EnrollmentRequest {
  id: string;
  full_name: string;
  guardian_phone: string;
  id_number: string;
  educational_stage: string;
  nationality: string;
  created_at: string;
}

export default function EnrollmentRequestsPage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("طلبات التسجيل");

  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isEnrollmentOpen, setIsEnrollmentOpen] = useState(true);
  const [isStatusLoading, setIsStatusLoading] = useState(false);

  useEffect(() => {
    fetchRequests();
    fetchEnrollmentStatus();
  }, []);

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
    }
  };

  const toggleEnrollmentStatus = async () => {
    setIsStatusLoading(true);
    const newStatus = !isEnrollmentOpen;
    try {
      const { error } = await supabase
        .from('programs')
        .upsert({
          id: '00000000-0000-0000-0000-000000000000',
          name: 'ENROLLMENT_STATUS',
          is_active: newStatus,
          date: 'status',
          duration: 'status',
          points: 0,
          description: 'ENROLLMENT_STATUS'
        });
        
      if (!error) {
        setIsEnrollmentOpen(newStatus);
        toast({ title: newStatus ? "تم فتح استقبال طلبات التسجيل" : "تم إغلاق طلبات التسجيل" });
      } else {
        toast({ title: "حدث خطأ أثناء تغيير الحالة", variant: "destructive" });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsStatusLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("enrollment_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error("Error fetching requests:", error);
      toast({ title: "حدث خطأ أثناء جلب طلبات التسجيل", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const deleteRequest = async (id: string) => {
    try {
      const { error } = await supabase
        .from("enrollment_requests")
        .delete()
        .eq("id", id);
        
      if (error) throw error;
      
      setRequests(requests.filter(req => req.id !== id));
      toast({ title: "تم حذف الطلب بنجاح" });
    } catch (error: any) {
      console.error("Error deleting request:", error);
      toast({ title: "حدث خطأ أثناء حذف الطلب", variant: "destructive" });
    }
  };

  const copyEnrollmentLink = () => {
    const link = `${window.location.origin}/enroll`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast({ title: "تم نسخ الرابط بنجاح" });
    setTimeout(() => setCopiedLink(false), 3000);
  };

    if (authLoading || !authVerified) return <SiteLoader fullScreen />;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa] dir-rtl font-cairo">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-[#1a2332]">طلبات التسجيل</h1>
            </div>
            <p className="text-neutral-500">
              قائمة بالطلاب الذين قاموا بطلب التسجيل عبر الرابط
            </p>
          </div>

          <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
            <button
              onClick={toggleEnrollmentStatus}
              disabled={isStatusLoading}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all shadow-sm ${
                isEnrollmentOpen 
                  ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100" 
                  : "bg-green-50 text-green-600 border border-green-200 hover:bg-green-100"
              }`}
              title={isEnrollmentOpen ? "إيقاف استقبال طلبات التسجيل" : "تفعيل استقبال طلبات التسجيل"}
            >
              {isStatusLoading ? (
                <SiteLoader color={isEnrollmentOpen ? "#dc2626" : "#16a34a"} />
              ) : isEnrollmentOpen ? (
                <Lock className="w-5 h-5" />
              ) : (
                <Unlock className="w-5 h-5" />
              )}
              <span className="hidden sm:inline">
                {isEnrollmentOpen ? "إقفال التسجيل" : "فتح التسجيل"}
              </span>
            </button>
            <button
              onClick={copyEnrollmentLink}
              className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#C9A961] text-white px-4 py-2.5 rounded-xl font-medium transition-all shadow-sm"
            >
              {copiedLink ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              <span className="hidden sm:inline">نسخ الرابط</span>
            </button>
            <Link
              href="/enroll"
              target="_blank"
              className="flex items-center gap-2 bg-white border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/5 px-4 py-2.5 rounded-xl font-medium transition-all shadow-sm"
              title="معاينة نموذج التسجيل"
            >
              <ExternalLink className="w-5 h-5" />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[#D4AF37]/20 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <SiteLoader />
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-xl text-neutral-400">لا توجد طلبات تسجيل حتى الآن</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-[#f5f1e8] text-[#023232]">
                  <tr>
                    <th className="px-6 py-4 font-semibold first:rounded-tr-2xl">الاسم الثلاثي</th>
                    <th className="px-6 py-4 font-semibold">رقم ولي الأمر</th>
                    <th className="px-6 py-4 font-semibold">رقم الهوية</th>
                    <th className="px-6 py-4 font-semibold">المرحلة الدراسية</th>
                    <th className="px-6 py-4 font-semibold">الجنسية</th>
                    <th className="px-6 py-4 font-semibold">تاريخ الطلب</th>
                    <th className="px-6 py-4 font-semibold last:rounded-tl-2xl">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D4AF37]/10">
                  {requests.map((request) => (
                    <tr
                      key={request.id}
                      className="hover:bg-[#D4AF37]/5 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        {request.full_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 dir-ltr text-right">
                        {request.guardian_phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 dir-ltr text-right">
                        {request.id_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {request.educational_stage}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {request.nationality}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">
                        {new Date(request.created_at).toLocaleString("ar-SA", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => deleteRequest(request.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors flex justify-center items-center w-8 h-8"
                          title="حذف الطلب"
                        >
                          <Trash2 className="w-5 h-5 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
