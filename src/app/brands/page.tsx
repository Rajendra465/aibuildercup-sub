import type { Metadata } from "next";
import { BrandStudio } from "./brand-studio";

export const metadata: Metadata = {
  title: "Brand Studio",
  description: "Create and manage in-scene product placement campaigns.",
};

export default function BrandsPage() {
  return <BrandStudio />;
}
