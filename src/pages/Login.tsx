import { useState, useRef, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { useAuth } from "../hooks/useAuth"
import {
  LogIn,
  LogOutIcon,
  ChevronDown,
  ChevronUp,
  Flag,
} from "lucide-react"
import { toast } from "sonner"
import { Link } from "react-router-dom"

interface CattleScan {
  id: string
  image_url: string
  ai_prediction: { label: string; confidence: number }[]
  flagged_for_inspection: boolean
  created_at: string
  confirmed_breed?: string | null
  comment?: string | null
}

export default function Login() {
  const { session, loading } = useAuth()
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState(Array(6).fill(""))
  const [step, setStep] = useState<"email" | "otp">("email")
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const [history, setHistory] = useState<CattleScan[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  // New loading state for history
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Filters
  const [filterConfirmed, setFilterConfirmed] = useState<
    "all" | "confirmed" | "unconfirmed"
  >("all")
  const [filterFlagged, setFilterFlagged] = useState(false)
  const [sortOrder, setSortOrder] = useState<"latest" | "oldest">("latest")

  // Pagination
  const [page, setPage] = useState(1)
  const perPage = 10

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

  // Fetch history when logged in
  useEffect(() => {
    if (!session) return

    const fetchHistory = async () => {
      setLoadingHistory(true) // start loading
      toast.loading("Loading your scans...")

      const { data: scans, error: scanError } = await supabase
        .from("cattle_scans")
        .select(
          `
          id,
          image_url,
          ai_prediction,
          flagged_for_inspection,
          created_at
        `
        )
        .eq("scanned_by_user_id", session.user.id)
        .order("created_at", { ascending: false })

      if (scanError) {
        toast.dismiss()
        toast.error(scanError.message)
        setLoadingHistory(false)
        return
      }

      const scansWithConfirmed: CattleScan[] = []
      for (const scan of scans || []) {
        const { data: confirmed } = await supabase
          .from("confirmed_cattle_breeds")
          .select("breed")
          .eq("scan_id", scan.id)
          .maybeSingle()

        scansWithConfirmed.push({
          ...scan,
          confirmed_breed: confirmed?.breed ?? null,
        })
      }

      setHistory(scansWithConfirmed)
      toast.dismiss()
      setLoadingHistory(false) // stop loading
    }

    fetchHistory()
  }, [session])

  // Toggle flag
  const toggleFlag = async (scan: CattleScan, value: boolean) => {
    const { error } = await supabase
      .from("cattle_scans")
      .update({ flagged_for_inspection: value })
      .eq("id", scan.id)

    if (error) toast.error(error.message)
    else {
      toast.success(value ? "Flagged!" : "Unflagged!")
      setHistory((prev) =>
        prev.map((h) =>
          h.id === scan.id ? { ...h, flagged_for_inspection: value } : h
        )
      )
    }
  }

  // Apply filters + sorting
  const filteredHistory = history
    .filter((h) => {
      if (filterConfirmed === "confirmed" && !h.confirmed_breed) return false
      if (filterConfirmed === "unconfirmed" && h.confirmed_breed) return false
      if (filterFlagged && !h.flagged_for_inspection) return false
      return true
    })
    .sort((a, b) => {
      return sortOrder === "latest"
        ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

  const paginatedHistory = filteredHistory.slice(
    (page - 1) * perPage,
    page * perPage
  )
  const totalPages = Math.ceil(filteredHistory.length / perPage)

  // Loading spinner for auth
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
      <div className="flex flex-col md:flex-row min-h-screen bg-gradient-to-b from-green-100 to-white">
        {/* Sidebar */}
        <div className="w-full rounded-2xl mt-4  md:w-72 bg-white shadow-lg p-6 flex flex-col gap-6 animate-fadeIn">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-gray-700">BPA PORTAL</h1>
            <p className="text-sm font-semibold text-green-600 mt-1">
              ID: {session.user.user_metadata.id}
            </p>
          </div>

          <button
            onClick={signOut}
            className="w-full border cursor-pointer border-gray-200 hover:bg-gray-100 flex items-center justify-center font-semibold text-black py-2 rounded-lg transition transform hover:scale-105"
          >
            Log Out <LogOutIcon className="ml-2 w-4 h-4 text-green-800" />
          </button>

          {session.user.user_metadata.role === "admin" && (
            <Link
              to="/admin"
              className="w-full border border-gray-200 hover:bg-gray-100 flex items-center justify-center font-semibold text-black py-2 rounded-lg transition transform hover:scale-105"
            >
              Admin Portal <LogIn className="ml-2 w-4 h-4 text-green-800" />
            </Link>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">
            Your Scan History
          </h2>

          {/* Show loader while fetching history */}
          {loadingHistory ? (
            <div className="flex justify-center items-center mt-20 py-20">
              <div className="w-20 h-20 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-6 animate-fadeIn">
                <select
                  value={filterConfirmed}
                  onChange={(e) =>
                    setFilterConfirmed(e.target.value as typeof filterConfirmed)
                  }
                  className="border cursor-pointer bg-white rounded-lg px-3 py-2 shadow-sm"
                >
                  <option value="all">All Status</option>
                  <option value="confirmed">Confirmed Only</option>
                  <option value="unconfirmed">Unconfirmed Only</option>
                </select>

                <select
                  value={sortOrder}
                  onChange={(e) =>
                    setSortOrder(e.target.value as typeof sortOrder)
                  }
                  className="border cursor-pointer bg-white rounded-lg px-3 py-2 shadow-sm"
                >
                  <option value="latest">Latest First</option>
                  <option value="oldest">Oldest First</option>
                </select>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filterFlagged}
                    onChange={(e) => setFilterFlagged(e.target.checked)}
                    className="accent-red-600 cursor-pointer"
                  />
                  Flagged Only
                </label>
              </div>

              {/* History list */}
              <div className="space-y-4">
                {paginatedHistory.map((scan) => (
                  <div
                    key={scan.id}
                    className="border rounded-xl p-4 shadow bg-white transition transform hover:scale-[1.01] animate-fadeIn"
                  >
                    <div
                      className="flex justify-between items-center cursor-pointer"
                      onClick={() =>
                        setExpanded(expanded === scan.id ? null : scan.id)
                      }
                    >
                      <div>
                        <p className="font-semibold text-gray-800">
                          {new Date(scan.created_at).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-500">
                          {scan.confirmed_breed
                            ? `✅ Confirmed: ${scan.confirmed_breed}`
                            : "❌ Not confirmed"}
                        </p>
                      </div>
                      {expanded === scan.id ? (
                        <ChevronUp className="w-5 h-5 transition-transform rotate-180" />
                      ) : (
                        <ChevronDown className="w-5 h-5 transition-transform" />
                      )}
                    </div>

                    {expanded === scan.id && (
                      <div className="mt-4 space-y-3 animate-slideDown">
                        <img
                          src={scan.image_url}
                          alt="scan"
                          className="w-full max-h-64 object-cover rounded-lg shadow"
                        />
                        <div>
                          <h3 className="font-semibold">Predictions</h3>
                          <ul className="list-disc list-inside text-sm text-gray-700">
                            {scan.ai_prediction.map((p, i) => (
                              <li key={i}>
                                {p.label} – {p.confidence.toFixed(2)}%
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h3 className="font-semibold">Comment</h3>
                          <p className="list-disc list-inside text-sm text-gray-700">
                            {scan?.comment ?? "No comment provided."}
                          </p>
                        </div>

                        {/* Flag toggle */}
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={scan.flagged_for_inspection}
                            onChange={(e) => toggleFlag(scan, e.target.checked)}
                            className="w-5 h-5 accent-red-600"
                          />
                          <span>
                            {scan.flagged_for_inspection
                              ? "Marked for inspection"
                              : "Not flagged"}
                          </span>
                          <Flag
                            className={`w-4 h-4 ${scan.flagged_for_inspection
                              ? "text-red-600"
                              : "text-gray-400"
                              }`}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-6">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1 coursor-pointer rounded border bg-white disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1 coursor-pointer rounded border bg-white disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
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
          Login <LogIn className="ml-2 w-6 h-6 text-green-600 animate-bounce" />
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
