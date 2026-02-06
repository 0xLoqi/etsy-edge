export interface EtsyListing {
  listing_id: number;
  title: string;
  description: string;
  tags: string[];
  price: {
    amount: number;
    divisor: number;
    currency_code: string;
  };
  views: number;
  num_favorers: number;
  taxonomy_id: number;
  state: string;
  url: string;
  shop_id: number;
  quantity: number;
  creation_timestamp: number;
  last_modified_timestamp: number;
}

export interface EtsySearchResult {
  count: number;
  results: EtsyListing[];
}

export interface EtsyShop {
  shop_id: number;
  shop_name: string;
  title: string;
  num_favorers: number;
  listing_active_count: number;
  url: string;
}

export interface PageListingData {
  listingId: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  rating: string | null;
  reviewCount: string | null;
  imageUrl: string | null;
}
