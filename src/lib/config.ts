export const WORKER_URL = import.meta.env.DEV
  ? "http://localhost:8787"
  : "https://etsy-edge-api.YOUR_SUBDOMAIN.workers.dev";
