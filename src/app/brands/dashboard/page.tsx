import type { Metadata } from "next";
import { AdvertiserDashboard } from "./advertiser-dashboard";

export const metadata: Metadata = {
  title: "Brand Dashboard",
  description: "Impressions, pause views, clicks and exposure for in-scene campaigns.",
};

export default function BrandDashboardPage() {
  return <AdvertiserDashboard />;
}
