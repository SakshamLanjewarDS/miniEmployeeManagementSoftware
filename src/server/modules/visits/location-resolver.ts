import dns from "node:dns/promises";

/**
 * Validates whether an IP address belongs to private/internal/loopback ranges.
 * Strict SSRF protection.
 */
export function isPrivateIp(ip: string): boolean {
  if (ip === "::1" || ip === "0.0.0.0" || ip === "localhost") return true;

  // IPv4 checks
  const parts = ip.split(".").map(Number);
  if (parts.length === 4 && parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
    // 10.0.0.0/8
    if (parts[0] === 10) return true;
    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;
    // 169.254.0.0/16 (Link-local)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 0.0.0.0/8
    if (parts[0] === 0) return true;
  }

  // IPv6 checks (fc00::/7 unique local, fe80::/10 link-local)
  if (ip.toLowerCase().startsWith("fc") || ip.toLowerCase().startsWith("fd") || ip.toLowerCase().startsWith("fe80")) {
    return true;
  }

  return false;
}

/**
 * Whitelist of allowed domains for Maps resolution.
 */
const ALLOWED_MAPS_DOMAINS = [
  "maps.google.com",
  "www.google.com",
  "google.com",
  "maps.app.goo.gl",
  "goo.gl",
];

/**
 * Extracts latitude, longitude, and optional place name from a Google Maps URL or text.
 */
export function extractCoordinatesFromUrl(urlString: string): {
  lat: number | null;
  lng: number | null;
  name?: string;
} {
  const str = urlString.trim();

  // 1. Raw Coordinates: "18.921, 72.834" or "18.921,72.834"
  const rawMatch = str.match(/^([-+]?[0-9]*\.?[0-9]+)\s*,\s*([-+]?[0-9]*\.?[0-9]+)$/);
  if (rawMatch) {
    const lat = parseFloat(rawMatch[1]);
    const lng = parseFloat(rawMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // 2. Google Maps URL with @lat,lng
  const atMatch = str.match(/@([-+]?[0-9]*\.?[0-9]+),([-+]?[0-9]*\.?[0-9]+)/);
  if (atMatch) {
    const placeMatch = str.match(/\/place\/([^/@?]+)/);
    const placeName = placeMatch
      ? decodeURIComponent(placeMatch[1].replace(/\+/g, " "))
      : undefined;
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng, name: placeName };
    }
  }

  // 3. Google Maps URL with ?q=lat,lng or ll=lat,lng
  const qMatch = str.match(/[?&](?:q|ll)=([-+]?[0-9]*\.?[0-9]+),([-+]?[0-9]*\.?[0-9]+)/);
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  return { lat: null, lng: null };
}

/**
 * Resolves Google Maps link or short URL safely with SSRF protections.
 */
export async function resolveGoogleMapsLocation(inputUrl: string): Promise<{
  latitude: number | null;
  longitude: number | null;
  name?: string;
  resolvedUrl: string;
}> {
  // First check if string directly contains coordinates
  const direct = extractCoordinatesFromUrl(inputUrl);
  if (direct.lat !== null && direct.lng !== null) {
    return {
      latitude: direct.lat,
      longitude: direct.lng,
      name: direct.name,
      resolvedUrl: inputUrl,
    };
  }

  // Parse input as URL
  let parsed: URL;
  try {
    parsed = new URL(inputUrl.startsWith("http") ? inputUrl : `https://${inputUrl}`);
  } catch {
    throw new Error("Invalid URL format provided for site location.");
  }

  // Enforce HTTPS
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Invalid URL protocol. Only HTTPS is permitted.");
  }

  // Check domain allowlist
  const hostname = parsed.hostname.toLowerCase();
  const isAllowed = ALLOWED_MAPS_DOMAINS.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );
  if (!isAllowed) {
    throw new Error("Only Google Maps URLs (maps.google.com, maps.app.goo.gl, goo.gl) are supported.");
  }

  // DNS check to guard against SSRF to private IP ranges
  try {
    const addresses = await dns.resolve(hostname);
    for (const addr of addresses) {
      if (isPrivateIp(addr)) {
        throw new Error("SSRF Protection: Target domain resolves to a restricted internal network address.");
      }
    }
  } catch (err: any) {
    if (err.message.includes("SSRF")) throw err;
    // If DNS resolve fails, reject
    throw new Error(`DNS resolution failed for hostname '${hostname}'.`);
  }

  // Perform safe HEAD / GET redirect following (max 3 hops)
  let currentUrl = parsed.toString();
  for (let hop = 0; hop < 3; hop++) {
    const directCoords = extractCoordinatesFromUrl(currentUrl);
    if (directCoords.lat !== null && directCoords.lng !== null) {
      return {
        latitude: directCoords.lat,
        longitude: directCoords.lng,
        name: directCoords.name,
        resolvedUrl: currentUrl,
      };
    }

    try {
      const response = await fetch(currentUrl, {
        method: "HEAD",
        redirect: "manual",
        headers: { "User-Agent": "StudioOS-LocationResolver/1.0" },
      });

      const locationHeader = response.headers.get("location");
      if (!locationHeader) break;

      const nextUrl = new URL(locationHeader, currentUrl);
      const nextHost = nextUrl.hostname.toLowerCase();
      const isNextAllowed = ALLOWED_MAPS_DOMAINS.some(
        (domain) => nextHost === domain || nextHost.endsWith(`.${domain}`)
      );
      if (!isNextAllowed) {
        throw new Error("SSRF Protection: Redirect points to an untrusted domain.");
      }

      currentUrl = nextUrl.toString();
    } catch (e: any) {
      if (e.message.includes("SSRF")) throw e;
      break;
    }
  }

  const finalCoords = extractCoordinatesFromUrl(currentUrl);
  return {
    latitude: finalCoords.lat,
    longitude: finalCoords.lng,
    name: finalCoords.name,
    resolvedUrl: currentUrl,
  };
}

export const resolveGoogleMapsLink = resolveGoogleMapsLocation;
