import { SignIn } from "@clerk/nextjs"
import Link from "next/link"

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm">
        {/* Logo Branding */}
        <Link href="/" className="mb-8 flex flex-col items-center gap-4">
          <div className="animate-float-logo">
            <img 
              src="/logo.webp" 
              alt="Proxidex" 
              className="h-20 w-20 rounded-xl"
            />
          </div>
          <h1 className="text-3xl font-bold text-slate-100">
            PROXI<span className="font-thin tracking-widest">DEX</span>
          </h1>
        </Link>
        <SignIn 
          routing="hash"
          signUpUrl="/auth/signup"
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-slate-900 border-slate-800 shadow-xl",
              headerTitle: "text-slate-100",
              headerSubtitle: "text-slate-400",
              socialButtonsBlockButton: "bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700",
              socialButtonsBlockButtonText: "text-slate-100",
              dividerLine: "bg-slate-700",
              dividerText: "text-slate-500",
              formFieldLabel: "text-slate-300",
              formFieldInput: "bg-slate-800 border-slate-700 text-slate-100",
              footerActionText: "text-slate-400",
              footerActionLink: "text-blue-400 hover:text-blue-300",
            }
          }}
        />
      </div>
    </div>
  )
}
