import type { Metadata } from "next";
import { requirePartner } from "@/lib/auth";
import { PartnerPageHeader } from "@/components/partner-page-header";
import { ProductCatalog, submitProductHref } from "@/components/product-catalog";

export const metadata: Metadata = { title: "Products" };

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  await requirePartner();

  return (
    <div className="mx-auto max-w-[1500px]">
      <PartnerPageHeader
        eyebrow="Loans we place"
        title="Loans you can refer"
        description="Every category TrueLend places with our partner banks and NBFCs. Start a referral with the product preselected—you never need to know the rates yourself, but they are here if your contact asks."
      />

      <div className="mt-6">
        <ProductCatalog hrefFor={submitProductHref("/refer")} showDetails />
      </div>
    </div>
  );
}
