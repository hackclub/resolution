<script lang="ts">
  import platformBg from '$lib/assets/platform-bg.avif';

  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

<svelte:head>
  <link rel="preload" as="image" href={platformBg} fetchpriority="high" />
</svelte:head>

<div class="platform-bg">
  <div class="bg-scroll">
    <img src={platformBg} alt="" class="bg-image" fetchpriority="high" />
  </div>

  <div class="content">
    {@render children?.()}
  </div>
</div>

<style>
  .platform-bg {
    position: fixed;
    inset: 0;
    overflow: hidden;
    background-color: #91c8ff;
  }

  .bg-scroll {
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    height: 100%;

  }

  .bg-image {
    height: 100%;
    width: auto;
    min-width: 100vw;
    object-fit: cover;
    flex-shrink: 0;
  }

  .content {
    position: relative;
    z-index: 1;
    min-height: 100vh;
    height: 100%;
    overflow-y: auto;
  }
</style>
