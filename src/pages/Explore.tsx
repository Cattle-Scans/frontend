import { useState } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { Search, X } from "lucide-react";

// --- Types ---
interface Breed {
  id: string;
  name: string;
  species: "Cattle" | "Buffalo";
  origin: string | null;
  status: "Indigenous" | "Purebred" | "Crossbreed" | "Composite";
  description: string | null;
  key_characteristics: string[] | null;
  native_region: string | null;
  avg_milk_yield_min: number | null;
  avg_milk_yield_max: number | null;
  milk_yield_unit: string | null;
  avg_body_weight_min: number | null;
  avg_body_weight_max: number | null;
  body_weight_unit: string | null;
  adaptability: string | null;
  temperament: "Docile" | "Aggressive" | "Calm";
  conservation_status: "Commom" | "Rare" | "Endangered";
  stock_img_url: string | null;
  created_at: string;
  breed_origins: { parent_breed: string; contribution_percentage: number }[];
}

interface ConfirmedCattle {
  id: string;
  image_url: string;
}

// --- Fetch Functions ---
const fetchBreeds = async (filters: any, search: string) => {
  let query = supabase.from("breeds").select(`
    *
    `);

  // breed_origins(region, country)

  if (filters.species && filters.species !== "All Species") {
    query = query.eq("species", filters.species);
  }
  if (filters.status && filters.status !== "All Status") {
    query = query.eq("status", filters.status);
  }
  if (filters.conservation_status && filters.conservation_status !== "All Conservation Status") {
    query = query.eq("conservation_status", filters.conservation_status);
  }
  if (filters.temperament && filters.temperament !== "All Temperament") {
    query = query.eq("temperament", filters.temperament);
  }
  if (filters.minMilk) {
    query = query.gte("avg_milk_yield_min", filters.minMilk);
  }
  if (filters.maxMilk) {
    query = query.lte("avg_milk_yield_max", filters.maxMilk);
  }
  if (filters.minWeight) {
    query = query.gte("avg_body_weight_min", filters.minWeight);
  }
  if (filters.maxWeight) {
    query = query.lte("avg_body_weight_max", filters.maxWeight);
  }
  if (filters.origin) {
    query = query.ilike("origin", `%${filters.origin}%`);
  }
  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data, error } = await query.order("name", { ascending: true });
  if (error) throw error;
  return data as Breed[];
};

const fetchConfirmedImages = async ({
  pageParam = 0,
  breedId,
}: {
  pageParam?: number;
  breedId: string;
}): Promise<ConfirmedCattle[]> => {
  const { data, error } = await supabase
    .from("confirmed_cattle_breeds")
    .select("id,image_url")
    .eq("breed_id", breedId)
    .order("created_at", { ascending: false })
    .range(pageParam * 12, pageParam * 12 + 11);

  if (error) throw error;
  return data || [];
};

