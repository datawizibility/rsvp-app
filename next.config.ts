import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // RSVP travel-ticket uploads arrive inside the RSVP server action's
      // FormData; leave room above the 4 MB file cap for multipart overhead.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
