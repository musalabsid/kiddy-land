import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import selfsigned from "selfsigned";

export type TlsMaterial = {
  key: string;
  cert: string;
  fingerprint: string;
  /** Hosts covered by the certificate SANs, for display/onboarding. */
  hosts: string[];
};

export type TlsConfig = {
  /** Directory where the generated certificate and key are persisted. */
  dir: string;
  /** Hostnames/IPs to include as certificate SANs. localhost and 127.0.0.1 are always included. */
  hosts?: string[];
};

/**
 * Load the persisted local TLS certificate/key or generate a fresh self-signed
 * pair on first start. The private key never leaves the data directory.
 *
 * `selfsigned` (v5) is async; generate() resolves to `{ private, cert, fingerprint }`.
 */
export async function loadOrCreateTls(config: TlsConfig): Promise<TlsMaterial> {
  const keyPath = join(config.dir, "key.pem");
  const certPath = join(config.dir, "cert.pem");
  if (existsSync(keyPath) && existsSync(certPath)) {
    const [key, cert] = await Promise.all([readFile(keyPath, "utf8"), readFile(certPath, "utf8")]);
    return { key, cert, fingerprint: fingerprintOf(cert), hosts: config.hosts ?? [] };
  }
  const hosts = Array.from(new Set(["localhost", "127.0.0.1", ...(config.hosts ?? [])]));
  const pems = await selfsigned.generate([{ name: "commonName", value: hosts[0] }], {
    algorithm: "sha256",
    keySize: 2048,
    notAfterDate: new Date(Date.now() + 825 * 24 * 60 * 60 * 1000),
    extensions: [
      { name: "basicConstraints", cA: false },
      { name: "keyUsage", digitalSignature: true, keyEncipherment: true },
      { name: "extKeyUsage", serverAuth: true, clientAuth: true },
      {
        name: "subjectAltName",
        altNames: hosts.map((host) =>
          /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(":")
            ? { type: 7, ip: host }
            : { type: 2, value: host },
        ),
      },
    ],
  });
  await mkdir(config.dir, { recursive: true });
  await Promise.all([writeFile(keyPath, pems.private, { mode: 0o600 }), writeFile(certPath, pems.cert)]);
  return { key: pems.private, cert: pems.cert, fingerprint: fingerprintOf(pems.cert), hosts };
}

function fingerprintOf(certPem: string): string {
  const body = certPem.replace(/-----BEGIN CERTIFICATE-----/, "").replace(/-----END CERTIFICATE-----/, "").replace(/\s+/g, "");
  const { createHash } = require("node:crypto") as typeof import("node:crypto");
  const sha = createHash("sha256").update(Buffer.from(body, "base64")).digest("hex").toUpperCase();
  return sha.match(/.{1,2}/g)?.join(":") ?? sha;
}
