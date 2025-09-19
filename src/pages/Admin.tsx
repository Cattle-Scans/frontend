import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

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
// async function fetchScans(): Promise<CattleScan[]> {
//   const { data, error } = await supabase.from("cattle_scans").select("*");
//   if (error) throw error;
//   return data as CattleScan[];
// }
// async function fetchConfirmed(): Promise<ConfirmedCattleBreed[]> {
//   const { data, error } = await supabase.from("confirmed_cattle_breeds").select("*");
//   if (error) throw error;
//   return data as ConfirmedCattleBreed[];
// }

// ---- AdminPage ----
export default function AdminPage() {
  const { session, loading } = useAuth();
  const user = session?.user;

  const [activeTab, setActiveTab] = useState<"upload" | "origins" | "scans" | "confirmed" | "query">("upload");
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
          <div className="text-red-500 mb-4">
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
          // { key: "query", label: "FLWorkers Id Search" },

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

      {activeTab === "upload" && <BreedFormManager />}
      {activeTab === "origins" && <ManageOrigins />}
      {activeTab === "scans" && <ConfirmScans user={user} />}
      {activeTab === "confirmed" && <UploadConfirmedImage user={user} />}
      {/* {activeTab === "query" && <FLWquery />} */}

    </div>
  );
}

// function FLWquery() {
//   const [searchId, setSearchId] = useState("");
//   const [submittedId, setSubmittedId] = useState("");

//   const handleSearch = () => {
//     setSubmittedId(searchId.trim());
//   };

//   // Fetch user from auth.users table
//   const { data: user = [], isLoading: usersLoading } = useQuery({
//     queryKey: ["auth_users", submittedId],
//     queryFn: async () => {
//       if (!submittedId) return [];
//       const { data: user, error } = await supabase.rpc("get_user_by_id", { search_id: submittedId });
//       if (error) {
//         toast.error(error.message); throw error;
//       }
//       return user
//     },
//     enabled: !!submittedId,
//     retry: 2,
//   });

//   const foundUser = user; // only one user should match
//   // Fetch all cattle scans
//   const { data: userScans = [], isLoading: scansLoading } = useQuery({
//     queryKey: ["cattle_scans"],
//     queryFn: async () => {
//       const { data, error } = await supabase.from("cattle_scans").select("*").eq("scanned_by_user_id", foundUser?.id);
//       if (error) throw error;
//       return data;
//     },
//     enabled: !!foundUser,
//   });

//   // Fetch all confirmed scans
//   const { data: userConfirmed = [], isLoading: confirmedLoading } = useQuery({
//     queryKey: ["confirmed_cattle_breeds"],
//     queryFn: async () => {
//       const { data, error } = await supabase.from("confirmed_cattle_breeds").select("*").eq("confirmed_by_user_id", foundUser?.id);
//       if (error) throw error;
//       return data;
//     },
//     enabled: !!foundUser,
//   });



//   return (
//     <div className="bg-white p-6 rounded-2xl shadow max-w-3xl">
//       <h2 className="text-xl font-bold text-green-800 mb-4">User Scanner</h2>

//       <div className="flex mb-4 space-x-2">
//         <input
//           type="text"
//           placeholder="Enter cattlescans ID or bpa ID"
//           value={searchId}
//           onChange={(e) => setSearchId(e.target.value)}
//           className="flex-1 border p-2 rounded"
//         />
//         <button
//           onClick={handleSearch}
//           className="px-4 py-2 bg-green-600 cursor-pointer text-white rounded-xl hover:bg-green-700 transition"
//         >
//           Search
//         </button>
//       </div>

//       {submittedId && (
//         <div>
//           {usersLoading || scansLoading || confirmedLoading ? (
//             <div className="text-gray-500">Loading...</div>
//           ) : !foundUser ? (
//             <p className="text-red-500">No user found for this ID.</p>
//           ) : (
//             <div className="space-y-4">
//               <div className="p-3 bg-green-50 rounded-lg">
//                 <h3 className="font-semibold mb-2">User Info</h3>
//                 <p><b>Auth ID:</b> {foundUser.id}</p>
//                 <p><b>Email:</b> {foundUser.email}</p>
//                 <p><b>User Metadata ID:</b> {foundUser.user_metadata?.id || "N/A"}</p>
//                 <pre className="bg-white border p-2 rounded text-xs max-h-40 overflow-auto">
//                   {JSON.stringify(foundUser.user_metadata, null, 2)}
//                 </pre>
//               </div>

