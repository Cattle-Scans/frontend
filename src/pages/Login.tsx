import { useState, useRef, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { useAuth } from "../hooks/useAuth"
import { LogIn, LogOutIcon } from "lucide-react"
import { toast } from "sonner"
import { Link } from "react-router-dom"

export default function Login() {
  const { session, loading } = useAuth()
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState(Array(6).fill(""))
  const [step, setStep] = useState<"email" | "otp">("email")
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  // Send OTP
  const sendOtp = async () => {
    setSending(true)
    setError(null)
    toast.loading("Sending verification code...")

    const { error } = await supabase.auth.signInWithOtp({ email })
    toast.dismiss()

    if (error) {
      setError(error.message)
      toast.error(error.message)
    } else {
      setStep("otp")
      toast.success("OTP sent to your email!")
    }
    setSending(false)
  }

  // Reset step if session changes
  useEffect(() => {
    setStep("email")
  }, [session])

  // Verify OTP
  const verifyOtp = async () => {
    setError(null)
    const code = otp.join("")
    toast.loading("Verifying OTP...")

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    })
    toast.dismiss()

    if (error) {
      setError(error.message)
      toast.error(error.message)
    } else {
      toast.success("Login successful!")
    }
  }

  // Sign out
  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) toast.error(error.message)
    else toast.success("Signed out!")
  }

  // OTP input handlers
  const handleChange = (val: string, idx: number) => {
    if (!/^\d?$/.test(val)) return
    const newOtp = [...otp]
    newOtp[idx] = val
    setOtp(newOtp)

    if (val && idx < 5) inputsRef.current[idx + 1]?.focus()
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasteData = e.clipboardData.getData("text").slice(0, 6).split("")
    if (pasteData.every((ch) => /\d/.test(ch))) {
      setOtp(pasteData.concat(Array(6 - pasteData.length).fill("")))
    }
  }

  // Loading spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-green-100 to-white">
        <div className="w-14 h-14 border-4 border-green-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  // Logged-in state
  if (session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-green-100 to-white px-4">
        <div className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-md text-center animate-fadeIn">
          <h1 className="text-2xl font-bold mb-4 text-green-700">
            ✅ Logged in!
          </h1>
          <h2 className="font-semibold mb-6 text-gray-700">
            BPA ID: {session.user.user_metadata.id}
          </h2>
          <button
            onClick={signOut}
            className="w-full border border-gray-200 hover:bg-gray-100 flex items-center justify-center font-semibold text-black py-2 rounded-lg transition transform hover:scale-105"
          >
            Log Out <LogOutIcon className="ml-2 w-4 h-4 text-green-800" />
          </button>
          {session.user.user_metadata.role === "admin" && (
            <Link
              to="/admin"
              className="w-full border mt-4 border-gray-200 hover:bg-gray-100 flex items-center justify-center font-semibold text-black py-2 rounded-lg transition transform hover:scale-105"
            >
              Access Admin Portal{" "}
              <LogIn className="ml-2 text-green-800 w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    )
  }

  // Login UI
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-green-100 to-white px-4">
      <div className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-md animate-fadeIn">
        <h1 className="text-2xl font-bold flex items-center justify-center mb-6 text-gray-800">
          Login{" "}
          <LogIn className="ml-2 w-6 h-6 text-green-600 animate-bounce" />
        </h1>

        {step === "email" && (
          <>
            <input
              type="email"
              placeholder="Enter your BPA registered email"
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 mb-4 transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              onClick={sendOtp}
              disabled={sending || !email}
              className="w-full bg-green-600 text-white font-semibold py-2 rounded-lg shadow-md hover:bg-green-700 transition transform hover:scale-105 disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send OTP"}
            </button>
          </>
        )}

        {step === "otp" && (
          <>
            <div
              className="flex justify-between mt-10 mb-6"
              onPaste={handlePaste}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <input
                  key={i}
                  type="text"
                  maxLength={1}
                  ref={(el: any) => (inputsRef.current[i] = el)}
                  className="w-12 h-12 border border-gray-300 rounded-lg text-center text-xl focus:ring-2 focus:ring-green-500 transition transform hover:scale-105"
                  value={otp[i]}
                  onChange={(e) => handleChange(e.target.value, i)}
                />
              ))}
            </div>
            <button
              onClick={verifyOtp}
              disabled={otp.join("").length !== 6}
              className="w-full bg-green-600 text-white font-semibold py-2 rounded-lg shadow-md hover:bg-green-700 transition transform hover:scale-105 disabled:opacity-50"
            >
              Verify OTP
            </button>
          </>
        )}

        {error && (
          <p className="text-red-600 text-center mt-4 animate-pulse">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
