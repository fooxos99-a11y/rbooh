import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText } from "lucide-react"

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(circle_at_top,#eef6f8_0%,#f7fbff_45%,#ffffff_100%)]">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-10 rounded-[32px] border border-[#3453a7]/12 bg-white/90 p-8 text-center shadow-[0_24px_70px_-48px_rgba(52,83,167,0.35)] backdrop-blur-sm">
            <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-[24px] bg-[linear-gradient(135deg,#3453a7_0%,#4f6fc7_100%)] shadow-lg shadow-[#3453a7]/20">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <h1 className="mb-4 text-4xl font-black text-[#1a2332] md:text-5xl">شروط الخدمة</h1>
            <p className="text-lg font-semibold text-[#4d6b76] md:text-xl">الشروط والأحكام الخاصة باستخدام منصة برنامج الربوة</p>
          </div>

          <Card className="border border-[#3453a7]/15 bg-white/95 shadow-[0_24px_70px_-52px_rgba(26,35,50,0.3)]">
            <CardHeader className="border-b border-[#3453a7]/10 bg-[linear-gradient(135deg,rgba(52,83,167,0.08),rgba(52,83,167,0.02))]">
              <CardTitle className="text-2xl font-black text-[#1a2332]">مقدمة</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6 text-lg leading-relaxed text-[#1a2332]">
              <p>
                مرحباً بكم في منصة برنامج الربوة. باستخدامك لهذه المنصة، فإنك توافق على الالتزام بالشروط والأحكام
                التالية. يرجى قراءة هذه الشروط بعناية قبل استخدام خدماتنا.
              </p>

              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-[#3453a7]">1. استخدام المنصة</h3>
                <p>
                  تم تصميم هذه المنصة لخدمة طلاب برنامج الربوة لتحفيظ القرآن الكريم. يجب استخدام المنصة للأغراض
                  التعليمية والتربوية فقط.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-[#3453a7]">2. حقوق المستخدم</h3>
                <ul className="list-disc list-inside space-y-2 mr-6">
                  <li>الوصول إلى المحتوى التعليمي والموارد المتاحة</li>
                  <li>متابعة التقدم الشخصي والإنجازات</li>
                  <li>التواصل مع المعلمين والإدارة</li>
                  <li>المشاركة في الأنشطة والبرامج المتاحة</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-[#3453a7]">3. مسؤوليات المستخدم</h3>
                <ul className="list-disc list-inside space-y-2 mr-6">
                  <li>الحفاظ على سرية معلومات تسجيل الدخول</li>
                  <li>استخدام المنصة بطريقة مسؤولة وأخلاقية</li>
                  <li>احترام حقوق الآخرين والمحتوى المنشور</li>
                  <li>الالتزام بالقواعد والتعليمات المقدمة</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-[#3453a7]">4. الخصوصية والبيانات</h3>
                <p>
                  نحن نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية. لمزيد من المعلومات، يرجى الاطلاع على سياسة الخصوصية
                  الخاصة بنا.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-[#3453a7]">5. التعديلات</h3>
                <p>
                  نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سيتم إخطار المستخدمين بأي تغييرات جوهرية عبر المنصة أو
                  البريد الإلكتروني.
                </p>
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
