<script lang="ts">
  const iconUrls = Object.fromEntries(
    Object.entries(
      import.meta.glob("$lib/assets/icons/*.svg", {
        eager: true,
        query: "?url",
        import: "default",
      }) as Record<string, string>,
    ).map(([path, url]) => [path.split("/").pop()!.replace(".svg", ""), url]),
  );

  interface Props {
    /** Icon glyph name, matching a file in $lib/assets/icons (e.g. "back", "checkmark"). */
    icon: string;
    /** Hex color (with or without leading #) or any CSS color. Defaults to the muted slate. */
    color?: string;
    /** Square size in px (or any CSS length). Used for both width and height unless overridden. */
    size?: number | string;
    width?: number | string;
    height?: number | string;
    /** Accessible label. Leave empty for decorative icons (renders aria-hidden). */
    alt?: string;
    class?: string;
    style?: string;
  }

  let {
    icon,
    color = "8492a6",
    size = 16,
    width,
    height,
    alt = "",
    class: className = "",
    style = "",
  }: Props = $props();

  const toLen = (
    v: number | string | undefined,
    fallback: number | string,
  ): string => {
    const x = v ?? fallback;
    return typeof x === "number" ? `${x}px` : x;
  };

  // Bare hex (3/4/6/8 digits) -> prefix with #; otherwise pass through as a CSS color.
  const normColor = (c: string): string =>
    /^[0-9a-fA-F]{3,8}$/.test(c) ? `#${c}` : c;

  const w = $derived(toLen(width, size));
  const h = $derived(toLen(height, size));
  const fill = $derived(normColor(color));
  const maskValue = $derived(`url("${iconUrls[icon]}")`);
</script>

<span
  class="hc-icon {className}"
  role={alt ? "img" : undefined}
  aria-label={alt || undefined}
  aria-hidden={alt ? undefined : "true"}
  style="--hc-w:{w}; --hc-h:{h}; --hc-color:{fill}; --hc-mask:{maskValue}; {style}"
></span>

<style>
  .hc-icon {
    display: inline-block;
    width: var(--hc-w);
    height: var(--hc-h);
    background-color: var(--hc-color);
    -webkit-mask: var(--hc-mask) no-repeat center / contain;
    mask: var(--hc-mask) no-repeat center / contain;
    flex-shrink: 0;
    vertical-align: middle;
  }
</style>
