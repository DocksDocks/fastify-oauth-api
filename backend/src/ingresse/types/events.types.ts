/**
 * Ingresse Events Type Definitions
 * Includes both Backstage and Ingresse API event types
 */

/**
 * Event session (date/time)
 */
export interface Session {
  dateTime: string; // ISO 8601 format
  id: number;
  status: string;
}

/**
 * Event place/venue
 */
export interface Place {
  id: number;
  name: string;
  street: string;
  city: string;
  state: string;
  country: string;
  location: {
    lat: number;
    lon: number;
  };
  zip: string;
}

/**
 * Event poster images
 */
export interface Poster {
  large: string;
  medium: string;
  small: string;
  xLarge: string;
}

/**
 * Backstage Event (from your custom backend)
 */
export interface BackstageEvent {
  id: number;
  title: string;
  description: string;
  type: string;
  status: string;
  saleEnabled: boolean;
  location: string;
  link: string;
  button_text: string;
  category: string;
  ticketeira: string;
  dates: {
    raw: string[];
    formatted: string;
  };
  image: string;
}

/**
 * Backstage Events Response
 */
export interface BackstageEventsResponse {
  responseData: {
    paginationInfo: {
      currentPage: number;
      lastPage: number;
      totalResults: number;
      pageSize: number;
    };
    data: BackstageEvent[];
  };
}

/**
 * Event Details from Ingresse API
 */
export interface EventDetails {
  id: number;
  title: string;
  description: string;
  poster: Poster;
  sessions: Session[];
  place: Place;
  timezone: string;
}

/**
 * Event Details Response
 */
export interface EventDetailsResponse {
  data: EventDetails;
}
