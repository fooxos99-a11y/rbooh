import { BookOpen, Heart, CheckCircle, Users } from 'lucide-react'

const goals = [
  {
    icon: BookOpen,
    title: "إتقان القرآن",
  },
  {
    icon: Heart,
    title: "ترسيخ القيم",
  },
  {
    icon: CheckCircle,
    title: "تعزيز الانضباط والمسؤولية",
  },
  {
    icon: Users,
    title: "إعداد جيل مؤثر في مجتمعه",
  },
]

export function GoalsSection() {
  return (
    <section className="py-12 sm:py-16 md:py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-10 sm:mb-12 md:mb-16 text-[#24406f]">
          الأهداف
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
          {goals.map((goal, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-[1.75rem] border border-[#dbe6f7] bg-white px-6 py-7 sm:px-7 sm:py-8 md:px-8 md:py-9 flex flex-col items-center text-center shadow-[0_18px_45px_rgba(15,47,109,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_55px_rgba(15,47,109,0.1)]"
            >
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#9fb7e9] to-transparent opacity-80" />
              <div className="mb-4 sm:mb-5 flex h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem] items-center justify-center rounded-[1.35rem] border border-[#d6e2f5] bg-[linear-gradient(135deg,rgba(255,255,255,1)_0%,rgba(244,248,255,1)_55%,rgba(236,242,252,1)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_12px_24px_rgba(52,83,167,0.08)] transition-transform duration-300 group-hover:scale-[1.04]">
                <goal.icon className="h-7 w-7 sm:h-8 sm:w-8 text-[#2f55a4]" strokeWidth={2.1} />
              </div>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-[#24406f]">{goal.title}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
