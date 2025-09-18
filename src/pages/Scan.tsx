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
import { getBestLocation } from "../utils/location";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Progress } from "../components/ui/progress";

interface ScanResult {
  data: Record<string, string> | null;
  error: string | null;
}

const ML_API = "https://backend-afya.onrender.com";

function useBreedInfo(breedName: string | null) {
  return useQuery({
    queryKey: ["breed-info", breedName],
    queryFn: async () => {
      if (!breedName) return null;

      const { data, error } = await supabase
        .from("breeds")
        .select("*")
        .eq("name", breedName)
        .single();
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
        .upload(fileName, file, { upsert: true });

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
      const location = await getBestLocation();

      const { data, error } = await supabase
        .from("cattle_scans")
        .insert([
          {
            image_url: imageUrl,
            ai_prediction: scanMutation.data.data,
            location: location.error ? null : location.data,
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

  // 4️⃣ HELPFUL REVIEW
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

  // 5️⃣ FLAG FOR INSPECTION
  const flagMutation = useMutation({
    mutationFn: async ({ id, flag, reason }: { id: string; flag: boolean; reason: string }) => {
      if (!user) throw new Error("Login required");
      const { error } = await supabase
        .from("cattle_scans")
        .update({
          flagged_for_inspection: flag,
          inspection_reason: flag ? reason : null,
          scanned_by_user_id: user?.id ?? null,
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

  const confidenceScore = topPrediction ? parseFloat(topPrediction[1]) : 0;

  const handleScan = () => {
    if (!file) {
      toast.warning("Image required", {
        description: "Please capture or upload an image first",
      });
      return;
    }
    scanMutation.mutate(file);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-green-100 rounded-2xl shadow-sm">
            <ScanIcon className="w-12 h-12 animate-pulse" />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-800">
          AI Cattle Scanner
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Advanced breed identification and analysis powered by machine learning
        </p>
      </div>

      {/* Main */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">

        {/* Upload */}
        <section className="bg-white rounded-2xl shadow-md p-6 space-y-6">
          <h2 className="text-center text-2xl font-bold text-gray-800">
            Upload Your Cattle Image
          </h2>

          <FileUpload onFileSelect={setFile} onReset={handleReset} />

          {file && (
            <div className="text-center">
              <Button
                onClick={handleScan}
                disabled={
                  scanMutation.isPending ||
                  uploadMutation.isPending ||
                  saveDataMutation.isPending
                }
                size="lg"
                className="gap-2 cursor-pointer bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg shadow-md transition"
              >
                {scanMutation.isPending ||
                  uploadMutation.isPending ||
                  saveDataMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Analyze Cattle
                  </>
                )}
              </Button>
            </div>
          )}
        </section>

        {/* Results */}
        {file && scanMutation.isSuccess && scanMutation.data?.data && (
          <section className="bg-white rounded-2xl shadow-md p-6 space-y-8">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-800">
              <Award className="w-5 h-5 text-green-600" />
              Analysis Results
            </h2>

            {/* Top Prediction */}
            {topPrediction && (
              <div className="text-center space-y-4">
                <h3 className="text-2xl font-bold text-gray-800">
                  {topPrediction[0]}
                </h3>
                <div className="flex items-center justify-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <span className="font-semibold text-green-600">
                    {confidenceScore}% Confidence
                  </span>
                </div>
                <div className="relative w-full max-w-md mx-auto h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full bg-green-500 transition-all"
                    style={{ width: `${confidenceScore}%` }}
                  />
                </div>
              </div>
            )}

            {/* Detailed Predictions */}
            <div className="space-y-4">
              {Object.entries(scanMutation.data.data)
                .sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]))
                .map(([breed, probability], index) => {
                  const percentage = parseFloat(probability);
                  const isTop = index === 0;

                  return (
                    <div
                      key={breed}
                      className={`p-4 rounded-xl transition-all flex items-center justify-between ${isTop
                        ? "bg-green-50 border border-green-200 shadow-sm"
                        : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        {isTop && <Award className="w-4 h-4 text-green-600" />}
                        <span className="font-medium text-gray-800">{breed}</span>
                      </div>
                      <div className="flex items-center gap-3 w-40">
                        <div className="relative flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`absolute left-0 top-0 h-full ${isTop ? "bg-green-500" : "bg-green-400"
                              } transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-700 min-w-[3rem] text-right">
                          {percentage}%
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Breed Metadata */}
            {breedInfo && (
              <div className="bg-gray-50 rounded-xl p-6 shadow-inner space-y-2 text-sm text-gray-700">
                <p><strong>Status:</strong> {breedInfo.status}</p>
                <p><strong>Conservation:</strong> {breedInfo.conservation_status}</p>
                <p><strong>Adaptability:</strong> {breedInfo.adaptability}</p>
                <p><strong>Temperament:</strong> {breedInfo.temperament}</p>
                {breedInfo.avg_milk_yield_min && breedInfo.avg_milk_yield_max && (
                  <p>
                    <strong>Milk Yield:</strong> {breedInfo.avg_milk_yield_min} –{" "}
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
                    <strong>Genetical Origins:</strong>{" "}
                    {breedInfo.breed_origins
                      .map((o: any) => `${o.parent_breed} (${o.contribution_percentage}%)`)
                      .join(", ")}
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {/* Review */}
        {scanId && (
          <section className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-800 mb-4">
              <ThumbsUp className="w-5 h-5 text-blue-600" />
              Review
            </h2>
            {user ? (
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() =>
                    reviewMutation.mutate({ id: scanId, isHelpful: true })
                  }
                  className="flex cursor-pointer items-center gap-2 border-green-600 text-green-600 hover:bg-green-50"
                >
                  <ThumbsUp className="w-4 h-4" /> Helpful
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    reviewMutation.mutate({ id: scanId, isHelpful: false })
                  }
                  className="flex cursor-pointer items-center gap-2 border-red-600 text-red-600 hover:bg-red-50"
                >
                  <ThumbsDown className="w-4 h-4" /> Not Helpful
                </Button>
              </div>
            ) : (
              <p className="text-gray-500">Login required to review</p>
            )}
          </section>
        )}

        {/* Flag */}
        {scanId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-red-600" />
                Flag for Inspection
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user ? (
                <div className="space-y-3">
                  <Textarea
                    value={inspectionReason}
                    onChange={(e) => setInspectionReason(e.target.value)}
                    placeholder="Reason for flagging..."
                  />
                  <Button
                    variant="destructive"
                    disabled={flagMutation.isPending || !inspectionReason}
                    className="cursor-pointer"
                    onClick={() =>
                      flagMutation.mutate({
                        id: scanId,
                        flag: true,
                        reason: inspectionReason,
                      })
                    }
                  >
                    {flagMutation.isPending ? "Submitting..." : "Submit Flag"}
                  </Button>
                </div>
              ) : (
                <p className="text-gray-500">Login required to flag</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div >
  );
}
