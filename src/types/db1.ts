export type Breed = {
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
  created_at: string;
};

export type CattleScan = {
  id: string;
  image_url: string;
  created_at: string;
};

export type ConfirmedCattleBreed = {
  id: string;
  scan_id?: string;
  image_url: string;
  breed: string;
  created_at: string;
};
