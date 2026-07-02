<script lang="ts">
  import { onMount } from 'svelte';
  import loadingBg from '$lib/assets/loading-bg.avif';

  interface Props {
    onComplete?: () => void;
    duration?: number;
  }

  let { onComplete, duration = 2000 }: Props = $props();
  let progress = $state(0);

  onMount(() => {
    const startTime = Date.now();
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      progress = Math.min((elapsed / duration) * 100, 100);
      
      if (progress >= 100) {
        clearInterval(interval);
        onComplete?.();
      }
    }, 50);

    return () => clearInterval(interval);
  });
</script>

<div class="loading-container">
  <img src={loadingBg} alt="" class="background" />
  
  <div class="progress-wrapper">
    <div class="progress-bar">
      <div class="progress-fill" style="width: {progress}%"></div>
    </div>
    <span class="loading-text">Loading...</span>
  </div>
</div>

<style>
  .loading-container {
    position: fixed;
    inset: 0;
    overflow: hidden;
    background-color: #0f0c1c;
    z-index: 9999;
  }

  .background {
    position: absolute;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }

  .progress-wrapper {
    position: absolute;
    bottom: 8%;
    left: 50%;
    transform: translateX(-50%);
    width: min(90%, 600px);
  }

  .progress-bar {
    width: 100%;
    height: 50px;
    background-color: white;
    border-radius: 126px;
    overflow: hidden;
    position: relative;
  }

  .progress-fill {
    height: 100%;
    background-color: #0f0c1c;
    border-radius: 126px;
    transition: width 0.05s linear;
  }

  .loading-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-family: 'Kodchasan', sans-serif;
    font-size: clamp(24px, 5vw, 40px);
    color: #3ed9fb;
    pointer-events: none;
  }
</style>
