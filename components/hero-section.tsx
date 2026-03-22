"use client"

import Image from "next/image"

export function HeroSection() {
  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-white via-[#faf8f5] to-white px-4 sm:px-6 pt-0 pb-2 sm:pb-3"
    >
      
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#d8a355] to-transparent opacity-50" />

        <div className="relative flex flex-col items-center w-full mt-[-3rem] mb-0">
  <div className="relative flex flex-col items-center w-full mt-[-3rem] mb-0">
          <div className="absolute inset-0 bg-[#243870]/10 blur-3xl rounded-full" />
          <div className="relative flex flex-col items-center w-full">
            <Image
              src="/ربوة.png"
              alt="ربوة"
              width={320}
              height={320}
              className="relative w-[240px] h-auto sm:w-[320px] md:w-[380px] lg:w-[440px] xl:w-[500px] object-contain drop-shadow-2xl mb-0 mt-[-6rem] sm:mt-[-5rem]"
              style={{
                filter: "brightness(0) saturate(100%) invert(23%) sepia(24%) saturate(1862%) hue-rotate(191deg) brightness(92%) contrast(92%)",
              }}
              priority
              sizes="(max-width: 640px) 240px, (max-width: 1024px) 320px, 380px"
            />
            {/* Simple beige decoration overlapping the logo */}
            <svg
              width="500"
              height="100"
              viewBox="0 0 500 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="absolute left-1/2 -translate-x-1/2 -bottom-6 sm:-bottom-8"
              style={{ zIndex: 10 }}
            >
              <path
                d="M40 50 Q150 100 250 50 Q350 0 460 50"
                stroke="#d8a355"
                strokeWidth="7"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </section>
  )
}