//               <div className="p-3 bg-green-50 rounded-lg">
//                 <h3 className="font-semibold mb-2">Cattle Scans ({userScans.length})</h3>
//                 {userScans.length === 0 ? (
//                   <p className="text-gray-500">No scans found.</p>
//                 ) : (
//                   <ul className="list-disc ml-5 text-sm max-h-48 overflow-auto">
//                     {userScans.map((s) => (
//                       <li key={s.id}>
//                         ID: {s.id}, Uploaded: {new Date(s.created_at).toLocaleString()}
//                       </li>
//                     ))}
//                   </ul>
//                 )}
//               </div>

//               <div className="p-3 bg-green-50 rounded-lg">
//                 <h3 className="font-semibold mb-2">Confirmed Scans ({userConfirmed.length})</h3>
//                 {userConfirmed.length === 0 ? (
//                   <p className="text-gray-500">No confirmed scans found.</p>
//                 ) : (
//                   <ul className="list-disc ml-5 text-sm max-h-48 overflow-auto">
//                     {userConfirmed.map((c) => (
//                       <li key={c.id}>
//                         ID: {c.id}, Breed: {c.breed}, Confirmed: {new Date(c.created_at).toLocaleString()}
//                       </li>
//                     ))}
//                   </ul>
//                 )}
//               </div>
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }






