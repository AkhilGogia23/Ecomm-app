import slugify from "slugify";

export function generateSlug(text: string): string {
  return slugify(text, { lower: true, strict: true });
}

export async function generateUniqueSlug(
  text: string,
  checkExists: (slug: string) => Promise<boolean>
): Promise<string> {
  const base = generateSlug(text);
  let slug = base;
  let counter = 1;

  while (await checkExists(slug)) {
    slug = `${base}-${counter}`;
    counter += 1;
  }

  return slug;
}
