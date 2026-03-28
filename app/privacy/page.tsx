import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield } from "lucide-react"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(circle_at_top,#eef6f8_0%,#f7fbff_45%,#ffffff_100%)]">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-10 rounded-[32px] border border-[#3453a7]/12 bg-white/90 p-8 text-center shadow-[0_24px_70px_-48px_rgba(52,83,167,0.35)] backdrop-blur-sm">
            <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-[24px] bg-[linear-gradient(135deg,#3453a7_0%,#4f6fc7_100%)] shadow-lg shadow-[#3453a7]/20">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="mb-4 text-4xl font-black text-[#1a2332] md:text-5xl">سياسة الخصوصية</h1>
            <p className="text-lg font-semibold text-[#4d6b76] md:text-xl">كيف نحمي ونستخدم بياناتك الشخصية داخل برنامج الربوة</p>
          </div>

          <Card className="border border-[#3453a7]/15 bg-white/95 shadow-[0_24px_70px_-52px_rgba(26,35,50,0.3)]">
            <CardHeader className="border-b border-[#3453a7]/10 bg-[linear-gradient(135deg,rgba(52,83,167,0.08),rgba(52,83,167,0.02))]">
              <CardTitle className="text-2xl font-black text-[#1a2332]">التزامنا بخصوصيتك</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6 text-lg leading-relaxed text-[#1a2332]">
              <p>
                في برنامج الربوة، نحن ملتزمون بحماية خصوصيتك وأمان معلوماتك الشخصية. توضح هذه السياسة كيفية جمع
                واستخدام وحماية بياناتك.
              </p>

              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-[#3453a7]">1. المعلومات التي نجمعها</h3>
                <p>نقوم بجمع المعلومات التالية لتقديم خدماتنا بشكل أفضل:</p>
                <ul className="list-disc list-inside space-y-2 mr-6">
                  <li>المعلومات الشخصية الأساسية (الاسم، رقم الطالب)</li>
                  <li>معلومات الحلقة والمستوى الدراسي</li>
                  <li>سجلات الحضور والتقدم في الحفظ</li>
                  <li>الإنجازات والنقاط المكتسبة</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-[#3453a7]">2. كيف نستخدم معلوماتك</h3>
                <p>نستخدم المعلومات المجمعة للأغراض التالية:</p>
                <ul className="list-disc list-inside space-y-2 mr-6">
                  <li>تقديم وتحسين خدماتنا التعليمية</li>
                  <li>متابعة تقدم الطلاب وتقييم أدائهم</li>
                  <li>التواصل مع الطلاب وأولياء الأمور</li>
                  <li>إنشاء تقارير وإحصائيات تعليمية</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-[#3453a7]">3. حماية البيانات</h3>
                <p>نتخذ إجراءات أمنية صارمة لحماية معلوماتك:</p>
                <ul className="list-disc list-inside space-y-2 mr-6">
                  <li>تشفير البيانات أثناء النقل والتخزين</li>
                  <li>الوصول المحدود للمعلومات الشخصية</li>
                  <li>مراجعة دورية للإجراءات الأمنية</li>
                  <li>نسخ احتياطي منتظم للبيانات</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-[#3453a7]">4. مشاركة المعلومات</h3>
                <p>نحن لا نشارك معلوماتك الشخصية مع أطراف ثالثة إلا في الحالات التالية:</p>
                <ul className="list-disc list-inside space-y-2 mr-6">
                  <li>بموافقتك الصريحة</li>
                  <li>لأغراض تعليمية مع المعلمين والإدارة</li>
                  <li>عند الطلب القانوني من الجهات المختصة</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-[#3453a7]">5. حقوقك</h3>
                <p>لديك الحق في:</p>
                <ul className="list-disc list-inside space-y-2 mr-6">
                  <li>الوصول إلى معلوماتك الشخصية</li>
                  <li>طلب تصحيح أو تحديث بياناتك</li>
                  <li>طلب حذف معلوماتك (وفقاً للقوانين المعمول بها)</li>
                  <li>الاعتراض على معالجة بياناتك</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-[#3453a7]">6. الاتصال بنا</h3>
                <p>إذا كان لديك أي أسئلة أو استفسارات حول سياسة الخصوصية، يرجى التواصل معنا عبر صفحة "تواصل معنا".</p>
              </div>

              <div className="rounded-2xl border border-[#3453a7]/15 bg-[linear-gradient(135deg,rgba(52,83,167,0.08),rgba(79,111,199,0.03))] p-6">
                <p className="font-semibold text-center">
                  آخر تحديث:{" "}
                  {new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}
