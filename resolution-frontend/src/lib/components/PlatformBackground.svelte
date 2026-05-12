<script lang="ts">
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

<div class="platform-bg">
  <div class="bg-scroll">
    <img src="/platform-bg.png" alt="" class="bg-image" />
    <img src="/platform-bg.png" alt="" class="bg-image" />
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

  @keyframes pan {
    0%, 100% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(-2%);
    }
    75% {
      transform: translateX(2%);
    }
  }

  @keyframes float {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-15px);
    }
  }
</style>
