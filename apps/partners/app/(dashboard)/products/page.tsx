import { requirePartner } from "@/lib/auth";
import { PartnerPageHeader } from "@/components/partner-page-header";
import { ProductCatalog, submitProductHref } from "@/components/product-catalog";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const { partner } = await requirePartner();
  const business = partner!.type === "business";
  const submitHref = business ? "/leads" : "/refer";

  return (
    <div className="mx-auto max-w-[1500px]">
      <PartnerPageHeader
        eyebrow="Loans we place"
        title={business ? "Products you can submit" : "Loans you can refer"}
        description={
          business
            ? "Every category TrueLend places with our partner banks and NBFCs. Start a case with the product preselected, or open the public page to check rates and eligibility before you commit to a lender."
            : "Every category TrueLend places with our partner banks and NBFCs. Start a referral with the product preselected — you never need to know the rates yourself, but they are here if your contact asks."
        }
      />

      <div className="mt-6">
        <ProductCatalog hrefFor={submitProductHref(submitHref)} showDetails />
      </div>
    </div>
  );
}

export const metadata = { title: "Products" };
