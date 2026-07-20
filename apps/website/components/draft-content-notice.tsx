import { publicContentNotice } from "@/content/approval";

export function DraftContentNotice() {
  const notice = publicContentNotice();
  if (!notice) return null;
  return (
    <aside
      aria-label="Draft content notice"
      className="border-b border-sun-200 bg-sun-50 px-4 py-2 text-center text-xs font-medium text-navy-800"
    >
      {notice}
    </aside>
  );
}
