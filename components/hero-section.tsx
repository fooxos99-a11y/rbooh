"use client"

export function HeroSection() {
  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#ffffff] px-4 sm:px-6 pt-0 pb-2 sm:pb-3"
    >
      
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#d8a355] to-transparent opacity-50" />

        <div className="relative flex flex-col items-center w-full mt-[-3rem] mb-0">
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
          </div>
        </div>
      </div>
    </section>
  )
}
