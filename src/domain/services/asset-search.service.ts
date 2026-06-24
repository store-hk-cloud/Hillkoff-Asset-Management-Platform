function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("th-TH");
}

export function buildAssetSearchKeywords(values: readonly string[]): string[] {
  return [
    ...new Set(
      values.flatMap((value) => normalize(value).split(/\s+/)).filter(Boolean),
    ),
  ].slice(0, 50);
}

export function buildAssetSearchPrefixes(values: readonly string[]): string[] {
  const tokens = buildAssetSearchKeywords(values);
  const prefixes = tokens.flatMap((token) => {
    const result: string[] = [];
    for (let length = 2; length <= token.length; length += 1) {
      result.push(token.slice(0, length));
    }
    return result;
  });

  return [...new Set([...tokens, ...prefixes])].slice(0, 200);
}
