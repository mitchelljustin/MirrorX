<template>
  <div class="radio-buttons">
    <div
      class="radio-buttons__option"
      v-for="(size, i) in swapSizes"
      :key="i">
      <input :checked="i === 0"
             :id='`swapSize-${size}`'
             :value="size"
             :disabled="disabled"
             v-model="selectedSize"
             name='swapSize'
             type='radio'
      >
      <label class="radio-buttons__label" :for='`swapSize-${size}`'>
        {{ size }} {{ currency }}
      </label>
    </div>
  </div>
</template>

<script>
  export default {
    name: 'swap-size-select',
    props: {
      disabled: Boolean,
      currency: String,
      swapSizes: Array,
      selectedSize: String,
    },
    data() {
      return {
      }
    },
    watch: {
      selectedSize(val) {
        this.$emit('update:selectedSize', val)
      },
    },
  }
</script>

<style scoped>

</style>