export function BreedFormManager() {
  const queryClient = useQueryClient();
  const { data: breeds = [], isLoading } = useQuery({ queryKey: ["breeds"], queryFn: fetchBreeds });
  const [editingBreed, setEditingBreed] = useState<Breed | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<Breed & { stock_image?: FileList }>({});

  // Insert new breed
  const insertMutation = useMutation({
    mutationFn: async (data: Breed & { stock_image?: FileList }) => {
      let imageUrl = null;
      if (data.stock_image && data.stock_image.length > 0) {
        const file = data.stock_image[0];
        const filePath = `images/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from("cnb").upload(filePath, file, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("cnb").getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      }
      const { stock_image, ...rest } = data;
      const { error } = await supabase.from("breeds").insert({ ...rest, stock_img_url: imageUrl });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["breeds"] });
      reset();
      toast.success("Breed uploaded successfully");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Update existing breed
  const updateMutation = useMutation({
    mutationFn: async ({ name, updates }: { name: string; updates: any }) => {
      let imageUrl = updates.stock_img_url;
      if (updates.stock_image && updates.stock_image.length > 0) {
        const file = updates.stock_image[0];
        const filePath = `images/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from("cnb").upload(filePath, file, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("cnb").getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      }
      const { stock_image, ...rest } = updates;
      const { error } = await supabase.from("breeds").update({ ...rest, stock_img_url: imageUrl }).eq("name", name);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["breeds"] });
      setEditingBreed(null);
      reset();
      toast.success("Breed updated successfully");
    },
    onError: (err: any) => toast.error(err.message),
  });

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

  const onSubmit = (data: any) => {
    if (editingBreed) {
      updateMutation.mutate({ name: editingBreed.name, updates: data });
    } else {
      insertMutation.mutate(data);
    }
  };

  const startEdit = (breed: Breed) => {
    setEditingBreed(breed);
    Object.entries(breed).forEach(([k, v]) => {
      // prefill fields
      setValue(k as any, v as any);
    });
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Add/Edit Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white p-6 rounded-2xl shadow">
        <h2 className="text-xl font-bold text-green-800 mb-4">
          {editingBreed ? `Edit ${editingBreed.name}` : "Upload Breed"}
        </h2>

        <input
          {...register("name", { required: "Breed name is required" })}
          placeholder="Breed Name"
          className="w-full border p-2 rounded bg-gray-100"
          disabled={!!editingBreed} // cannot change primary key name
        />
        {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}

        <textarea {...register("description")} placeholder="Description" className="w-full border p-2 rounded" />

        <input type="file" {...register("stock_image")} className="w-full border p-2 rounded" />

        <input {...register("origin")} placeholder="Origin" className="w-full border p-2 rounded" />

        <input {...register("native_region")} placeholder="Native Region" className="w-full border p-2 rounded" />

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

        <input {...register("adaptability")} placeholder="Adaptability" className="w-full border p-2 rounded" />

        <select {...register("species", { required: "Species is required" })} className="w-full border p-2 rounded">
          <option value="">Select species</option>
          <option value="Cattle">Cattle</option>
          <option value="Buffalo">Buffalo</option>
        </select>
        {errors.species && <p className="text-red-500 text-sm">{errors.species.message}</p>}

        <select {...register("status", { required: "Status is required" })} className="w-full border p-2 rounded">
          <option value="">Select status</option>
          <option value="Indigenous">Indigenous</option>
          <option value="Purebred">Purebred</option>
          <option value="Crossbreed">Crossbreed</option>
          <option value="Composite">Composite</option>
        </select>
        {errors.status && <p className="text-red-500 text-sm">{errors.status.message}</p>}

        <select {...register("temperament", { required: "Temperament is required" })} className="w-full border p-2 rounded">
          <option value="">Select temperament</option>
          <option value="Docile">Docile</option>
          <option value="Aggressive">Aggressive</option>
          <option value="Calm">Calm</option>
        </select>
        {errors.temperament && <p className="text-red-500 text-sm">{errors.temperament.message}</p>}

        <select
          {...register("conservation_status", { required: "Conservation status is required" })}
          className="w-full border p-2 rounded"
        >
          <option value="">Select conservation status</option>
          <option value="Commom">Commom</option>
          <option value="Rare">Rare</option>
          <option value="Endangered">Endangered</option>
        </select>
        {errors.conservation_status && <p className="text-red-500 text-sm">{errors.conservation_status.message}</p>}

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={insertMutation.isPending || updateMutation.isPending}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg cursor-pointer hover:bg-green-700 transition disabled:opacity-50"
          >
            {editingBreed
              ? updateMutation.isPending
                ? "Saving..."
                : "Save Changes"
              : insertMutation.isPending
                ? "Saving..."
                : "Save"}
          </button>
          {editingBreed && (
            <button
              type="button"
              onClick={() => {
                setEditingBreed(null);
                reset();
              }}
              className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Breeds list */}
      <div className="bg-white p-6 rounded-2xl shadow">
        <h2 className="text-xl font-bold mb-4 text-green-800">Existing Breeds</h2>
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-green-600 border-opacity-70"></div>
          </div>
        ) : breeds.length < 1 ? (
          <p className="text-center text-gray-600 mt-5">No breeds found</p>
        ) : (
          breeds.map((breed) => (
            <div key={breed.name} className="border-b py-3 flex justify-between items-center">
              <span>{breed.name}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(breed)}
                  className="px-3 py-1 bg-white border border-gray-300 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteMutation.mutate(breed.name!)}
                  disabled={deleteMutation.isPending && deleteMutation.variables === breed.name}
                  className="px-3 py-1 bg-white border border-red-400 text-red-600 rounded-lg cursor-pointer hover:bg-red-50 disabled:opacity-50"
                >
                  {deleteMutation.isPending && deleteMutation.variables === breed.name ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}



// ---- Manage Origins ----
function ManageOrigins() {
  const { data: breeds = [], isLoading } = useQuery({ queryKey: ["breeds"], queryFn: fetchBreeds });
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

  const { data: origins = [], isLoading: originsLoading } = useQuery({
    queryKey: ["origins"], queryFn: async () => {
      const { data, error } = await supabase.from("breed_origins").select("*");
      if (error) throw error;
      return data as BreedOrigin[];
    }
  });

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <form onSubmit={handleSubmit((data) => insertMutation.mutate(data))} className="space-y-4 bg-white p-6 rounded-2xl shadow">
        <h2 className="text-xl font-bold text-green-800 mb-4">Add Breed Origin</h2>
        <select {...register("breed", { required: true })} className="w-full border p-2 rounded">
          <option value="">Select breed</option>
          {breeds.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
        </select>
        <select {...register("parent_breed", { required: true })} className="w-full border p-2 rounded">
          <option value="">Select parent breed</option>
          {breeds.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
        </select>
        <input type="number" {...register("contribution_percentage")} placeholder="Contribution %" className="w-full border p-2 rounded" />
        <button type="submit" className="w-full px-4 py-2 bg-green-600 text-white rounded-xl shadow hover:bg-green-700 transition disabled:opacity-50">
          {insertMutation.isPending ? "Saving..." : "Save"}
        </button>
      </form>

      <div className="bg-white p-6 rounded-2xl shadow">
        <h2 className="text-xl font-bold mb-4 text-green-800">Existing Origins</h2>
        {(originsLoading || isLoading) ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-green-600 border-opacity-70"></div>
          </div>
        ) : origins.length === 0 ? (
          <p className="text-gray-500">No origins found.</p>
        ) : (
          origins.map((origin) => (
            <div key={origin.id} className="flex justify-between items-center p-3 border-b">
              <span>{origin.breed} ← {origin.parent_breed} {origin.contribution_percentage}%</span>
              <button
                onClick={() => deleteMutation.mutate(origin.id)}
                className="px-3 py-1 bg-red-500 text-white cursor-pointer rounded-lg hover:bg-red-600 transition"
              >
                {deleteMutation.isPending && deleteMutation.variables === origin.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>

  );
}



// fetch unconfirmed scans (paginated)
async function fetchScansPaginated({ page, pageSize }: { page: number; pageSize: number }): Promise<{ data: CattleScan[]; count: number }> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("cattle_scans")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false }) // default latest
    .range(from, to);

  if (error) throw error;
  return { data: data as CattleScan[], count: count || 0 };
}

// fetch confirmed scans (paginated)
async function fetchConfirmedPaginated({ page, pageSize }: { page: number; pageSize: number }): Promise<{ data: ConfirmedCattleBreed[]; count: number }> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("confirmed_cattle_breeds")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false }) // default latest
    .range(from, to);

  if (error) throw error;
  return { data: data as ConfirmedCattleBreed[], count: count || 0 };
}


// ---- Confirm scans ----
// (Unchanged except UI improvements in earlier parts)
// ---- ConfirmScans (patched with delete confirmed images) ----
// ---- ConfirmScans (with filters) ----

function ConfirmScans({ user }: { user: User }) {
  const queryClient = useQueryClient();

  // --- Pagination state
  const [unconfirmedPage, setUnconfirmedPage] = useState(1);
  const [confirmedPage, setConfirmedPage] = useState(1);
  const pageSize = 10;

  // --- Queries
  const { data: scansData, isLoading: scansLoading } = useQuery<{
    data: CattleScan[];
    count: number;
  }>({
    queryKey: ["scans", unconfirmedPage, pageSize],
    queryFn: () => fetchScansPaginated({ page: unconfirmedPage, pageSize }),
    placeholderData: (prev) => prev,
  });

  const { data: confirmedData, isLoading: confirmedLoading } = useQuery<{
    data: ConfirmedCattleBreed[];
    count: number;
  }>({
    queryKey: ["confirmed", confirmedPage, pageSize],
    queryFn: () => fetchConfirmedPaginated({ page: confirmedPage, pageSize }),
    placeholderData: (prev) => prev,
  });

  const { data: breeds = [], isLoading: breedsLoading } = useQuery({
    queryKey: ["breeds"],
    queryFn: fetchBreeds,
  });

  const scans = scansData?.data ?? [];
  const confirmed = confirmedData?.data ?? [];
  const totalScans = scansData?.count ?? 0;
  const totalConfirmed = confirmedData?.count ?? 0;

  // --- State
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedBreed, setSelectedBreed] = useState<Record<string, string>>({});
  const [searchUserId, setSearchUserId] = useState<string>("");

  const [filterFlagged, setFilterFlagged] = useState<"all" | "flagged" | "notFlagged">("all");
  const [filterHelpful, setFilterHelpful] = useState<"all" | "helpful" | "notHelpful">("all");
  const [unconfirmedSort, setUnconfirmedSort] = useState<"latest" | "oldest">("latest");

  const [confirmedSort, setConfirmedSort] = useState<"latest" | "oldest">("latest");
  const [breedFilter, setBreedFilter] = useState<string>("");

  // --- Mutations
  const confirmMutation = useMutation({
    mutationFn: async ({ scan, breed }: { scan: CattleScan; breed: string }) => {
      const { error } = await supabase.from("confirmed_cattle_breeds").insert({
        scan_id: scan.id,
        image_url: scan.image_url,
        breed,
        confirmed_by_user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["confirmed"] });
      toast.success("Scan confirmed successfully");
    },
    onError: (err: any) => toast.error(err.message),
  });

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

  // --- Filters + sorting (applied client-side on current page data)
  let unconfirmedScans = scans
    .filter((scan) => !searchUserId || scan.scanned_by_user_id === searchUserId)
    .filter((scan) => {
      if (filterFlagged === "flagged") return scan.flagged_for_inspection;
      if (filterFlagged === "notFlagged") return !scan.flagged_for_inspection;
      return true;
    })
    .filter((scan) => {
      if (filterHelpful === "helpful") return scan.is_helpful === true;
      if (filterHelpful === "notHelpful") return scan.is_helpful === false;
      return true;
    });

  unconfirmedScans = [...unconfirmedScans].sort((a, b) =>
    unconfirmedSort === "latest"
      ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  let confirmedScans = confirmed
    .filter((c) => !searchUserId || c.confirmed_by_user_id === searchUserId)
    .filter((c) => !breedFilter || c.breed === breedFilter);

  confirmedScans = [...confirmedScans].sort((a, b) =>
    confirmedSort === "latest"
      ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div>
      {/* Global User ID filter */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search scans by User ID"
          value={searchUserId}
          onChange={(e) => setSearchUserId(e.target.value)}
          className="bg-white border-gray-200 border-2 rounded-xl p-4 w-full"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Unconfirmed scans */}
        <div className="bg-white p-6 rounded-2xl shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-green-800 text-xl">Unconfirmed Scans</h2>
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
              <select
                value={unconfirmedSort}
                onChange={(e) => setUnconfirmedSort(e.target.value as any)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="latest">Latest</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>
          </div>

          {scansLoading || breedsLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-green-600 border-opacity-70"></div>
            </div>
          ) : unconfirmedScans.length === 0 ? (
            <p className="text-gray-500">No unconfirmed scans.</p>
          ) : (
            unconfirmedScans.map((scan) => (
              <div key={scan.id} className="pb-4">
                <button
                  className="text-green-700 underline cursor-pointer hover:text-green-900"
                  onClick={() => setExpandedId(expandedId === scan.id ? null : scan.id)}
                >
                  {scan.id}
                </button>
                {expandedId === scan.id && (
                  <div className="mt-2 p-3 bg-green-50 rounded-lg">
                    <img src={scan.image_url} alt="Scan" className="w-full h-48 object-cover rounded-lg mb-3" />
                    <p className="text-sm text-gray-600 mb-2">
                      Uploaded: {new Date(scan.created_at).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      Flagged: {scan.flagged_for_inspection ? "Yes" : "No"}{" "}
                      {scan.flagged_for_inspection && `(${scan.inspection_reason || "No reason"})`}
                    </p>
                    <div className="bg-white border p-2 rounded text-xs max-h-40 overflow-auto mb-3">
                      <pre>{JSON.stringify(scan.ai_prediction, null, 2)}</pre>
                    </div>

                    <select
                      value={selectedBreed[scan.id] || ""}
                      onChange={(e) => setSelectedBreed((prev) => ({ ...prev, [scan.id]: e.target.value }))}
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
                      onClick={() => {
                        if (!selectedBreed[scan.id]) return toast.error("Please select a breed");
                        confirmMutation.mutate({ scan, breed: selectedBreed[scan.id] });
                      }}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-xl shadow hover:bg-green-700 transition cursor-pointer"
                    >
                      {confirmMutation.isPending && confirmMutation.variables?.scan.id === scan.id
                        ? "Confirming..."
                        : "Confirm"}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Pagination */}
          {totalScans > pageSize && (
            <div className="flex justify-between items-center mt-4">
              <button
                onClick={() => setUnconfirmedPage((p) => Math.max(1, p - 1))}
                disabled={unconfirmedPage === 1}
                className="px-3 py-1 bg-white border rounded-lg cursor-pointer disabled:opacity-50"
              >
                Prev
              </button>
              <span>
                Page {unconfirmedPage} of {Math.ceil(totalScans / pageSize)}
              </span>
              <button
                onClick={() => setUnconfirmedPage((p) => p + 1)}
                disabled={unconfirmedPage * pageSize >= totalScans}
                className="px-3 py-1 bg-white border rounded-lg cursor-pointer disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Confirmed scans */}
        <div className="bg-white p-6 rounded-2xl shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-green-800 text-xl">Confirmed Scans</h2>
            <div className="flex space-x-2">
              <select
                value={breedFilter}
                onChange={(e) => setBreedFilter(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="">All breeds</option>
                {breeds.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
              <select
                value={confirmedSort}
                onChange={(e) => setConfirmedSort(e.target.value as any)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="latest">Latest</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>
          </div>

          {confirmedLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-green-600 border-opacity-70"></div>
            </div>
          ) : confirmedScans.length === 0 ? (
            <p className="text-gray-500">No confirmed scans.</p>
          ) : (
            confirmedScans.map((c) => (
              <div key={c.id} className="pb-2">
                <div className="flex justify-between items-center">
                  <button
                    className="text-green-700 underline cursor-pointer hover:text-green-900"
                    onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                  >
                    {c.breed} ({new Date(c.created_at).toLocaleDateString()})
                  </button>
                  <button
                    onClick={() => deleteConfirmed.mutate(c.id)}
                    className="px-3 py-1 bg-white border border-red-400 text-red-600 rounded-lg cursor-pointer hover:bg-red-50 disabled:opacity-50"
                  >
                    {deleteConfirmed.isPending && deleteConfirmed.variables === c.id ? "Deleting..." : "Delete"}
                  </button>
                </div>

                {expandedId === c.id && (
                  <div className="mt-2 p-3 bg-green-50 rounded-lg">
                    <img src={c.image_url} alt="Confirmed Scan" className="w-full h-48 object-cover rounded-lg mb-3" />
                    <p className="text-sm text-gray-600 mb-2">Confirmed on: {new Date(c.created_at).toLocaleString()}</p>
                    <p className="text-sm text-gray-600 mb-2">Scan ID: {c.scan_id || "N/A"}</p>
                    <p className="text-sm text-gray-600 mb-2">Confirmed by: {c.confirmed_by_user_id || "N/A"}</p>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Pagination */}
          {totalConfirmed > pageSize && (
            <div className="flex justify-between items-center mt-4">
              <button
                onClick={() => setConfirmedPage((p) => Math.max(1, p - 1))}
                disabled={confirmedPage === 1}
                className="px-3 py-1 bg-white border rounded-lg cursor-pointer disabled:opacity-50"
              >
                Prev
              </button>
              <span>
                Page {confirmedPage} of {Math.ceil(totalConfirmed / pageSize)}
              </span>
              <button
                onClick={() => setConfirmedPage((p) => p + 1)}
                disabled={confirmedPage * pageSize >= totalConfirmed}
                className="px-3 py-1 bg-white border rounded-lg cursor-pointer disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}





// ---- Upload Confirmed Image ----
// ---- Upload Confirmed Images (Mass Upload) ----
function UploadConfirmedImage({ user }: { user: User }) {
  const { data: breeds = [] } = useQuery({ queryKey: ["breeds"], queryFn: fetchBreeds });
  const { register, handleSubmit, reset, watch } = useForm<{
    breed: string;
    confirmed_images: FileList;
  }>();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: { breed: string; confirmed_images: FileList }) => {
      if (!data.confirmed_images || data.confirmed_images.length === 0) {
        throw new Error("Please upload at least one image");
      }

      const uploadedUrls: string[] = [];

      // Loop through all selected images
      for (let i = 0; i < data.confirmed_images.length; i++) {
        const file = data.confirmed_images[i];
        const filePath = `images/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("cnb")
          .upload(filePath, file, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("cnb")
          .getPublicUrl(filePath);

        uploadedUrls.push(urlData.publicUrl);
      }

      // Insert all uploaded images into DB
      const inserts = uploadedUrls.map((url) => ({
        breed: data.breed,
        image_url: url,
        confirmed_by_user_id: user.id
      }));

      const { error } = await supabase
        .from("confirmed_cattle_breeds")
        .insert(inserts);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["confirmed"] });
      reset();
      toast.success("All confirmed images uploaded successfully");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const selectedFiles = watch("confirmed_images");

  return (
    <form
      onSubmit={handleSubmit((data) => mutation.mutate(data))}
      className="space-y-4 bg-white p-6 rounded-2xl shadow max-w-md"
    >
      <h2 className="text-xl font-bold text-green-800 mb-4">
        Mass Upload Confirmed Images
      </h2>

      {/* Select breed */}
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

      {/* Multiple file input */}
      <input
        type="file"
        multiple
        {...register("confirmed_images", { required: true })}
        className="w-full border p-2 rounded"
      />

      {/* File preview */}
      {selectedFiles && selectedFiles.length > 0 && (
        <div className="text-sm text-gray-600">
          <p className="font-semibold mb-1">Selected files:</p>
          <ul className="list-disc ml-5">
            {Array.from(selectedFiles).map((file, i) => (
              <li key={i}>{file.name}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full px-4 py-2 bg-green-600 text-white rounded-xl shadow cursor-pointer hover:bg-green-700 transition disabled:opacity-50"
      >
        {mutation.isPending ? "Uploading..." : "Upload All"}
      </button>
    </form>
  );
}
