import Link from "next/link"
import { Facebook, Twitter, Instagram, Phone, Mail, MapPin } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-[#ffffff] text-[#1a2332] pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="mb-12 flex justify-center">
          <div
            className="h-px w-full max-w-6xl rounded-full"
            style={{
              background:
                "linear-gradient(90deg, rgba(15,47,109,0) 0%, rgba(31,77,154,0.18) 16%, rgba(54,103,178,0.38) 50%, rgba(31,77,154,0.18) 84%, rgba(15,47,109,0) 100%)",
            }}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          <div>
            <h3 className="mb-6 inline-block bg-gradient-to-r from-[#0f2f6d] via-[#1f4d9a] to-[#3667b2] bg-clip-text text-2xl font-bold text-transparent">من نحن</h3>
            <p className="text-base leading-relaxed">
              مجمع حلقات الحبيب هو مجمع تعليمي متخصص في تحفيظ القرآن الكريم وتعليم علومه، يسعى لتقديم بيئة تربوية متميزة
              تجمع بين الأصالة والمعاصرة. نهدف إلى تخريج جيل قرآني متقن لكتاب الله، ملتزم بتعاليمه، قادر على خدمة دينه
              ومجتمعه. نوفر برامج تعليمية متنوعة تناسب جميع الأعمار والمستويات، مع التركيز على الجودة والإتقان والمتابعة
              المستمرة لكل طالب.
            </p>
          </div>

          <div className="flex justify-center">
            <div>
              <h3 className="mb-6 bg-gradient-to-r from-[#0f2f6d] via-[#1f4d9a] to-[#3667b2] bg-clip-text text-center text-xl font-bold text-transparent">روابط سريعة</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/" className="hover:text-[#1f4d9a] transition-colors">
                    الرئيسية
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-[#1f4d9a] transition-colors">
                    شروط الخدمة
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-[#1f4d9a] transition-colors">
                    سياسة الخصوصية
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-[#1f4d9a] transition-colors">
                    اتصل بنا
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div>
            <h3 className="mb-6 inline-block bg-gradient-to-r from-[#0f2f6d] via-[#1f4d9a] to-[#3667b2] bg-clip-text text-xl font-bold text-transparent">تواصل معنا</h3>
            <ul className="space-y-4">
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#1f4d9a]" />
                <span>789 456 123+</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#1f4d9a]" />
                <span>info@example.com</span>
              </li>
              <li className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-[#1f4d9a]" />
                <span>السعودية، بريدة، الهلال</span>
              </li>
            </ul>
            <div className="flex gap-4 mt-6">
              <Link
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#1f4d9a]/35 text-[#1f4d9a] transition-colors hover:bg-[linear-gradient(135deg,#0f2f6d_0%,#1f4d9a_55%,#3667b2_100%)] hover:text-white"
              >
                <Instagram className="w-5 h-5" />
              </Link>
              <Link
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#1f4d9a]/35 text-[#1f4d9a] transition-colors hover:bg-[linear-gradient(135deg,#0f2f6d_0%,#1f4d9a_55%,#3667b2_100%)] hover:text-white"
              >
                <Twitter className="w-5 h-5" />
              </Link>
              <Link
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#1f4d9a]/35 text-[#1f4d9a] transition-colors hover:bg-[linear-gradient(135deg,#0f2f6d_0%,#1f4d9a_55%,#3667b2_100%)] hover:text-white"
              >
                <Facebook className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
