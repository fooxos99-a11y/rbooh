"use client"

export function HeroSection() {
  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#ffffff] px-4 sm:px-6 pt-0 pb-8 sm:pb-10"
    >
      
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#d7e4fb] to-transparent opacity-80" />

      <div className="relative flex flex-col items-center w-full mt-[-3rem] mb-0">
          <div className="relative flex flex-col items-center w-full">
            <div
              role="img"
              aria-label="ربوة"
              className="relative mb-0 mt-[-7rem] h-[250px] w-[430px] sm:mt-[-6rem] sm:h-[320px] sm:w-[560px] md:h-[380px] md:w-[660px] lg:h-[450px] lg:w-[780px] xl:h-[520px] xl:w-[900px]"
              style={{
                background: "linear-gradient(135deg, #0f2f6d 0%, #1f4d9a 55%, #3667b2 100%)",
                WebkitMaskImage: "url('/ربوة.png')",
                maskImage: "url('/ربوة.png')",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                maskPosition: "center",
                WebkitMaskSize: "contain",
                maskSize: "contain",
                filter: "drop-shadow(0 10px 18px rgba(15,47,109,0.16))",
              }}
            />

            <div className="relative z-10 -mt-10 w-full max-w-4xl px-3 sm:-mt-14 sm:px-6 md:-mt-16">
              <div className="mx-auto overflow-hidden rounded-[2rem] border border-[#9fb7e9]/18 bg-white px-6 py-5 text-center shadow-[0_22px_65px_rgba(15,47,109,0.08)] sm:px-10 sm:py-7">
                <div className="mx-auto mb-3 h-px w-24 bg-gradient-to-r from-transparent via-[#7f9bd1] to-transparent sm:mb-4" />
                <p className="mx-auto max-w-3xl text-base leading-8 text-[#24406f] sm:text-lg sm:leading-9 [font-family:var(--font-readex-pro)]">
                  برنامج نوعي يُعنى بحفظ القرآن الكريم وإتقانه، وفق مسارات تعليمية مدروسة وخطط مرحلية دقيقة، بإشراف نخبة من المقرئين والمشرفين المتخصصين؛ لضمان بناء حافظٍ متقن وتحقيق مخرجات عالية الجودة.
                </p>
              </div>
            </div>
          </div>
        </div>
    </section>
  )
}
