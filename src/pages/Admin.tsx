import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { toast } from "sonner";

// ---- Types ----
type Breed = {
  id?: string;
  name: string;
  species: "Cattle" | "Buffalo";
  origin?: string;
  status: "Indigenous" | "Purebred" | "Crossbreed" | "Composite";
  description?: string;
  key_characteristics?: string[];
  native_region?: string;
  avg_milk_yield_min?: number;
  avg_milk_yield_max?: number;
  milk_yield_unit?: "L/day" | "L/year";
  avg_body_weight_min?: number;
  avg_body_weight_max?: number;
  body_weight_unit?: "kg" | "lb";
  adaptability?: string;
  temperament: "Docile" | "Aggressive" | "Calm";
  conservation_status: "Commom" | "Rare" | "Endangered";
  stock_img_url?: string;
  created_at?: string;
};

type BreedOrigin = {
  id: string;
  breed: string;
  parent_breed: string;
  contribution_percentage?: number;
  created_at: string;
};

type CattleScan = {
  id: string;
  image_url: string;
  location?: Record<string, unknown>;
  ai_prediction: Record<string, unknown>;
  scanned_by_user_id?: string;
  is_helpful?: boolean;
  flagged_for_inspection?: boolean;
  inspection_reason?: string;
  created_at: string;
};

type ConfirmedCattleBreed = {
  id: string;
  scan_id?: string;
  image_url: string;
  breed: string;
  confirmed_by_user_id?: string;
  created_at: string;
};

// ---- Queries ----
async function fetchBreeds(): Promise<Breed[]> {
  const { data, error } = await supabase.from("breeds").select("*");
  if (error) throw error;
  return data as Breed[];
}
async function fetchScans(): Promise<CattleScan[]> {
  const { data, error } = await supabase.from("cattle_scans").select("*");
  if (error) throw error;
  return data as CattleScan[];
}
async function fetchConfirmed(): Promise<ConfirmedCattleBreed[]> {
  const { data, error } = await supabase.from("confirmed_cattle_breeds").select("*");
  if (error) throw error;
  return data as ConfirmedCattleBreed[];
}

// ---- AdminPage ----
export default function AdminPage() {
  const { session, loading } = useAuth();
  const user = session?.user;

  const [activeTab, setActiveTab] = useState<"upload" | "origins" | "scans" | "confirmed">("upload");
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-green-600 border-opacity-70 mb-6"></div>
        <p className="text-lg font-medium text-green-800 animate-pulse">
          Please wait, checking user...
        </p>
      </div>
    );
  }

  if (
    !user ||
    !((user.user_metadata as { role?: string })?.role === "admin")
  ) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="text-red-600 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938-4a9.001 9.001 0 1113.856 0A9.001 9.001 0 015.062 11z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-red-700 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600">
            You do not have permission to view this page.
          </p>
        </div>
      </div>
    );
  }


  return (
    <div className="p-6 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <div className="flex space-x-4 mb-8">
        {[
          { key: "upload", label: "Manage Breeds" },
          { key: "origins", label: "Manage Origins" },
          { key: "scans", label: "Confirm Scans" },
          { key: "confirmed", label: "Upload Confirmed Images" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-6 py-3 border border-gray-200 rounded-2xl font-semibold cursor-pointer shadow-md transition transform hover:scale-105 ${activeTab === tab.key
              ? "bg-green-600 text-white"
              : "bg-white text-green-800"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "upload" && <ManageBreeds />}
      {activeTab === "origins" && <ManageOrigins />}
      {activeTab === "scans" && <ConfirmScans />}
      {activeTab === "confirmed" && <UploadConfirmedImage />}
    </div>
  );
}

// ---- ManageBreeds (patched with expandable info) ----
function ManageBreeds() {
  const { data: breeds = [] } = useQuery({ queryKey: ["breeds"], queryFn: fetchBreeds });
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("breeds").delete().eq("name", name);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["breeds"] });
      toast.success("Breed deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <UploadBreedForm />
      <div className="bg-white p-6 rounded-2xl shadow">
        <h2 className="text-xl font-bold mb-4 text-green-800">Existing Breeds</h2>
        {breeds.map((breed) => (<>
          <div key={breed.name} className="border-b flex justify-between items-center py-3">
            <button
              onClick={() => setExpandedId(expandedId === breed.name ? null : breed.name)}
              className="text-green-700 font-semibold hover:underline cursor-pointer"
            >
              {breed.name}
            </button>
            <button
              onClick={() => deleteMutation.mutate(breed.name!)}
              className=" py-1 px-3 bg-red-500 text-white cursor-pointer rounded-lg hover:bg-red-600 transition"

            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </button>

          </div>
          {expandedId === breed.name && (
            <div className="mt-2 p-3 bg-green-50 rounded-lg text-sm">
              <p><b>Species:</b> {breed.species}</p>
              <p><b>Status:</b> {breed.status}</p>
              {breed.origin && <p><b>Origin:</b> {breed.origin}</p>}
              {breed.native_region && <p><b>Region:</b> {breed.native_region}</p>}
              {breed.description && <p className="mt-2">{breed.description}</p>}
              {breed.adaptability && <p><b>Adaptability:</b> {breed.adaptability}</p>}
              {breed.avg_milk_yield_min && (
                <p>
                  <b>Milk yield:</b> {breed.avg_milk_yield_min} - {breed.avg_milk_yield_max} {breed.milk_yield_unit}
                </p>
              )}
              {breed.avg_body_weight_min && (
                <p>
                  <b>Body weight:</b> {breed.avg_body_weight_min} - {breed.avg_body_weight_max} {breed.body_weight_unit}
                </p>
              )}
            </div >
          )}
        </>
        ))}
      </div>
    </div >
  );
}

function UploadBreedForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Breed & { stock_image: FileList }>();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: Breed & { stock_image: FileList }) => {
      let imageUrl = null;

      // Handle file upload
      if (data.stock_image && data.stock_image.length > 0) {
        const file = data.stock_image[0];
        const filePath = `images/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("cnb")
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("cnb")
          .getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      }

      // Exclude stock_image before insert
      const { stock_image, ...rest } = data;

      // Insert into breeds
      const { error } = await supabase.from("breeds").insert({
        ...rest,
        stock_img_url: imageUrl,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["breeds"] });
      reset();
      toast.success("Breed uploaded successfully");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <form
      onSubmit={handleSubmit((data) => mutation.mutate(data))}
      className="space-y-4 bg-white p-6 rounded-2xl shadow"
    >
      <h2 className="text-xl font-bold text-green-800 mb-4">Upload Breed</h2>

      <div>
        <input
          {...register("name", { required: "Breed name is required" })}
          placeholder="Breed Name"
          className="w-full border p-2 rounded"
        />
        {errors.name && (
          <p className="text-red-500 text-sm">{errors.name.message}</p>
        )}
      </div>

      <textarea
        {...register("description")}
        placeholder="Description"
        className="w-full border p-2 rounded"
      />

      <input
        type="file"
        {...register("stock_image")}
        className="w-full border p-2 rounded"
      />

      <input
        {...register("origin")}
        placeholder="Origin"
        className="w-full border p-2 rounded"
      />

      <input
        {...register("native_region")}
        placeholder="Native Region"
        className="w-full border p-2 rounded"
      />

      {/* Milk Yield */}
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          {...register("avg_milk_yield_min", { valueAsNumber: true })}
          placeholder="Milk Yield Min"
          className="border p-2 rounded"
        />
        <input
          type="number"
          {...register("avg_milk_yield_max", { valueAsNumber: true })}
          placeholder="Milk Yield Max"
          className="border p-2 rounded"
        />
      </div>
      <select {...register("milk_yield_unit")} className="w-full border p-2 rounded">
        <option value="L/year">L/year</option>
        <option value="L/day">L/day</option>
      </select>

      {/* Body Weight */}
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          {...register("avg_body_weight_min", { valueAsNumber: true })}
          placeholder="Body Weight Min"
          className="border p-2 rounded"
        />
        <input
          type="number"
          {...register("avg_body_weight_max", { valueAsNumber: true })}
          placeholder="Body Weight Max"
          className="border p-2 rounded"
        />
      </div>
      <select {...register("body_weight_unit")} className="w-full border p-2 rounded">
        <option value="kg">kg</option>
        <option value="lb">lb</option>
      </select>

      <input
        {...register("adaptability")}
        placeholder="Adaptability"
        className="w-full border p-2 rounded"
      />

      <select
        {...register("species", { required: "Species is required" })}
        className="w-full border p-2 rounded"
      >
        <option value="">Select species</option>
        <option value="Cattle">Cattle</option>
        <option value="Buffalo">Buffalo</option>
      </select>
      {errors.species && (
        <p className="text-red-500 text-sm">{errors.species.message}</p>
      )}

      <select
        {...register("status", { required: "Status is required" })}
        className="w-full border p-2 rounded"
      >
        <option value="">Select status</option>
        <option value="Indigenous">Indigenous</option>
        <option value="Purebred">Purebred</option>
        <option value="Crossbreed">Crossbreed</option>
        <option value="Composite">Composite</option>
      </select>
      {errors.status && (
        <p className="text-red-500 text-sm">{errors.status.message}</p>
      )}

      <select
        {...register("temperament", { required: "Temperament is required" })}
        className="w-full border p-2 rounded"
      >
        <option value="">Select temperament</option>
        <option value="Docile">Docile</option>
        <option value="Aggressive">Aggressive</option>
        <option value="Calm">Calm</option>
      </select>
      {errors.temperament && (
        <p className="text-red-500 text-sm">{errors.temperament.message}</p>
      )}

      <select
        {...register("conservation_status", {
          required: "Conservation status is required",
        })}
        className="w-full border p-2 rounded"
      >
        <option value="">Select conservation status</option>
        <option value="Commom">Commom</option>
        <option value="Rare">Rare</option>
        <option value="Endangered">Endangered</option>
      </select>
      {errors.conservation_status && (
        <p className="text-red-500 text-sm">
          {errors.conservation_status.message}
        </p>
      )}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full px-4 py-2 bg-green-600 text-white rounded-xl shadow cursor-pointer hover:bg-green-700 transition disabled:opacity-50"
      >
        {mutation.isPending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}


// ---- Manage Origins ----
function ManageOrigins() {
  const { data: breeds = [] } = useQuery({ queryKey: ["breeds"], queryFn: fetchBreeds });
  const { register, handleSubmit, reset } = useForm<BreedOrigin>();
  const queryClient = useQueryClient();

  const insertMutation = useMutation({
    mutationFn: async (data: BreedOrigin) => {
      const { error } = await supabase.from("breed_origins").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["origins"] });
      reset();
      toast.success("Breed origin added");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("breed_origins").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["origins"] });
      toast.success("Breed origin deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const { data: origins = [] } = useQuery({
    queryKey: ["origins"], queryFn: async () => {
      const { data, error } = await supabase.from("breed_origins").select("*");
      if (error) throw error;
      return data as BreedOrigin[];
    }
  });

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <form
        onSubmit={handleSubmit((data) => insertMutation.mutate(data))}
        className="space-y-4 bg-white p-6 rounded-2xl shadow"
      >
        <h2 className="text-xl font-bold text-green-800 mb-4">Add Breed Origin</h2>
        <select {...register("breed", { required: true })} className="w-full border p-2 rounded">
          <option value="">Select breed</option>
          {breeds.map((b) => (
            <option key={b.name} value={b.name}>{b.name}</option>
          ))}
        </select>
        <select {...register("parent_breed", { required: true })} className="w-full border p-2 rounded">
          <option value="">Select parent breed</option>
          {breeds.map((b) => (
            <option key={b.name} value={b.name}>{b.name}</option>
          ))}
        </select>
        <input type="number" {...register("contribution_percentage")} placeholder="Contribution %" className="w-full border p-2 rounded" />
        <button
          type="submit"
          className="w-full px-4 py-2 bg-green-600 text-white rounded-xl shadow cursor-pointer hover:bg-green-700 transition"
        >
          {insertMutation.isPending ? "Saving..." : "Save"}
        </button>
      </form>

      <div className="bg-white p-6 rounded-2xl shadow">
        <h2 className="text-xl font-bold mb-4 text-green-800">Existing Origins</h2>
        {origins.map((origin) => (
          <div key={origin.id} className="flex justify-between items-center p-3 border-b">
            <span>{origin.breed} ← {origin.parent_breed} {origin.contribution_percentage}%</span>
            <button
              onClick={() => deleteMutation.mutate(origin.id)}
              className="px-3 py-1 bg-red-500 text-white cursor-pointer rounded-lg hover:bg-red-600 transition"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Confirm Scans ----
// (Unchanged except UI improvements in earlier parts)
// ---- ConfirmScans (patched with delete confirmed images) ----
// ---- ConfirmScans (with filters) ----
function ConfirmScans() {
  const { data: scans = [] } = useQuery({ queryKey: ["scans"], queryFn: fetchScans });
  const { data: confirmed = [] } = useQuery({ queryKey: ["confirmed"], queryFn: fetchConfirmed });
  const { data: breeds = [] } = useQuery({ queryKey: ["breeds"], queryFn: fetchBreeds });
  const queryClient = useQueryClient();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedBreed, setSelectedBreed] = useState<Record<string, string>>({});
  const [filterFlagged, setFilterFlagged] = useState<"all" | "flagged" | "notFlagged">("all");
  const [filterHelpful, setFilterHelpful] = useState<"all" | "helpful" | "notHelpful">("all");

  // Mutation to confirm a scan
  const confirmMutation = useMutation({
    mutationFn: async ({ scan, breed }: { scan: CattleScan; breed: string }) => {
      const { error } = await supabase.from("confirmed_cattle_breeds").insert({
        scan_id: scan.id,
        image_url: scan.image_url,
        breed,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["confirmed"] });
      toast.success("Scan confirmed successfully");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Mutation to delete confirmed images
  const deleteConfirmed = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("confirmed_cattle_breeds").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["confirmed"] });
      toast.success("Confirmed image deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // --- Filter unconfirmed scans ---
  const unconfirmedScans = scans
    .filter((scan) => {
      if (filterFlagged === "flagged") return scan.flagged_for_inspection === true;
      if (filterFlagged === "notFlagged") return scan.flagged_for_inspection === false;
      return true;
    })
    .filter((scan) => {
      if (filterHelpful === "helpful") return scan.is_helpful === true;
      if (filterHelpful === "notHelpful") return scan.is_helpful === false;
      return true;
    });

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Unconfirmed scans */}
      <div className="bg-white p-6 rounded-2xl shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-green-800 text-xl">Unconfirmed Scans</h2>
          {/* Filter bar */}
          <div className="flex space-x-2">
            <select
              value={filterFlagged}
              onChange={(e) => setFilterFlagged(e.target.value as any)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="all">All</option>
              <option value="flagged">Flagged</option>
              <option value="notFlagged">Not Flagged</option>
            </select>
            <select
              value={filterHelpful}
              onChange={(e) => setFilterHelpful(e.target.value as any)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="all">All</option>
              <option value="helpful">Helpful</option>
              <option value="notHelpful">Not Helpful</option>
            </select>
          </div>
        </div>

        {unconfirmedScans.map((scan) => (
          <div key={scan.id} className=" pb-4">
            <button
              className="text-green-700 underline cursor-pointer hover:text-green-900"
              onClick={() => setExpandedId(expandedId === scan.id ? null : scan.id)}
            >
              {scan.id}
            </button>
            {expandedId === scan.id && (
              <div className="mt-2 p-3 bg-green-50 rounded-lg">
                <img
                  src={scan.image_url}
                  alt="Scan"
                  className="w-full h-48 object-cover rounded-lg mb-3"
                />
                <p className="text-sm text-gray-600 mb-2">
                  Uploaded: {new Date(scan.created_at).toLocaleString()}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  Location: {scan.location ? JSON.stringify(scan.location) : "N/A"}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  Flagged: {scan.flagged_for_inspection ? "Yes" : "No"}{" "}
                  {scan.flagged_for_inspection && `(${scan.inspection_reason || "No reason"})`}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  Helpful: {scan.is_helpful === true ? "Yes" : scan.is_helpful === false ? "No" : "N/A"}
                </p>
                <div className="bg-white border p-2 rounded text-xs max-h-40 overflow-auto mb-3">
                  <p className="text-sm text-gray-600 mb-2">
                    AI Prediction:
                  </p>
                  <pre>{JSON.stringify(scan.ai_prediction, null, 2)}</pre>
                </div>

                {/* Breed selection + confirm */}
                <select
                  value={selectedBreed[scan.id] || ""}
                  onChange={(e) =>
                    setSelectedBreed((prev) => ({ ...prev, [scan.id]: e.target.value }))
                  }
                  className="w-full border p-2 rounded mb-3"
                >
                  <option value="">Select breed</option>
                  {breeds.map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <button
                  disabled={confirmMutation.isPending || !selectedBreed[scan.id]}
                  onClick={() =>
                    confirmMutation.mutate({ scan, breed: selectedBreed[scan.id] })
                  }
                  className="px-4 py-2 bg-green-600 text-white rounded-lg shadow cursor-pointer hover:bg-green-700 transition disabled:opacity-50"
                >
                  {confirmMutation.isPending ? "Confirming..." : "Confirm Scan"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Confirmed images */}
      <div className="bg-white p-6 rounded-2xl shadow">
        <h2 className="font-bold text-green-800 mb-4 text-xl">Confirmed Images</h2>
        {confirmed.map((item) => (
          <div key={item.id} className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <img
                src={item.image_url}
                alt="Confirmed"
                className="w-20 h-20 object-cover rounded-lg border"
              />
              <div>
                <p className="font-semibold">{item.breed}</p>
                <p className="text-xs text-gray-500">
                  Confirmed on {new Date(item.created_at).toLocaleString()}
                </p>
              </div>
            </div>
            <button
              onClick={() => deleteConfirmed.mutate(item.id)}
              className="px-3 py-1 bg-red-500 text-white cursor-pointer rounded-lg hover:bg-red-600 transition"
            >
              {deleteConfirmed.isPending ? "Deleting..." : "Delete"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}



// ---- Upload Confirmed Image ----
function UploadConfirmedImage() {
  const { data: breeds = [] } = useQuery({ queryKey: ["breeds"], queryFn: fetchBreeds });
  const { register, handleSubmit, reset } = useForm<{
    breed: string;
    confirmed_image: FileList;
  }>();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: { breed: string; confirmed_image: FileList }) => {
      if (!data.confirmed_image || data.confirmed_image.length === 0) {
        throw new Error("Please upload an image");
      }
      const file = data.confirmed_image[0];
      const filePath = `images/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("cnb")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("cnb")
        .getPublicUrl(filePath);

      const { error } = await supabase.from("confirmed_cattle_breeds").insert({
        breed: data.breed,
        image_url: urlData.publicUrl,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["confirmed"] });
      reset();
      toast.success("Confirmed image uploaded successfully");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <form
      onSubmit={handleSubmit((data) => mutation.mutate(data))}
      className="space-y-4 bg-white p-6 rounded-2xl shadow max-w-md"
    >
      <h2 className="text-xl font-bold text-green-800 mb-4">
        Upload Confirmed Image
      </h2>
      <select
        {...register("breed", { required: true })}
        className="w-full border p-2 rounded"
      >
        <option value="">Select breed</option>
        {breeds.map((b) => (
          <option key={b.id} value={b.name}>
            {b.name}
          </option>
        ))}
      </select>
      <input
        type="file"
        {...register("confirmed_image", { required: true })}
        className="w-full border p-2 rounded"
      />
      <button
        type="submit"
        className="w-full px-4 py-2 bg-green-600 text-white rounded-xl shadow cursor-pointer hover:bg-green-700 transition"
      >
        {mutation.isPending ? "Uploading..." : "Upload"}
      </button>
    </form>
  );
}
