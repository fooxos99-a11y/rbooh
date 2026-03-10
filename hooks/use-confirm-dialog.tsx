"use client"

import type React from "react"

import { create } from "zustand"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface DialogStore {
  confirm: {
    isOpen: boolean
    title: string
    message: string
    confirmText: string
    cancelText: string
    onConfirm?: () => void
    onCancel?: () => void
  }
  alert: {
    isOpen: boolean
    title: string
    message: string
    onClose?: () => void
  }
}

const useDialogStore = create<DialogStore>((set) => ({
  confirm: {
    isOpen: false,
    title: "",
    message: "",
    confirmText: "حسناً",
    cancelText: "لا",
    onConfirm: undefined,
    onCancel: undefined,
  },
  alert: {
    isOpen: false,
    title: "",
    message: "",
    onClose: undefined,
  },
}))

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const { confirm, alert } = useDialogStore()
  const shouldShowAlertTitle = Boolean(alert.title && alert.title !== "نجاح")
  const accessibleAlertTitle = alert.title || "تنبيه"

  const handleConfirm = () => {
    confirm.onConfirm?.()
    useDialogStore.setState((state) => ({
      ...state,
      confirm: { ...state.confirm, isOpen: false },
    }))
  }

  const handleCancel = () => {
    confirm.onCancel?.()
    useDialogStore.setState((state) => ({
      ...state,
      confirm: { ...state.confirm, isOpen: false },
    }))
  }

  const handleAlertClose = () => {
    alert.onClose?.()
    useDialogStore.setState((state) => ({
      ...state,
      alert: { ...state.alert, isOpen: false },
    }))
  }

  return (
    <>
      {children}
      {/* Confirmation Dialog */}
      <AlertDialog open={confirm.isOpen} onOpenChange={(open) => !open && handleCancel()}>
        <AlertDialogContent className="sm:max-w-[360px] rounded-2xl border border-[#D4AF37]/25 bg-white p-0 shadow-[0_18px_45px_rgba(15,23,42,0.14)]" dir="rtl">
          <AlertDialogHeader className="gap-1.5 px-5 py-5 text-right">
            <div className="space-y-1 pt-0.5">
                <AlertDialogTitle className="text-lg font-black text-[#1a2332]">{confirm.title}</AlertDialogTitle>
                <AlertDialogDescription className="text-sm leading-6 text-neutral-600">{confirm.message}</AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-0 gap-3 border-t border-[#D4AF37]/12 px-5 py-4 sm:justify-end">
            <AlertDialogCancel
              onClick={handleCancel}
              className="mt-0 min-w-24 rounded-xl border border-[#D4AF37]/30 bg-white text-neutral-700 hover:bg-[#D4AF37]/6 hover:text-[#1a2332] focus-visible:border-[#D4AF37] focus-visible:ring-[#D4AF37]/20"
            >
              {confirm.cancelText}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className="min-w-24 rounded-xl border border-[#D4AF37]/35 bg-[#D4AF37]/10 text-[#B78D2C] shadow-none hover:bg-[#D4AF37]/18 hover:text-[#8E6B16] focus-visible:border-[#D4AF37] focus-visible:ring-[#D4AF37]/20"
            >
              {confirm.confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog */}
      <AlertDialog open={alert.isOpen} onOpenChange={(open) => !open && handleAlertClose()}>
        <AlertDialogContent className="sm:max-w-[360px] rounded-2xl border border-[#D4AF37]/25 bg-white p-0 shadow-[0_18px_45px_rgba(15,23,42,0.14)]" dir="rtl">
          <AlertDialogHeader className="gap-1.5 px-5 py-5 text-right">
            <div className={`w-full ${shouldShowAlertTitle ? "space-y-1" : ""}`}>
                <AlertDialogTitle className={shouldShowAlertTitle ? "text-lg font-black text-[#1a2332]" : "sr-only"}>
                  {accessibleAlertTitle}
                </AlertDialogTitle>
                <AlertDialogDescription className="whitespace-pre-line text-sm leading-6 text-neutral-600">
                  {alert.message}
                </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-0 border-t border-[#D4AF37]/12 px-5 py-4">
            <AlertDialogAction
              onClick={handleAlertClose}
              className="w-full rounded-xl border border-[#D4AF37]/35 bg-[#D4AF37]/10 text-[#B78D2C] shadow-none hover:bg-[#D4AF37]/18 hover:text-[#8E6B16] focus-visible:border-[#D4AF37] focus-visible:ring-[#D4AF37]/20"
            >
              موافق
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

interface ConfirmDialogOptions {
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
}

export function useConfirmDialog() {
  return (options: string | ConfirmDialogOptions, fallbackTitle?: string): Promise<boolean> => {
    return new Promise((resolve) => {
      // Handle both string and object formats
      const config =
        typeof options === "string"
          ? {
              title: fallbackTitle || "تأكيد العملية",
              message: options,
              confirmText: "حسناً",
              cancelText: "لا",
            }
          : {
              title: options.title || "تأكيد العملية",
              message: options.description || "",
              confirmText: options.confirmText || "حسناً",
              cancelText: options.cancelText || "لا",
            }

      useDialogStore.setState((state) => ({
        ...state,
        confirm: {
          ...config,
          isOpen: true,
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false),
        },
      }))
    })
  }
}

export function useAlertDialog() {
  return (message: string, title = "تنبيه"): Promise<void> => {
    return new Promise((resolve) => {
      useDialogStore.setState((state) => ({
        ...state,
        alert: {
          isOpen: true,
          title,
          message,
          onClose: () => resolve(),
        },
      }))
    })
  }
}
