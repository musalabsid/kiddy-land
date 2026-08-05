/**
 * Web client origin selection.
 *
 * Static default: the HTTPS origin when this app is served over HTTPS (phone
 * flow), otherwise the local HTTP origin (dev/desktop flow). The build-time
 * env VITE_LOCAL_SERVER_ORIGIN still wins when set.
 */
export const DEFAULT_ORIGIN =
  import.meta.env.VITE_LOCAL_SERVER_ORIGIN ??
  (typeof window !== "undefined" && window.location.protocol === "https:"
    ? window.location.origin
    : "http://127.0.0.1:43117");
