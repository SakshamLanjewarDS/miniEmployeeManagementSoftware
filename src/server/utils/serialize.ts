/**
 * High-performance, bulletproof serializer for React Server Component -> Client Component boundary.
 * Recursively strips non-plain objects (e.g. Prisma.Decimal, custom classes) and normalizes BigInts/Dates
 * into 100% plain JSON primitives (numbers, strings, booleans, arrays, plain objects).
 */
export function serializeForClient<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  return JSON.parse(
    JSON.stringify(data, (_key, value) => {
      // Convert BigInt to string
      if (typeof value === "bigint") {
        return value.toString();
      }

      // Convert Prisma Decimal (or any object with .toNumber()) to plain JavaScript number
      if (value && typeof value === "object" && typeof value.toNumber === "function") {
        return value.toNumber();
      }

      return value;
    })
  );
}
