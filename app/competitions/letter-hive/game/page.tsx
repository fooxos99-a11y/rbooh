"use client";
export const dynamic = "force-dynamic";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { getNextQuestionForAccount } from "../get-next-question";

// قائمة الحروف الأساسية (كلها بهمزة: أ)
const BASE_LETTERS = [
  "ص","ح","خ","م","د","ز","ع","و","هـ","ط",
  "ج","ض","ل","ك","ي","س","أ","ت","ش","ق",
  "ر","ن","غ","ف","ب"
];

const shuffleArray = (array: string[]) => {
  return [...array].sort(() => Math.random() - 0.5);
};

function getNeighbors(i: number): number[] {
  const row = Math.floor(i / 5), col = i % 5, neighbors: number[] = [];
  const checks: [number, number][] = row % 2 === 0 ?
    [[0,-1],[0,1],[-1,-1],[-1,0],[1,-1],[1,0]] :
    [[0,-1],[0,1],[-1,0],[-1,1],[1,0],[1,1]];
  checks.forEach(([dr, dc]) => {
    const nr = row + dr, nc = col + dc;
    if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5) neighbors.push(nr * 5 + nc);
  });
  return neighbors;
}

export default function LetterHiveGame() {
  const searchParams = useSearchParams();
  const team1 = searchParams?.get("team1") || "الأحمر";
  const team2 = searchParams?.get("team2") || "الأخضر";

  const [scoreRed, setScoreRed] = useState(0);
  const [scoreGreen, setScoreGreen] = useState(0);
  const [hexes, setHexes] = useState<(null | "red" | "green")[]>(Array(25).fill(null));
  const [randomLetters, setRandomLetters] = useState<string[]>([]);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const [winMessage, setWinMessage] = useState("");
  const [targetHex, setTargetHex] = useState<number | null>(null);
  // متغير لتخزين رقم السؤال الحالي (debug)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number | null>(null);
  const [currentQuestionDebugIdx, setCurrentQuestionDebugIdx] = useState<number | null>(null); // المؤشر الفعلي
  
  // حالة التحكم في علامة التعجب والظهور
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setRandomLetters(shuffleArray(BASE_LETTERS));
  }, []);

  const handleHexClick = async (i: number) => {
    if (hexes[i] || showWinModal) return;
    setTargetHex(i);
    setShowAnswer(false);
    setCurrentAnswer(null);
    // جلب رقم الحساب من الباراميتر أو ثابت مؤقت (يجب ربطه بحساب المستخدم لاحقًا)
    const accountNumber = Number(searchParams?.get("account") || 1);
    const letter = randomLetters[i];
    // تعديل: جلب المؤشر الفعلي من الدالة (نعدل الدالة لإرجاعه)
    const qa = await getNextQuestionForAccount(accountNumber, letter);
    if (qa) {
      setCurrentQuestion(qa.question);
      setCurrentAnswer(qa.answer);
      setCurrentQuestionIndex(qa.id || null);
      setCurrentQuestionDebugIdx(qa._debugIndex ?? null);
    } else {
      setCurrentQuestion("لا يوجد سؤال لهذا الحرف بعد.");
      setCurrentAnswer(null);
      setCurrentQuestionIndex(null);
      setCurrentQuestionDebugIdx(null);
    }
    setShowQuestionModal(true);
  };
  // إظهار الإجابة أولاً، ثم نافذة الفريق
  const handleShowAnswer = () => setShowAnswer(true);
  const handleAnswered = () => {
    setShowQuestionModal(false);
    setShowTeamModal(true);
  };

  const assignColor = (color: "red" | "green") => {
    if (targetHex === null) return;
    const newHexes = [...hexes];
    newHexes[targetHex] = color;
    setHexes(newHexes);
    setShowTeamModal(false);
    setTargetHex(null);
    checkWinner(color, newHexes);
  };

  const checkWinner = (color: "red" | "green", hexArr: (null | "red" | "green")[]) => {
    const owned: number[] = hexArr.map((h, i) => h === color ? i : null).filter((i): i is number => i !== null);
    let startNodes: number[] = [], targets = new Set<number>();
    
    if (color === "red") {
      startNodes = owned.filter((i) => i % 5 === 0);
      owned.filter((i) => i % 5 === 4).forEach((i) => targets.add(i));
    } else {
      startNodes = owned.filter((i) => i < 5);
      owned.filter((i) => i >= 20).forEach((i) => targets.add(i));
    }

    let q = [...startNodes], visited = new Set<number>(startNodes);
    while (q.length > 0) {
      let curr = q.shift();
      if (curr !== undefined && targets.has(curr)) {
        showWin(color);
        return;
      }
      getNeighbors(curr!).forEach((n) => {
        if (owned.includes(n) && !visited.has(n)) {
          visited.add(n); q.push(n);
        }
      });
    }
  };

  const showWin = (color: "red" | "green") => {
    if (color === "red") {
      setScoreRed(s => s + 1);
      setWinMessage(`فاز الفريق ${team1}!`);
    } else {
      setScoreGreen(s => s + 1);
      setWinMessage(`فاز الفريق ${team2}!`);
    }
    setShowWinModal(true);
  };

  const resetGame = () => {
    setHexes(Array(25).fill(null));
    setRandomLetters(shuffleArray(BASE_LETTERS));
    setShowWinModal(false);
  };

  const TeamScoreCard = ({ name, score, color, side }: { name: string, score: number, color: string, side: 'left' | 'right' }) => (
    <div style={{
      flex: "0 0 180px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "10px",
      padding: "30px 20px",
      background: "rgba(255, 255, 255, 0.9)",
      backdropFilter: "blur(10px)",
      borderRadius: side === 'left' ? "50px 15px 15px 50px" : "15px 50px 50px 15px",
      border: `2px solid ${color}`,
      boxShadow: `0 15px 35px -5px ${color}33`,
      position: "relative",
      transition: "all 0.3s ease"
    }}>
      <div style={{
        position: "absolute",
        top: "-15px",
        background: color,
        color: "white",
        padding: "4px 15px",
        borderRadius: "20px",
        fontSize: "0.9rem",
        fontWeight: "bold",
        boxShadow: "0 4px 10px rgba(0,0,0,0.1)"
      }}>
        {side === 'left' ? 'الفريق الثاني' : 'الفريق الأول'}
      </div>
      <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "#444", marginTop: "10px" }}>{name}</div>
      <div style={{ 
        fontSize: "4.5rem", 
        fontWeight: "900", 
        color: color,
        lineHeight: "1",
        textShadow: "2px 2px 0px rgba(0,0,0,0.05)"
      }}>
        {score}
      </div>
      <div style={{ fontSize: "0.9rem", color: "#888", fontWeight: "bold" }}>نقطة</div>
    </div>
  );

  const renderHexGrid = () => {
    return hexes.map((status, i) => {
      const row = Math.floor(i / 5);
      const col = i % 5;
      const x = col * 100 + (row % 2 === 0 ? 0 : 50);
      const y = row * 87;

      return (
            <g key={i} transform={`translate(${x},${y})`} onClick={() => handleHexClick(i)} style={{ cursor: status ? "default" : "pointer" }}>
              <polygon
                points="50,0 100,29 100,87 50,116 0,87 0,29"
                fill={status === "red" ? "#e20000" : status === "green" ? "#00e224" : "#ffffff"}
                stroke="#2c3e50"
                strokeWidth={3}
                style={{ transition: "fill 0.3s ease" }}
              />
              <text
                x="50"
                y="58"
                style={{
                  fontSize: 38,
                  fontWeight: "bold",
                  fill: status === "red" ? "#e20000" : status === "green" ? "#00e224" : "#2c3e50",
                  pointerEvents: "none",
                  dominantBaseline: "middle",
                  textAnchor: "middle",
                  fontFamily: "Arial"
                }}
              >
                {randomLetters[i]}
              </text>
        </g>
      );
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", position: "relative" }}>
      
      {/* أيقونة الإرشاد المحدثة */}
      <div 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          zIndex: 50
        }}
      >
        <div style={{
          width: "24px",
          height: "24px",
          background: "#F5F5DC",
          border: "2px solid #d2d2b4",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "14px",
          color: "#8b8b7a",
          cursor: "pointer",
          fontWeight: "bold",
          boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
          transition: "transform 0.2s ease"
        }}>
          {"!"}
        </div>

        {/* التلميح (Tooltip) بتصميم الموقع */}
        {isHovered && (
          <div style={{
            position: "absolute",
            top: "30px",
            right: "0",
            whiteSpace: "nowrap",
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(5px)",
            padding: "8px 15px",
            borderRadius: "12px",
            border: "1px solid #d2d2b4",
            boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
            fontSize: "0.85rem",
            color: "#555",
            fontWeight: "bold",
            pointerEvents: "none"
          }}>
            اضغط على زر <span style={{ color: "#2c3e50" }}>F11</span> لملء الشاشة<br />
            <span style={{ fontSize: '0.82rem', color: '#888', fontWeight: 'normal' }}>ملاحظة: اختيار الحرف الأول يكون عشوائي وبعدها الفائز بالحرف هو من يحدد الحرف التالي</span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", maxWidth: "1300px", gap: "40px" }}>
        
        <TeamScoreCard name={team2} score={scoreGreen} color="#00e224" side="left" />

        <div style={{ flex: "1", position: "relative", display: "flex", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: "650px", filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.1))" }}>
            <svg viewBox="-70 -70 690 605" style={{ width: "100%", height: "auto", overflow: "visible" }}>
              <foreignObject x="-80" y="-80" width="710" height="624">
                <div style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '30px',
                  background: 'conic-gradient(from -45deg, #00e224 90deg, #e20000 90deg 180deg, #00e224 180deg 270deg, #e20000 270deg)',
                  boxShadow: 'inset 0 0 0 5px rgba(0,0,0,0.05)'
                }} />
              </foreignObject>
              <line x1="-50" y1="232" x2="600" y2="232" stroke="rgba(0,0,0,0.1)" strokeWidth="2" strokeDasharray="10,10" />
              {renderHexGrid()}
            </svg>
          </div>
        </div>

        <TeamScoreCard name={team1} score={scoreRed} color="#e20000" side="right" />

      </div>

      {/* نافذة السؤال مع الإجابة */}
      {showQuestionModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(5px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 110,
            transition: "opacity 0.25s cubic-bezier(.4,0,.2,1)",
            opacity: showQuestionModal ? 1 : 0,
            pointerEvents: showQuestionModal ? 'auto' : 'none',
          }}
          onClick={() => setShowQuestionModal(false)}
        >
          <div
            style={{
              background: "white",
              padding: "40px 30px",
              borderRadius: "25px",
              textAlign: "center",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              minWidth: 320,
              transform: showQuestionModal ? 'scale(1)' : 'scale(0.95)',
              transition: "transform 0.25s cubic-bezier(.4,0,.2,1)",
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 24, fontSize: "1.3rem", color: "#2c3e50" }}>{currentQuestion}</h3>
            {/* تم حذف debug الخاص برقم السؤال والمؤشر بناءً على طلب المستخدم */}
            {!showAnswer && currentAnswer && (
              <button onClick={handleShowAnswer} style={{ padding: "13px 38px", background: "#2c3e50", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "bold", fontSize: "1.1rem", marginBottom: 16 }}>الإجابة</button>
            )}
            {showAnswer && currentAnswer && (
              <>
                <div style={{ fontSize: "1.1rem", color: "#008a1e", marginBottom: 18, fontWeight: "bold" }}>{currentAnswer}</div>
                <button onClick={handleAnswered} style={{ padding: "13px 38px", background: "#e20000", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "bold", fontSize: "1.1rem" }}>من جاوب؟</button>
              </>
            )}
            {!currentAnswer && (
              <button onClick={handleAnswered} style={{ padding: "13px 38px", background: "#e20000", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "bold", fontSize: "1.1rem" }}>متابعة</button>
            )}
          </div>
        </div>
      )}

      {/* مودال اختيار الفريق */}
      {showTeamModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(5px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 100,
            transition: "opacity 0.25s cubic-bezier(.4,0,.2,1)",
            opacity: showTeamModal ? 1 : 0,
            pointerEvents: showTeamModal ? 'auto' : 'none',
          }}
          onClick={() => setShowTeamModal(false)}
        >
          <div
            style={{
              background: "white",
              padding: "40px",
              borderRadius: "25px",
              textAlign: "center",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              transform: showTeamModal ? 'scale(1)' : 'scale(0.95)',
              transition: "transform 0.25s cubic-bezier(.4,0,.2,1)",
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: "25px", fontSize: "1.5rem", color: "#333" }}>من صاحب الإجابة الصحيحة؟</h3>
            <div style={{ display: "flex", gap: "20px", flexDirection: 'row-reverse', justifyContent: 'center' }}>
              <button onClick={() => assignColor("green")} style={{ padding: "15px 40px", background: "#00e224", color: "white", border: "none", borderRadius: "15px", cursor: "pointer", fontWeight: "bold", fontSize: "1.1rem" }}>{team2}</button>
              <button onClick={() => assignColor("red")} style={{ padding: "15px 40px", background: "#e20000", color: "white", border: "none", borderRadius: "15px", cursor: "pointer", fontWeight: "bold", fontSize: "1.1rem" }}>{team1}</button>
            </div>
          </div>
        </div>
      )}

      {/* مودال الفوز */}
      {showWinModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 200 }}>
          <div style={{ background: "white", padding: "50px", borderRadius: "30px", textAlign: "center", maxWidth: "400px" }}>
            <div style={{ fontSize: "5rem", marginBottom: "10px" }}>🏆</div>
            <h1 style={{ fontSize: "2.2rem", color: "#2c3e50", marginBottom: "10px" }}>انتهت الجولة!</h1>
            <p style={{ fontSize: "1.5rem", color: "#666", marginBottom: "30px" }}>{winMessage}</p>
            <button onClick={resetGame} style={{ width: "100%", padding: "15px", background: "#2c3e50", color: "white", border: "none", borderRadius: "15px", fontSize: "1.2rem", cursor: "pointer", fontWeight: "bold" }}>لعب مرة أخرى</button>
          </div>
        </div>
      )}
    </div>
  );
}
