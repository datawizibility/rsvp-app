/**
 * Kebab-case a title into a URL slug, appending -2, -3, ... until free.
 */
export function slugify(
  input: string,
  isTaken: (slug: string) => boolean = () => false,
): string {
  const base =
    input
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "event";

  if (!isTaken(base)) return base;

  let n = 2;
  while (isTaken(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
