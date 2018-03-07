<template>
  <div class="radio-buttons full">
    <div
      class="radio-buttons__option full row align-center"
      v-for="(size, i) in allSwapSizes"
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
        <span>
          {{ size }} XLM
        </span>
        <span class="radio-buttons__label-subtitle">
          ≈
        </span>
        <span>
          <span v-if="!!xlmPerUnit" >
            {{xlmPerUnit.pow(-1).times(size).toFixed(4)}} {{ currency }}
          </span>
          <span v-else>
            ..
          </span>
        </span>
      </label>
    </div>
  </div>
</template>

<script>
  import BigNumber from 'bignumber.js'
  import {allSwapSizes} from '../../../lib/swapSpecs.mjs'

  export default {
    name: 'swap-size-select',
    props: {
      disabled: Boolean,
      currency: String,
      selectedSize: String,
      xlmPerUnit: BigNumber,
    },
    data() {
      return {
        allSwapSizes,
      }
    },
    watch: {
      selectedSize(val) {
        this.$emit('update:selectedSize', val)
      },
    },
  }
</script>
