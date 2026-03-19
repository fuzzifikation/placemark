export interface PlacemarkBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface Placemark {
  id: number;
  name: string;
  type: 'user' | 'suggested';
  bounds: PlacemarkBounds | null;
  dateStart: string | null; // ISO 8601 date string
  dateEnd: string | null; // ISO 8601 date string
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlacemarkInput {
  name: string;
  bounds: PlacemarkBounds | null;
  dateStart: string | null;
  dateEnd: string | null;
}

export interface UpdatePlacemarkInput {
  id: number;
  name?: string;
  bounds?: PlacemarkBounds | null;
  dateStart?: string | null;
  dateEnd?: string | null;
}
