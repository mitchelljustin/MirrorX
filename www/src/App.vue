<template>
  <div class="app-container">
    <v-dialog />
    <div id="app">
      <div class="site-header row justify-spaced align-center">
        <h1 class="site-header__title row align-center one-third">
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
        <h2 class="two-thirds row justify-right">
          <span class="exclude-small">
            Convert between Stellar & Ethereum for free. No sign-up required.
          </span>
        </h2>
      </div>
      <hr>
      <router-view class="router-view row justify-center"/>
    </div>
    <div class="site-footer row justify-center">
      <p class="site-footer__text">
        <span>MirrorX is in Alpha. Project is hosted on </span>
        <a target="blank"
           href="https://github.com/mvanderh/MirrorX">
          GitHub
        </a>
      </p>
    </div>
  </div>
</template>

<script>
  export default {
    name: 'App',
    errorHandler(err) {
      this.$displayError(err)
    },
  }
</script>
