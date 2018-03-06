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
        <span v-if="!!xlmPerUnit" class="radio-buttons__label-subtitle">
          ≈ {{xlmPerUnit.times(size).toFixed(2)}} XLM
        </span>
      </label>
    </div>
  </div>
</template>

<script>
  import BigNumber from 'bignumber.js'

  export default {
    name: 'swap-size-select',
    props: {
      disabled: Boolean,
      currency: String,
      swapSizes: Array,
      selectedSize: String,
      xlmPerUnit: BigNumber,
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
