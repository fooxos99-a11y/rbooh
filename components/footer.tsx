import Link from "next/link"
import { Facebook, Twitter, Instagram, Phone, Mail, MapPin } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-[#1a2332] text-white pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          <div>
            <h3 className="text-2xl font-bold mb-6 text-[#7db7ff]">من نحن</h3>
            <p className="text-base leading-relaxed">
              مجمع حلقات الحبيب هو مجمع تعليمي متخصص في تحفيظ القرآن الكريم وتعليم علومه، يسعى لتقديم بيئة تربوية متميزة
              تجمع بين الأصالة والمعاصرة. نهدف إلى تخريج جيل قرآني متقن لكتاب الله، ملتزم بتعاليمه، قادر على خدمة دينه
              ومجتمعه. نوفر برامج تعليمية متنوعة تناسب جميع الأعمار والمستويات، مع التركيز على الجودة والإتقان والمتابعة
              المستمرة لكل طالب.
            </p>
          </div>

          <div className="flex justify-center">
            <div>
              <h3 className="text-xl font-bold mb-6 text-[#7db7ff] text-center">روابط سريعة</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/" className="hover:text-[#7db7ff] transition-colors">
                    الرئيسية
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-[#7db7ff] transition-colors">
                    شروط الخدمة
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-[#7db7ff] transition-colors">
                    سياسة الخصوصية
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-[#7db7ff] transition-colors">
                    اتصل بنا
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-6 text-[#7db7ff]">تواصل معنا</h3>
            <ul className="space-y-4">
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#003f55]" />
                <span>789 456 123+</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#003f55]" />
                <span>info@example.com</span>
              </li>
              <li className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-[#003f55]" />
                <span>السعودية، بريدة، الهلال</span>
              </li>
            </ul>
            <div className="flex gap-4 mt-6">
              <Link
                href="#"
                className="w-10 h-10 border-2 border-[#7db7ff] rounded-full flex items-center justify-center hover:bg-[#3453a7] transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </Link>
              <Link
                href="#"
                className="w-10 h-10 border-2 border-[#7db7ff] rounded-full flex items-center justify-center hover:bg-[#3453a7] transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </Link>
              <Link
                href="#"
                className="w-10 h-10 border-2 border-[#7db7ff] rounded-full flex items-center justify-center hover:bg-[#3453a7] transition-colors"
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
