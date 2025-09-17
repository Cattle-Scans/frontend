import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import FileUpload from "../components/image-upload";
import { toast } from "sonner";
import {
  Scan as ScanIcon,
  Sparkles,
  TrendingUp,
  Award,
  ThumbsUp,
  ThumbsDown,
  Flag,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";

interface ScanResult {
  data: Record<string, string> | null;
  error: string | null;
}

const ML_API = "https://backend-afya.onrender.com" as string;


function useBreedInfo(breedName: string | null) {
  return useQuery({
    queryKey: ["breed-info", breedName],
    queryFn: async () => {
      if (!breedName) return null;

      const { data, error } = await supabase
        .from("breeds")
        .select(`
    *,
    breed_origins (
      parent_breed,
      contribution_percentage
    )
  `)
        .eq("name", breedName)
        .single(); //
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!breedName,
  });
}


export default function Scan() {
  const { session } = useAuth();
  const user = session?.user ?? null;

  const [file, setFile] = useState<File | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [inspectionReason, setInspectionReason] = useState("");

  const handleReset = () => {
    setFile(null);
    setScanId(null);
    setInspectionReason("");
    scanMutation.reset();
    uploadMutation.reset();
    saveDataMutation.reset();
  };

  // 1️⃣ SCAN IMAGE
  const scanMutation = useMutation({
    mutationFn: async (file: File): Promise<ScanResult> => {
      toast.loading("Analyzing image...");
      const formData = new FormData();
      formData.append("image", file);
      console.log(formData, ML_API)
      const res = await fetch(ML_API, {
        method: "POST",
        body: formData,
      });


      if (!res.ok) throw new Error("Failed to scan");
      const data = (await res.json()) as ScanResult;
      if (data.error) throw new Error("Scan returned an error");
      return data;
    },
    onSuccess: (_data, file) => {
      toast.dismiss();
      toast.success("Scan complete!");
      uploadMutation.mutate(file);
      // fetch breed metadata
    },
    onError: (err: Error) => {
      toast.dismiss();
      toast.error("Scan failed", { description: err.message });
    },
  });
  const breedInfo = useBreedInfo(
    scanMutation.data?.data ? Object.keys(scanMutation.data.data)[0] : null
  ).data;
  // 2️⃣ UPLOAD IMAGE
  const uploadMutation = useMutation({
    mutationFn: async (file: File): Promise<string> => {
      toast.loading("Uploading image...");
      const fileName = `images/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from("cnb")
        .upload(fileName, file);

      if (error) throw new Error(error.message);

      const { data: publicUrlData } = supabase.storage
        .from("cnb")
        .getPublicUrl(fileName);

      return publicUrlData.publicUrl;
    },
    onSuccess: (publicUrl) => {
      toast.dismiss();
      saveDataMutation.mutate(publicUrl);
    },
    onError: (err: Error) => {
      toast.dismiss();
      toast.error("Upload failed", { description: err.message });
    },
  });

  // 3️⃣ SAVE SCAN
  const saveDataMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      toast.loading("Saving scan data...");
      if (!scanMutation.data?.data) throw new Error("No scan results to save");
      // const locations = await getCurrentLocation();

      const { data, error } = await supabase
        .from("cattle_scans")
        .insert([
          {
            image_url: imageUrl,
            ai_prediction: scanMutation.data.data,
            location,
            scanned_by_user_id: user?.id ?? null,
          },
        ])
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return data.id as string;
    },
    onSuccess: (id) => {
      setScanId(id);
      toast.dismiss();
      toast.success("Scan saved to cloud!");
    },
    onError: (err: Error) => {
      toast.dismiss();
      toast.error("Save failed", { description: err.message });
    },
  });

  // 4️⃣ MUTATION: Helpful / Not Helpful
  const reviewMutation = useMutation({
    mutationFn: async ({ id, isHelpful }: { id: string; isHelpful: boolean }) => {
      if (!user) throw new Error("Login required");
      const { error } = await supabase
        .from("cattle_scans")
        .update({ is_helpful: isHelpful, scanned_by_user_id: user?.id ?? null })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => toast.success("Feedback saved!"),
    onError: (err: Error) => toast.error(err.message),
  });

  // 5️⃣ MUTATION: Flag for Inspection
  const flagMutation = useMutation({
    mutationFn: async ({ id, flag, reason }: { id: string; flag: boolean, reason: string }) => {
      if (!user) throw new Error("Login required");
      const { error } = await supabase
        .from("cattle_scans")
        .update({
          flagged_for_inspection: flag,
          inspection_reason: flag ? reason : null,
          scanned_by_user_id: user?.id ?? null
        })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => toast.success("Flag submitted!"),
    onError: (err: Error) => toast.error(err.message),
  });

  const topPrediction = scanMutation.data?.data
    ? Object.entries(scanMutation.data.data).sort(
      (a, b) => parseFloat(b[1]) - parseFloat(a[1])
    )[0]
    : null;

  const handleScan = () => {
    if (!file) {
      toast.warning("Image required", {
        description: "Please capture or upload an image first",
      });
      return;
    }
    scanMutation.mutate(file);
  };

  const confidenceScore = topPrediction ? parseFloat(topPrediction[1]) : 0;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm">
            <ScanIcon className="w-12 h-12" />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">AI Cattle Scanner</h1>
        <p className="text-xl max-w-2xl mx-auto">
          Advanced breed identification and analysis powered by machine learning
        </p>
      </div>

      {/* Main */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          {/* Upload Section */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              Upload Your Cattle Image
            </h2>
            <p className="text-gray-600">
              Take a clear photo or upload an existing image for instant breed analysis
            </p>
          </div>

          <FileUpload onFileSelect={setFile} onReset={handleReset} />

          {/* Scan Button */}
          {file && (
            <div className="text-center">
              <button
                onClick={handleScan}
                disabled={
                  scanMutation.isPending ||
                  uploadMutation.isPending ||
                  saveDataMutation.isPending
                }
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-50 to-green-300 text-gray-800 hover:cursor-pointer font-semibold rounded-xl shadow-lg transition-all duration-200"
              >
                {scanMutation.isPending ||
                  uploadMutation.isPending ||
                  saveDataMutation.isPending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Analyze Cattle
                  </>
                )}
              </button>
            </div>
          )}

          {/* Results */}
          {file && scanMutation.isSuccess && scanMutation.data?.data && (
            <div className="mt-12">
              <div className="bg-white rounded-2xl shadow-xl border  border-gray-100 overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-2">
                  {/* Left: Image Preview */}
                  <div className="relative bg-gray-50 flex items-center justify-center p-6">
                    <img
                      src={URL.createObjectURL(file)}
                      alt="Cattle Preview"
                      className="w-full max-h-[500px] object-contain rounded-xl border border-gray-200 shadow-md"
                    />
                  </div>

                  {/* Right: Results */}
                  <div className="flex flex-col">
                    {/* Results Header */}
                    <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Award className="w-6 h-6 text-white" />
                        <h3 className="text-xl font-semibold text-white">
                          Analysis Results
                        </h3>
                      </div>
                    </div>

                    {/* Scrollable content if too long */}
                    <div className="p-6">
                      {/* Top Prediction Highlight */}
                      {topPrediction && (
                        <div className="bg-gradient-to-r from-green-50 to-green-100 px-6 py-6 border border-green-200 rounded-xl mb-6 shadow-sm">
                          <div className="text-center">
                            <h4 className="text-2xl font-bold text-gray-800 mb-2">
                              {topPrediction[0]}
                            </h4>
                            <div className="flex items-center justify-center gap-2 mb-4">
                              <TrendingUp className="w-5 h-5 text-green-500" />
                              <span className="text-lg font-semibold text-green-600">
                                {confidenceScore}% Confidence
                              </span>
                            </div>
                            {/* Confidence Bar */}
                            <div className="w-full max-w-sm mx-auto bg-gray-200 rounded-full h-3">
                              <div
                                className="bg-gradient-to-r from-green-500 to-green-300 h-3 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${confidenceScore}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* All Predictions */}
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">
                          Detailed Analysis
                        </h4>
                        <div className="space-y-3">
                          {Object.entries(scanMutation.data.data)
                            .sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]))
                            .map(([breed, probability], index) => {
                              const percentage = probability;
                              const isTop = index === 0;



                              return (
                                <div
                                  key={breed}
                                  className={`flex flex-col gap-2 p-4 rounded-xl transition-all duration-200 ${isTop
                                    ? "bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-200"
                                    : "bg-gray-50 hover:bg-gray-100"
                                    }`}
                                >
                                  {/* prediction row */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      {isTop && <Award className="w-5 h-5 text-green-500" />}
                                      <span
                                        className={`font-medium ${isTop ? "text-green-800" : "text-gray-700"
                                          }`}
                                      >
                                        {breed}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="w-24 bg-gray-200 rounded-full h-2">
                                        <div
                                          className={`h-2 rounded-full transition-all duration-1000 ease-out ${isTop
                                            ? "bg-gradient-to-r from-green-500 to-green-600"
                                            : "bg-gradient-to-r from-green-300 to-green-400"
                                            }`}
                                          style={{ width: `${percentage}%` }}
                                        ></div>
                                      </div>
                                      <span
                                        className={`text-sm font-semibold min-w-[3rem] text-right ${isTop ? "text-green-700" : "text-green-500"
                                          }`}
                                      >
                                        {percentage}%
                                      </span>
                                    </div>
                                  </div>

                                  {/* metadata keywords */}
                                  {breedInfo && (
                                    <div className="text-sm text-gray-600 grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                      <p><strong>Status:</strong> {breedInfo.status}</p>
                                      <p><strong>Conservation:</strong> {breedInfo.conservation_status}</p>
                                      <p><strong>Adaptability:</strong> {breedInfo.adaptability}</p>
                                      <p><strong>Temperament:</strong> {breedInfo.temperament}</p>
                                      {breedInfo.avg_milk_yield_min && breedInfo.avg_milk_yield_max && (
                                        <p>
                                          <strong>Milk Yield:</strong> {breedInfo.avg_milk_yield_min} -{" "}
                                          {breedInfo.avg_milk_yield_max} {breedInfo.milk_yield_unit}
                                        </p>
                                      )}
                                      {breedInfo.key_characteristics?.length > 0 && (
                                        <p>
                                          <strong>Key Traits:</strong>{" "}
                                          {breedInfo.key_characteristics.join(", ")}
                                        </p>
                                      )}
                                      {breedInfo.breed_origins?.length > 0 && (
                                        <p>
                                          <strong>Origins:</strong>{" "}
                                          {breedInfo.breed_origins
                                            .map((o: any) => `${o.parent_breed} (${o.contribution_percentage}%)`)
                                            .join(", ")}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
              {/* ✅ Helpful / Not Helpful */}
              {scanId && (
                <div className="bg-white shadow p-6 rounded-xl mt-6">
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <ThumbsUp className="w-5 h-5 text-blue-600" /> Review
                  </h3>
                  {user ? (
                    <div className="flex gap-4">
                      <button
                        onClick={() =>
                          reviewMutation.mutate({
                            id: scanId,
                            isHelpful: true,
                          })
                        }
                        className="px-4 py-2 cursor-pointer bg-green-100 rounded-lg hover:bg-green-200 flex items-center gap-2"
                      >
                        <ThumbsUp className="w-4 h-4" /> Helpful
                      </button>
                      <button
                        onClick={() =>
                          reviewMutation.mutate({
                            id: scanId,
                            isHelpful: false,
                          })
                        }
                        className="px-4 py-2 cursor-pointer bg-red-100 rounded-lg hover:bg-red-200 flex items-center gap-2"
                      >
                        <ThumbsDown className="w-4 h-4" /> Not Helpful
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-500">
                      Login required to review
                    </p>
                  )}
                </div>
              )}

              {/* 🚩 Flag for Inspection */}
              {scanId && (
                <div className="bg-white shadow p-6 rounded-xl mt-6">
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <Flag className="w-5 h-5 text-red-600" /> Flag for
                    Inspection
                  </h3>
                  {user ? (
                    <>
                      <textarea
                        value={inspectionReason}
                        onChange={(e) =>
                          setInspectionReason(e.target.value)
                        }
                        placeholder="Reason for flagging..."
                        className="w-full border-1 border-gray-200 rounded-lg p-2 mb-3"
                      />
                      <button
                        onClick={() =>
                          flagMutation.mutate({
                            id: scanId,
                            flag: true,
                            reason: inspectionReason,
                          })
                        }
                        disabled={
                          flagMutation.isPending || !inspectionReason
                        }
                        className="px-4 py-2 cursor-pointer bg-yellow-100 rounded-lg hover:bg-yellow-200"
                      >
                        {flagMutation.isPending
                          ? "Submitting..."
                          : "Submit Flag"}
                      </button>
                    </>
                  ) : (
                    <p className="text-gray-500">
                      Login required to flag
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}