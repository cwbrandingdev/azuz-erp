export class CompanyLookupError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'CompanyLookupError';
  }
}

export class CompanyDiscoveryError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'CompanyDiscoveryError';
  }
}

export class GeocodingError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'GeocodingError';
  }
}