// --- Explore Page ---
export default function ExplorePage() {

  const [filters, setFilters] = useState({
    species: "All Species",
    status: "All Status",
    conservation_status: "All Conservation Status",
    temperament: "All Temperament",
    minMilk: "",
    maxMilk: "",
    minWeight: "",
    maxWeight: "",
    origin: "",
  });

  const [search, setSearch] = useState("");
  const [selectedBreed, setSelectedBreed] = useState<Breed | null>(null);

  const { data: breeds, isLoading } = useQuery({
    queryKey: ["breeds", filters, search],
    queryFn: () => fetchBreeds(filters, search),
  });

  const confirmedImagesQuery = useInfiniteQuery({
    queryKey: ["confirmed_cattle_breeds", selectedBreed?.id],
    queryFn: ({ pageParam = 0 }) =>
      fetchConfirmedImages({ pageParam, breedId: selectedBreed?.id || "" }),
    getNextPageParam: (lastPage: any, pages: any) =>
      lastPage.length === 12 ? pages.length : undefined,
    enabled: !!selectedBreed,
  } as any);

  return (
    <div className="min-h-screen px-6 py-10">
      <h1 className="text-3xl font-bold text-center mb-8">🐄 Explore Breeds</h1>

      {/* Filters + Search */}
      <div className="bg-white shadow-lg rounded-xl p-6 max-w-5xl mx-auto mb-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="col-span-1 md:col-span-2 relative">
            <Search className="absolute top-3 left-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search breeds..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 border-gray-200 p-2 border rounded-lg cursor-pointer focus:ring-green-500"
            />
          </div>

          {/* Species Filter */}
          <select
            value={filters.species}
            onChange={(e) => setFilters({ ...filters, species: e.target.value })}
            className="p-2 border border-gray-200 cursor-pointer rounded-lg"
          >
            <option>All Species</option>
            <option>Cattle</option>
            <option>Buffalo</option>
          </select>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="p-2 border border-gray-200 cursor-pointer rounded-lg"
          >
            <option>All Status</option>
            <option>Indigenous</option>
            <option>Purebred</option>
            <option>Crossbreed</option>
            <option>Composite</option>
          </select>

          {/* Conservation Status */}
          <select
            value={filters.conservation_status}
            onChange={(e) =>
              setFilters({ ...filters, conservation_status: e.target.value })
            }
            className="p-2 border border-gray-200 cursor-pointer rounded-lg"
          >
            <option>All Conservation Status</option>
            <option>Commom</option>
            <option>Rare</option>
            <option>Endangered</option>
          </select>

          {/* Temperament */}
          <select
            value={filters.temperament}
            onChange={(e) =>
              setFilters({ ...filters, temperament: e.target.value })
            }
            className="p-2 border border-gray-200 cursor-pointer rounded-lg"
          >
            <option>All Temperament</option>
            <option>Docile</option>
            <option>Calm</option>
            <option>Aggressive</option>
          </select>

          {/* Min / Max Milk Yield */}
          <input
            type="number"
            placeholder="Min Milk"
            value={filters.minMilk}
            onChange={(e) => setFilters({ ...filters, minMilk: e.target.value })}
            className="p-2 border border-gray-200 cursor-pointer rounded-lg"
          />
          <input
            type="number"
            placeholder="Max Milk"
            value={filters.maxMilk}
            onChange={(e) => setFilters({ ...filters, maxMilk: e.target.value })}
            className="p-2 border border-gray-200 cursor-pointer rounded-lg"
          />

          {/* Min / Max Weight */}
          <input
            type="number"
            placeholder="Min Weight"
            value={filters.minWeight}
            onChange={(e) =>
              setFilters({ ...filters, minWeight: e.target.value })
            }
            className="p-2 border border-gray-200 cursor-pointer rounded-lg"
          />
          <input
            type="number"
            placeholder="Max Weight"
            value={filters.maxWeight}
            onChange={(e) =>
              setFilters({ ...filters, maxWeight: e.target.value })
            }
            className="p-2 border border-gray-200 cursor-pointer rounded-lg"
          />

          {/* Origin */}
          <input
            type="text"
            placeholder="Origin"
            value={filters.origin}
            onChange={(e) => setFilters({ ...filters, origin: e.target.value })}
            className="p-2 border border-gray-200 cursor-pointer rounded-lg"
          />
        </div>
      </div>

      {/* Breed List */}
      {isLoading ? (
        <p className="text-center text-gray-600">Loading breeds...</p>
      ) :
        !breeds || breeds.length < 1 ? (
          <p className="text-center text-gray-600">No results found...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {breeds && breeds.map((breed) => (
              <div
                key={breed.id}
                className="bg-white shadow-md rounded-xl p-4 hover:shadow-xl cursor-pointer transition"
                onClick={() => setSelectedBreed(breed)}
              >
                <img
                  src={breed.stock_img_url || "https://placehold.co/300x200"}
                  alt={breed.name}
                  loading="lazy"
                  className="w-full h-40 object-cover rounded-lg mb-3"
                />
                <h3 className="text-lg font-semibold">{breed.name}</h3>
                <p className="text-sm text-gray-500">{breed.species}</p>
                <span className="text-xs px-2 py-1 bg-green-100 rounded-lg mt-2 inline-block">
                  {breed.status}
                </span>
              </div>
            ))}
          </div>
        )}

      {/* Breed Details Modal */}
      {selectedBreed && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden relative">
            {/* Close */}
            <button
              className="absolute top-4 right-4 text-gray-600 hover:text-black"
              onClick={() => setSelectedBreed(null)}
            >
              <X className="w-6 h-6" />
            </button>

            {/* Breed Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="p-6 overflow-y-auto max-h-[80vh]">
                <h2 className="text-2xl font-bold mb-2">{selectedBreed.name}</h2>
                <p className="text-gray-700 mb-4">{selectedBreed.description}</p>

                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Species:</strong> {selectedBreed.species}
                  </p>
                  <p>
                    <strong>Origin:</strong> {selectedBreed.origin}
                  </p>
                  <p>
                    <strong>Status:</strong> {selectedBreed.status}
                  </p>
                  <p>
                    <strong>Native Region:</strong> {selectedBreed.native_region}
                  </p>
                  <p>
                    <strong>Body Weight:</strong>{" "}
                    {selectedBreed.avg_body_weight_min}–
                    {selectedBreed.avg_body_weight_max}{" "}
                    {selectedBreed.body_weight_unit}
                  </p>
                  <p>
                    <strong>Milk Yield:</strong>{" "}
                    {selectedBreed.avg_milk_yield_min}–
                    {selectedBreed.avg_milk_yield_max}{" "}
                    {selectedBreed.milk_yield_unit}
                  </p>
                  <p>
                    <strong>Temperament:</strong> {selectedBreed.temperament}
                  </p>
                  <p>
                    <strong>Conservation Status:</strong>{" "}
                    {selectedBreed.conservation_status}
                  </p>
                  {selectedBreed && selectedBreed.breed_origins?.length > 0 && (
                    <p>
                      <strong>Genetical Origins:</strong>{" "}
                      {selectedBreed.breed_origins
                        .map((o: any) => `${o.parent_breed} (${o.contribution_percentage}%)`)
                        .join(", ")}
                    </p>
                  )}
                </div>
              </div>

              {/* Images Section */}
              <div className="p-6 bg-gray-50 overflow-y-auto max-h-[80vh]">
                <h3 className="font-semibold text-lg mb-4">Confirmed Images</h3>
                <div className="grid grid-cols-2 gap-4">
                  {confirmedImagesQuery.data?.pages.flat().map((img: any) => (
                    <img
                      key={img.id}
                      src={img.image_url}
                      alt="Cattle"
                      loading="lazy"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  ))}
                </div>
                {confirmedImagesQuery.hasNextPage && (
                  <button
                    onClick={() => confirmedImagesQuery.fetchNextPage()}
                    disabled={confirmedImagesQuery.isFetchingNextPage}
                    className="mt-4 w-full py-2 bg-green-100 rounded-lg hover:bg-green-200"
                  >
                    {confirmedImagesQuery.isFetchingNextPage
                      ? "Loading..."
                      : "Load More"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
