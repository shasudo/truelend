import type { MDXComponents } from "mdx/types";

// Required by App Router for MDX imports; styling comes from `prose` classes
// on the article wrapper.
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return components;
}
