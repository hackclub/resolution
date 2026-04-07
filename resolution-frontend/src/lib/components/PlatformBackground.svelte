<script lang="ts">
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

<div class="cosmos">
  <div class="nebula nebula-a"></div>
  <div class="nebula nebula-b"></div>
  <div class="nebula nebula-c"></div>
  <div class="stars stars-sm"></div>
  <div class="stars stars-md"></div>
  <div class="stars stars-lg"></div>
  <div class="grid-overlay"></div>

  <div class="content">
    {@render children?.()}
  </div>
</div>

<style>
  .cosmos {
    position: relative;
    min-height: 100vh;
    background: var(--gradient-cosmic);
    overflow-x: hidden;
  }

  .nebula {
    position: fixed;
    border-radius: 50%;
    filter: blur(120px);
    opacity: 0.55;
    pointer-events: none;
    z-index: 0;
    animation: drift 22s ease-in-out infinite;
  }
  .nebula-a {
    width: 620px; height: 620px;
    top: -180px; left: -160px;
    background: radial-gradient(circle, #6a3cff 0%, transparent 70%);
  }
  .nebula-b {
    width: 720px; height: 720px;
    top: 10%; right: -240px;
    background: radial-gradient(circle, #ff5fa3 0%, transparent 70%);
    opacity: 0.35;
    animation-delay: -8s;
  }
  .nebula-c {
    width: 800px; height: 800px;
    bottom: -260px; left: 30%;
    background: radial-gradient(circle, #3aa8ff 0%, transparent 70%);
    opacity: 0.32;
    animation-delay: -14s;
  }

  /* Stars: layered radial-gradient dots, twinkle by opacity */
  .stars {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 1;
    background-repeat: repeat;
    animation: twinkle 6s ease-in-out infinite;
  }
  .stars-sm {
    background-image:
      radial-gradient(1px 1px at 20px 30px, #fff, transparent),
      radial-gradient(1px 1px at 80px 120px, #fff, transparent),
      radial-gradient(1px 1px at 140px 60px, #fff, transparent),
      radial-gradient(1px 1px at 200px 200px, #fff, transparent),
      radial-gradient(1px 1px at 260px 90px, #fff, transparent),
      radial-gradient(1px 1px at 320px 250px, #fff, transparent);
    background-size: 360px 280px;
    opacity: 0.7;
  }
  .stars-md {
    background-image:
      radial-gradient(1.5px 1.5px at 50px 80px, #ffe9a8, transparent),
      radial-gradient(1.5px 1.5px at 180px 220px, #fff, transparent),
      radial-gradient(1.5px 1.5px at 300px 40px, #fff, transparent),
      radial-gradient(1.5px 1.5px at 420px 180px, #cfd6ff, transparent);
    background-size: 500px 360px;
    opacity: 0.85;
    animation-delay: -2s;
  }
  .stars-lg {
    background-image:
      radial-gradient(2px 2px at 100px 150px, #fff, transparent),
      radial-gradient(2px 2px at 380px 60px, #ffd66b, transparent),
      radial-gradient(2px 2px at 520px 300px, #fff, transparent);
    background-size: 700px 480px;
    opacity: 0.9;
    animation-delay: -4s;
  }

  .grid-overlay {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 1;
    background-image:
      linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
    background-size: 56px 56px;
    mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%);
  }

  .content {
    position: relative;
    z-index: 2;
    min-height: 100vh;
  }

  @keyframes twinkle {
    0%, 100% { opacity: 0.55; }
    50% { opacity: 1; }
  }

  @keyframes drift {
    0%, 100% { transform: translate(0, 0); }
    50% { transform: translate(40px, -30px); }
  }

  @media (prefers-reduced-motion: reduce) {
    .stars, .nebula { animation: none; }
  }
</style>
