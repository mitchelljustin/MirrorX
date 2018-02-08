<template>
  <div id="app">
    <div class="row">
      <h1>
        <img src="./assets/MirrorX.png" alt="" class="logo">
        <span>MirrorX</span>
      </h1>
      <h2>
        Secure Deposits & Withdrawals on the Stellar DEX
      </h2>
    </div>
    <hr>
    <div>
      <router-view/>
    </div>
  </div>
</template>

<script>
  export default {
    name: 'App',
  }
</script>
