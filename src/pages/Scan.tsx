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

interface ScanResult {
  [breed: string]: number;
}

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

  // Reset state
  const handleReset = () => {
    setFile(null);
    setScanId(null);
    setInspectionReason("");
    scanMutation.reset();
    uploadMutation.reset();
    saveDataMutation.reset();
    reviewMutation.reset();
    flagMutation.reset();
  };

  // 1️⃣ SCAN IMAGE (FastAPI backend on HF Space)
  const scanMutation = useMutation({
    mutationFn: async (
      file: File
    ): Promise<{ predictions: { label: string; confidence: number }[] }> => {
      toast.loading("Analyzing image...");
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        "https://sap000-cattle-buffaloes.hf.space/predict",
        {
          method: "POST",
          body: formData,
        }
      );
      if (!res.ok) throw new Error(`Prediction failed: ${res.statusText}`);

      const json: ScanResult = await res.json();
      const predictions = Object.entries(json).map(([label, confidence]) => ({
        label,
        confidence: Number(confidence),
      }));

      return { predictions };
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

  // 2️⃣ UPLOAD IMAGE TO SUPABASE
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

  // 3️⃣ SAVE SCAN TO SUPABASE
  const saveDataMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      toast.loading("Saving scan data...");
      if (!scanMutation.data) throw new Error("No scan results to save");

      const location = await getBestLocation();

      const { data, error } = await supabase
        .from("cattle_scans")
        .insert([
          {
            image_url: imageUrl,
            ai_prediction: scanMutation.data.predictions,
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
      toast.success("Scan saved!");
    },
    onError: (err: Error) => {
      toast.dismiss();
      toast.error("Save failed", { description: err.message });
    },
  });

  // 4️⃣ FEEDBACK
  const reviewMutation = useMutation({
    mutationFn: async ({
      id,
      isHelpful,
    }: {
      id: string;
      isHelpful: boolean;
    }) => {
      if (!user) throw new Error("Login required");
      const { error } = await supabase
        .from("cattle_scans")
        .update({ is_helpful: isHelpful })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => toast.success("Feedback saved!"),
    onError: (err: Error) => toast.error(err.message),
  });

  // 5️⃣ FLAG
  const flagMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      if (!user) throw new Error("Login required");
      const { error } = await supabase
        .from("cattle_scans")
        .update({
          flagged_for_inspection: true,
          inspection_reason: reason,
        })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => toast.success("Flag submitted!"),
    onError: (err: Error) => toast.error(err.message),
  });

  // Helpers
  const topPrediction = scanMutation.data
    ? [...scanMutation.data.predictions].sort(
      (a, b) => b.confidence - a.confidence
    )[0]
    : null;
  const confidenceScore = topPrediction ? topPrediction.confidence : 0;

  const { data: breedInfo } = useBreedInfo(topPrediction?.label ?? null);

  const handleScan = () => {
    if (!file) {
      toast.warning("Image required", {
        description: "Please capture or upload first",
      });
      return;
    }
    scanMutation.mutate(file);
  };

  return (
    <div className="min-h-screen ">
      {/* Header */}
      <div className="relative max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-green-100 rounded-2xl shadow-lg">
            <ScanIcon className="w-12 h-12 animate-pulse text-green-600" />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800">
          AI Cattle Scanner
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mt-3">
          Upload a cattle image and get instant predictions powered by ML
        </p>
      </div>

      {/* Body */}
      <div className="max-w-4xl mx-auto px-4 space-y-10">
        {/* Upload */}
        <section className="bg-white rounded-2xl shadow-md p-6 space-y-6">
          <h2 className="text-center text-2xl font-semibold text-gray-800">
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
                className="gap-2 cursor-pointer bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl shadow-md"
              >
                {scanMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
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
        {file && scanMutation.isSuccess && scanMutation.data && (
          <section className="bg-white rounded-2xl shadow-md p-6 space-y-6">
            <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800">
              <Award className="w-5 h-5 text-green-600" />
              Results
            </h2>

            {/* Top Prediction */}
            {topPrediction && (
              <div className="text-center space-y-3">
                <h3 className="text-2xl font-bold text-gray-900">
                  {topPrediction.label}
                </h3>
                <div className="flex justify-center gap-2 text-green-600">
                  <TrendingUp className="w-5 h-5" />
                  <span className="font-semibold">
                    {confidenceScore.toFixed(2)}% Confidence
                  </span>
                </div>
                <div className="w-full max-w-md mx-auto h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${confidenceScore}%` }}
                  />
                </div>
              </div>
            )}

            {/* Prediction list */}
            <div className="space-y-2">
              {scanMutation.data.predictions
                .sort((a, b) => b.confidence - a.confidence)
                .map((pred, i) => (
                  <div
                    key={pred.label}
                    className={`flex items-center justify-between p-3 rounded-xl border ${i === 0
                      ? "bg-green-50 border-green-200"
                      : "bg-gray-50 border-gray-200"
                      }`}
                  >
                    <span className="font-medium text-gray-800">
                      {pred.label}
                    </span>
                    <span className="font-semibold text-gray-700">
                      {pred.confidence.toFixed(2)}%
                    </span>
                  </div>
                ))}
            </div>

            {/* Breed Metadata */}
            {breedInfo && (
              <div className="bg-gray-50 rounded-xl p-6 shadow-inner text-sm text-gray-700 space-y-2">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Breed Information
                </h3>
                <p>
                  <strong>Name:</strong> {breedInfo.name}
                </p>
                <p>
                  <strong>Species:</strong> {breedInfo.species}
                </p>
                <p>
                  <strong>Status:</strong> {breedInfo.status}
                </p>
                <p>
                  <strong>Origin:</strong> {breedInfo.origin}
                </p>
                <p>
                  <strong>Conservation:</strong> {breedInfo.conservation_status}
                </p>
                <p>
                  <strong>Adaptability:</strong> {breedInfo.adaptability}
                </p>
                <p>
                  <strong>Temperament:</strong> {breedInfo.temperament}
                </p>
                <p>
                  <strong>Description:</strong> {breedInfo.description}
                </p>

                {breedInfo.avg_milk_yield_min &&
                  breedInfo.avg_milk_yield_max && (
                    <p>
                      <strong>Milk Yield:</strong>{" "}
                      {breedInfo.avg_milk_yield_min} –{" "}
                      {breedInfo.avg_milk_yield_max} {breedInfo.milk_yield_unit}
                    </p>
                  )}

                {breedInfo.avg_body_weight_min &&
                  breedInfo.avg_body_weight_max && (
                    <p>
                      <strong>Body Weight:</strong>{" "}
                      {breedInfo.avg_body_weight_min} –{" "}
                      {breedInfo.avg_body_weight_max}{" "}
                      {breedInfo.body_weight_unit}
                    </p>
                  )}

                {breedInfo.native_region && (
                  <p>
                    <strong>Native Region:</strong> {breedInfo.native_region}
                  </p>
                )}

                {breedInfo.key_characteristics?.length > 0 && (
                  <p>
                    <strong>Key Traits:</strong>{" "}
                    {breedInfo.key_characteristics.join(", ")}
                  </p>
                )}

                {breedInfo.stock_img_url && (
                  <div className="mt-4">
                    <img
                      src={breedInfo.stock_img_url}
                      alt={`${breedInfo.name} stock`}
                      className="w-full max-h-64 object-cover rounded-lg shadow-md"
                    />
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Review */}
        {scanId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">Feedback</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button
                variant="outline"
                onClick={() =>
                  reviewMutation.mutate({ id: scanId!, isHelpful: true })
                }
                className="gap-2 cursor-pointer border-green-600 text-green-600 hover:bg-green-50"
              >
                <ThumbsUp className="w-4 h-4" /> Helpful
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  reviewMutation.mutate({ id: scanId!, isHelpful: false })
                }
                className="gap-2 cursor-pointer border-red-600 text-red-600 hover:bg-red-50"
              >
                <ThumbsDown className="w-4 h-4" /> Not Helpful
              </Button>
            </CardContent>
          </Card>
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
            <CardContent className="space-y-3">
              <Textarea
                value={inspectionReason}
                onChange={(e) => setInspectionReason(e.target.value)}
                placeholder="Reason for flagging..."
              />
              <Button
                variant="destructive"
                className="cursor-pointer px-4 py-2 rounded-xl shadow-md"
                disabled={flagMutation.isPending || !inspectionReason}
                onClick={() =>
                  flagMutation.mutate({ id: scanId!, reason: inspectionReason })
                }
              >
                {flagMutation.isPending ? "Submitting..." : "Submit Flag"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
