<template>
  <div id="app">
    <div class="site-header">
      <h1>
        <img src="./assets/MirrorX.png" alt="" class="site-header__logo">
        <span class="site-header__title">
          <router-link to="/">MirrorX</router-link>
        </span>
      </h1>
      <h2>
        Secure Deposits & Withdrawals on the Stellar DEX
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
