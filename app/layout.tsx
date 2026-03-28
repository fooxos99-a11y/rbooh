import type React from "react"
import type { Metadata } from "next"
import { Cairo, Readex_Pro } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ConfirmDialogProvider } from "@/hooks/use-confirm-dialog"
import { GlobalAdminModals } from '@/components/global-admin-modals'
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const cairo = Cairo({ subsets: ["arabic"], variable: "--font-cairo" })
const readexPro = Readex_Pro({ subsets: ["arabic", "latin"], variable: "--font-display" })

export const metadata: Metadata = {
  title: "ربوة",
  description: "منصة ربوة التعليمية - كل ما تحتاجه في مكان واحد",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={`${cairo.className} ${readexPro.variable} antialiased`} suppressHydrationWarning>
        <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
        <GlobalAdminModals />
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
