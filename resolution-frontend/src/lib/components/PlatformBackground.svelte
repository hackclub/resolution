<script lang="ts">
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

<div class="platform-bg">
  <div class="bg-layer"></div>
  <div class="vignette"></div>

  <div class="content">
    {@render children?.()}
  </div>
</div>

<style>
  .platform-bg {
    position: relative;
    min-height: 100vh;
    background-color: #91c8ff;
    overflow-x: hidden;
  }

  .bg-layer {
    position: fixed;
    inset: 0;
    background-image: url('/platform-bg.png');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    z-index: 0;
    animation: drift 30s ease-in-out infinite;
  }

  .vignette {
    position: fixed;
    inset: 0;
    background: radial-gradient(ellipse at center, transparent 40%, rgba(80, 60, 120, 0.18) 100%);
    pointer-events: none;
    z-index: 1;
  }

  .content {
    position: relative;
    z-index: 2;
    min-height: 100vh;
  }

  @keyframes drift {
    0%, 100% { transform: scale(1.02) translateX(0); }
    50% { transform: scale(1.04) translateX(-1.5%); }
  }

  @media (prefers-reduced-motion: reduce) {
    .bg-layer { animation: none; }
  }
</style>
