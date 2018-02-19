<template>
  <div id="app">
    <div class="site-header">
      <h1>
        <span class="site-header__logo">
          <router-link to="/">
            <img src="./assets/MirrorX.png" alt="">
          </router-link>
        </span>
        <span class="site-header__title">
          <router-link to="/">
            MirrorX
          </router-link>
        </span>
      </h1>
      <h2 class="exclude-small">
        Convert Digital Currencies using Atomic Swaps
      </h2>
    </div>
    <hr>
    <router-view class="router-view"/>
  </div>
</template>

<script>
  export default {
    name: 'App',
  }
</script>
