<template>
  <div class="app-container">
    <div id="app">
      <div class="site-header row justify-spaced align-center">
        <h1 class="site-header__title row align-center half">
          <span class="site-header__logo">
            <router-link to="/">
              <img src="./assets/MirrorX.png" alt="">
            </router-link>
          </span>
          <span>
            <router-link to="/">
              MirrorX
            </router-link>
          <span class="site-header__version text--angry">
            ALPHA
          </span>
        </span>
        </h1>
        <h2 class="half exclude-small row justify-right">
          Atomic swap Stellar & other currencies with no fees
        </h2>
        <hr>
      </div>
      <router-view class="router-view"/>
    </div>
    <div class="site-footer row justify-center">
      <p class="site-footer__text">
        <span>MirrorX is experimental software. Don't use it with large amounts of money.</span>
        <a target="blank"
           class="site-footer__link"
           href="https://github.com/mvanderh/MirrorX">
          Source
        </a>
      </p>
    </div>
  </div>
</template>

<script>
  export default {
    name: 'App',
  }
</script>
