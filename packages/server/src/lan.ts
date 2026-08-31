import { networkInterfaces } from "node:os";

/**
 * Best-effort LAN IPv4 address for this machine. Returns undefined when no
 * suitable interface is found (airplane mode, only VPN adapters, …).
 * Skips loopback, link-local, and typical virtual adapter prefixes so we don't
 * hand the phone an address that only this machine can reach.
 */
export function detectLanIpv4(): string | undefined {
  const interfaces = networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const normalized = name.toLowerCase();
    if (
      normalized.startsWith("docker") ||
      normalized.startsWith("veth") ||
      normalized.includes("vmware") ||
      normalized.includes("virtual")
    )
      continue;
    const addresses = interfaces[name] ?? [];
    for (const entry of addresses) {
      if (entry.family !== "IPv4" || entry.internal) continue;
      if (entry.address.startsWith("169.254.")) continue; // link-local
      if (entry.address.startsWith("127.") || entry.address === "0.0.0.0")
        continue;
      return entry.address;
    }
  }
  return undefined;
}
