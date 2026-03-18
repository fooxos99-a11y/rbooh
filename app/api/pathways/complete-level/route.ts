import { NextResponse } from "next/server";

export async function POST(request: Request) {
  void request;

  return NextResponse.json(
    {
      error: "تم إيقاف إكمال المستوى من جهة الطالب. اعتماد المستوى واحتساب النقاط يتم من الإدارة فقط.",
    },
    { status: 403 },
  );
}
