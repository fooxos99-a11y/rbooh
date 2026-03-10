"use client"







import { Header } from "@/components/header"
import { SiteLoader } from "@/components/ui/site-loader"



import { Footer } from "@/components/footer"



import { useState, useEffect } from "react"



import { useRouter } from 'next/navigation'



import { createBrowserClient } from "@supabase/ssr"



import { Lock, Trophy, BookOpen, Check, Star } from 'lucide-react'



import { Button } from "@/components/ui/button"



import { Progress } from "@/components/ui/progress"







interface PathwayLevel {



  id: number



  title: string



  description: string



  week: number



  isLocked: boolean



  isCompleted: boolean



  points: number



  userPoints: number



}











// جلب المستويات من قاعدة البيانات



async function fetchLevels(supabase: any, halaqah?: string) {

  let query = supabase.from('pathway_levels').select('*');

  if (halaqah) {
    query = query.eq('halaqah', halaqah);
  }

  const { data, error } = await query.order('level_number', { ascending: true });

  if (error) throw error;

  return data;

}







export default function PathwaysPage() {



  const [levels, setLevels] = useState<PathwayLevel[]>([])



  const [totalPoints, setTotalPoints] = useState(0)



  const [isLoading, setIsLoading] = useState(true)



  const [userRole, setUserRole] = useState<string | null>(null)



  const router = useRouter()











  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    const role = localStorage.getItem("userRole");
    setUserRole(role);

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    async function init() {
      let studentHalaqah = null;
      let studentId = localStorage.getItem("studentId");
      const currentUserStr = localStorage.getItem("currentUser");
      
      if (currentUserStr) {
        try {
          const currentUser = JSON.parse(currentUserStr);
          studentHalaqah = currentUser.halaqah;
          if (!studentId && currentUser) {
             studentId = currentUser.id || currentUser.account_number;
          }
        } catch (e) {}
      }

      // Fetch fresh halaqah from DB directly to handle admin changes
      if (loggedIn && role === "student" && studentId) {
         try {
           const { data: studentData } = await supabase
             .from("students")
             .select("halaqah")
             .eq("id", studentId)
             .maybeSingle();

           if (!studentData) {
             // Fallback if studentId was actually account_number
             const { data: studentDataAlt } = await supabase
               .from("students")
               .select("halaqah")
               .eq("account_number", studentId)
               .maybeSingle();
             if (studentDataAlt) studentHalaqah = studentDataAlt.halaqah;
           } else {
             studentHalaqah = studentData.halaqah;
           }
         } catch(e) {}
      }

      const levelsFromDb = await fetchLevels(supabase, studentHalaqah || undefined);

      if (loggedIn && role === "student") {
        await loadPathwayData(levelsFromDb);
      } else {
        setLevels(levelsFromDb.map((l:any) => ({
          id: l.level_number,
          title: l.title,
          description: l.description,
          week: l.level_number,
          isLocked: false,
          isCompleted: false,
          points: 100,
          userPoints: 0,
        })));
        setIsLoading(false);
      }
    }
    init();
  }, [])











  const loadPathwayData = async (levelsFromDb: any[]) => {



    try {



      const currentUserStr = localStorage.getItem("currentUser")



      if (!currentUserStr) {



        router.push("/login")



        return



      }



      const currentUser = JSON.parse(currentUserStr)



      const studentId = localStorage.getItem("studentId") || currentUser.id || currentUser.account_number;



      const levelsToUse = levelsFromDb



      // Load unlocked levels from localStorage



      const unlockedLevelsStr = localStorage.getItem("unlockedLevels")



      const unlockedLevels = unlockedLevelsStr ? JSON.parse(unlockedLevelsStr) : [1]







      // جلب حالة الإكمال من Supabase



      const supabase = createBrowserClient(



        process.env.NEXT_PUBLIC_SUPABASE_URL!,



        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,



      );



      // جلب جميع المستويات المكتملة لهذا الطالب مع النقاط



      const { data: completions, error: completionsError } = await supabase



        .from('pathway_level_completions')



        .select('level_number, points')



        .eq('student_id', studentId);







      const completedMap: Record<number, number> = {};



      if (completions) {



        completions.forEach((c: any) => {



          completedMap[c.level_number] = c.points;



        });



      }







      const processedLevels = levelsToUse.map((level: any) => {

        const isCompleted = completedMap.hasOwnProperty(level.level_number);

        return {

          ...level,

          id: level.level_number,

          isLocked: level.is_locked === true,

          isCompleted,

          userPoints: isCompleted ? completedMap[level.level_number] : (level.points ?? 100),

        }

      });







      setLevels(processedLevels)



      // جمع مجموع النقاط المكتسبة من pathway_level_completions فقط



      const total = processedLevels.reduce((acc, level) => acc + (level.isCompleted ? (level.userPoints || 0) : 0), 0)



      setTotalPoints(total)



    } catch (error) {



      console.error("Error loading pathway data:", error)



      setLevels(



        levelsFromDb.map((level:any) => ({



          ...level,



          isLocked: level.id !== 1,



          isCompleted: false,



          userPoints: 0,



        })),



      )



      setTotalPoints(0)



    }



    setIsLoading(false)



  }







  const completedLevels = levels.filter((level) => level.isCompleted).length



  const progressPercentage = levels.length > 0 ? (completedLevels / levels.length) * 100 : 0







  if (isLoading) {



    return (



      <div className="min-h-screen flex items-center justify-center bg-white">



        <SiteLoader size="lg" />



      </div>



    )



  }







  // إذا كان المستخدم إداري أو غير طالب، اجعل جميع المستويات مفتوحة



  if (userRole !== "student") {



      const openLevels = levels.map((level) => ({



        ...level,



        isLocked: false,



        isCompleted: false,



        userPoints: 0,



      }))



    return (



      <div className="min-h-screen flex flex-col bg-white" dir="rtl">



        <Header />



        <main className="flex-1 py-6 md:py-12 px-3 md:px-4">



          <div className="container mx-auto max-w-6xl">



            <div className="text-center mb-8 md:mb-12">



              <div className="flex items-center justify-center gap-2 md:gap-3 mb-3 md:mb-4">



                <BookOpen className="w-6 h-6 md:w-8 md:h-8 text-[#d8a355]" />



                <h1 className="text-3xl md:text-5xl font-bold text-[#1a2332]">المسار (عرض إداري)</h1>



              </div>



              <p className="text-base md:text-lg text-gray-600">جميع المستويات مفتوحة للإداري</p>



            </div>



            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">



              {openLevels.map((level) => (



                <div



                  key={level.id}



                  className={`relative rounded-xl overflow-hidden transition-all duration-300 shadow-sm border border-[#d8a355]/30 bg-white hover:shadow-lg`}



                  style={{ minHeight: '210px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '12px' }}



                >



                  <div className={`flex flex-col justify-between h-full`} style={{ flex: 1 }}>



                    <div>



                      <div className="flex items-center gap-2 mb-2">



                        <Zap className="w-5 h-5 text-[#d8a355]" />



                        <span className="font-bold text-[#1a2332]">{level.title}</span>



                      </div>



                      <p className="text-sm text-gray-600 mb-2">{level.description}</p>



                    </div>



                    <Button



                      className="w-full mt-4 bg-[#d8a355] hover:bg-[#c99245] text-[#00312e] font-bold"



                      onClick={() => router.push(`/pathways/level/${level.id}`)}



                    >



                      دخول المستوى



                    </Button>



                  </div>



                </div>



              ))}



            </div>



          </div>



        </main>



        <Footer />



      </div>



    )



  }







  return (



    <div className="min-h-screen flex flex-col bg-white" dir="rtl">



      <Header />







      <main className="flex-1 py-6 md:py-12 px-3 md:px-4">



        <div className="container mx-auto max-w-6xl">



          {/* Page Header */}



          <div className="text-center mb-8 md:mb-12">



            <div className="flex items-center justify-center gap-2 md:gap-3 mb-3 md:mb-4">



              <BookOpen className="w-6 h-6 md:w-8 md:h-8 text-[#d8a355]" />



              <h1 className="text-3xl md:text-5xl font-bold text-[#1a2332]">المسار</h1>



            </div>







          </div>







          {/* Progress Section */}

          <div className="relative bg-gradient-to-br from-[#00312e] via-[#023232] to-[#001a18] rounded-2xl md:rounded-3xl p-6 md:p-10 mb-8 md:mb-12 text-white shadow-2xl overflow-hidden">

            {/* Decorative blobs */}

            <div className="absolute top-0 right-0 w-48 h-48 bg-[#d8a355]/10 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />

            <div className="absolute bottom-0 left-0 w-36 h-36 bg-[#d8a355]/8 rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none" />



            <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 items-center">



              {/* Progress Bar Column */}

              <div className="md:col-span-2">

                <div className="flex items-center mb-4">

                  <p className="text-sm md:text-base font-bold tracking-wide opacity-90">التقدم في المسار</p>

                </div>



                {/* Custom thick progress bar */}

                <div className="relative h-7 md:h-9 bg-black/30 rounded-full overflow-hidden border border-white/10 shadow-inner">

                  {/* Filled portion */}

                  <div

                    className="absolute right-0 top-0 h-full rounded-full transition-all duration-1000 ease-out"

                    style={{

                      width: `${progressPercentage}%`,

                      background: 'linear-gradient(90deg, #b8843a 0%, #d8a355 50%, #f5c96a 100%)',

                      boxShadow: '0 0 18px 3px rgba(216,163,85,0.5)',

                    }}

                  >

                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-full" />

                  </div>



                  {/* Milestone dividers at 25%, 50%, 75% */}

                  {[25, 50, 75].map((m) => (

                    <div

                      key={m}

                      className="absolute top-1 bottom-1 w-px bg-white/20"

                      style={{ right: `${100 - m}%` }}

                    />

                  ))}

                </div>



                {/* Milestone labels */}

                <div className="flex justify-between mt-2 px-1">

                  {[0, 25, 50, 75, 100].map((m) => (

                    <span key={m} className="text-[10px] md:text-xs opacity-40 font-medium">{m}%</span>

                  ))}

                </div>

                {/* Notice */}
                <p className="text-[10px] md:text-xs text-white/40 mt-6 text-right">
                  ⚠️ في حال إنجاز المستوى بعد أسبوعه المحدد، سيتم خصم نصف النقاط
                </p>

              </div>



              {/* Points Card */}

              <div className="flex flex-col items-center justify-center p-4 md:p-6">



                {/* Points star */}

                <Star
                  className="w-12 h-12 md:w-16 md:h-16 mb-4 text-[#f4d03f] fill-[#f4d03f] drop-shadow-[0_0_14px_rgba(244,208,63,0.5)]"
                  strokeWidth={2.1}
                />



                {/* Points number */}

                <div className="text-5xl md:text-6xl font-black leading-none tracking-tight"

                  style={{ color: '#f5c96a', textShadow: '0 0 30px rgba(216,163,85,0.6), 0 2px 0 rgba(0,0,0,0.4)' }}>

                  {totalPoints}

                </div>



                {/* Label */}

                <div className="mt-2 flex items-center gap-1.5">

                  <div className="w-6 h-px bg-[#d8a355]/40" />

                  <p className="text-xs md:text-sm font-semibold tracking-widest opacity-70">نقطة</p>

                  <div className="w-6 h-px bg-[#d8a355]/40" />

                </div>



              </div>



            </div>

          </div>







          {/* Levels Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
            {levels.map((level) => (
              <div
                key={level.id}
                onClick={() => !level.isLocked && !level.isCompleted && router.push(`/pathways/level/${level.id}`)}
                className={`group relative rounded-2xl overflow-hidden transition-all duration-300 flex flex-col
                  ${level.isCompleted
                    ? "cursor-not-allowed"
                    : level.isLocked
                      ? "cursor-not-allowed"
                      : "cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-[#d8a355]/20"
                  }`}
                style={{
                  minHeight: '280px',
                  background: level.isCompleted
                    ? 'linear-gradient(160deg, #f5f0e8 0%, #efe8d8 100%)'
                    : level.isLocked
                      ? 'linear-gradient(160deg, #f4f4f4 0%, #e8e8e8 100%)'
                      : 'linear-gradient(160deg, #ffffff 0%, #fdf8f0 100%)',
                  border: level.isCompleted
                    ? '1.5px solid rgba(216,163,85,0.4)'
                    : level.isLocked
                      ? '1.5px solid rgba(0,0,0,0.08)'
                      : '1.5px solid rgba(216,163,85,0.35)',
                  boxShadow: level.isLocked ? 'none' : '0 2px 12px rgba(216,163,85,0.08)',
                }}
              >
                {/* Top accent bar */}
                <div className="h-1 w-full"
                  style={{
                    background: level.isCompleted
                      ? 'linear-gradient(90deg, #d8a355, #f5c96a, #d8a355)'
                      : level.isLocked
                        ? '#d1d5db'
                        : 'linear-gradient(90deg, #d8a355, #f5c96a)',
                    opacity: level.isLocked ? 0.5 : 1,
                  }}
                />

                <div className="flex flex-col flex-1 p-5 md:p-6">
                  {/* Level number badge */}
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center font-black text-xl md:text-2xl flex-shrink-0"
                      style={{
                        background: level.isCompleted
                          ? 'linear-gradient(145deg, #d8a355, #b8843a)'
                          : level.isLocked
                            ? '#e5e7eb'
                            : 'linear-gradient(145deg, #f5c96a, #d8a355)',
                        color: level.isLocked ? '#9ca3af' : level.isCompleted ? '#ffffff' : '#3d2000',
                        boxShadow: level.isLocked ? 'none' : '0 2px 8px rgba(216,163,85,0.35)',
                      }}
                    >
                      {level.id}
                    </div>

                    {/* Status icon */}
                    {level.isCompleted && (
                      <div className="w-6 h-6 rounded-full bg-[#d8a355] flex items-center justify-center flex-shrink-0">
                        <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                      </div>
                    )}
                    {level.isLocked && (
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <Lock className="w-3 h-3 text-gray-400" strokeWidth={2.5} />
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className={`text-base md:text-lg font-bold leading-tight mb-1
                    ${level.isLocked ? 'text-gray-400' : 'text-[#1a2332]'}`}>
                    {level.title}
                  </h3>

                  {/* Description */}
                  <p className={`text-xs md:text-sm leading-relaxed line-clamp-2 flex-1 ${level.isLocked ? 'text-gray-300' : 'text-gray-400'}`}>
                    {level.description}
                  </p>

                  {/* Footer */}
                  <div className="mt-auto pt-3">
                    {/* Points */}
                    <div className="flex items-center gap-1 mb-3">
                      <Star className={`w-4 h-4 ${level.isLocked ? 'text-gray-300 fill-gray-300' : 'text-[#f4d03f] fill-[#f4d03f] drop-shadow-[0_0_4px_rgba(244,208,63,0.35)]'}`} strokeWidth={1.8} />
                      <span className={`text-sm font-bold ${level.isLocked ? 'text-gray-300' : 'text-[#d8a355]'}`}>
                        {level.userPoints} نقطة
                      </span>
                    </div>

                    {/* Button */}
                    {level.isCompleted ? (
                      <div className="w-full h-10 md:h-11 rounded-lg flex items-center justify-center gap-1.5 text-sm font-bold text-[#d8a355] bg-[#d8a355]/10 border border-[#d8a355]/25">
                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                        مكتمل
                      </div>
                    ) : level.isLocked ? (
                      <div className="w-full h-10 md:h-11 rounded-lg flex items-center justify-center text-sm font-semibold text-gray-300 bg-gray-100">
                        مقفل
                      </div>
                    ) : (
                      <div
                        className="w-full h-10 md:h-11 rounded-lg flex items-center justify-center text-sm font-bold text-[#3d2000] transition-all duration-200 group-hover:shadow-md"
                        style={{ background: 'linear-gradient(135deg, #f5c96a 0%, #d8a355 100%)' }}
                      >
                        ابدأ الآن
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
