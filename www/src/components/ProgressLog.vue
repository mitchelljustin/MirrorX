<template>
  <ul class="progress-log">
    <li v-for="(desc, i) in statusDescriptions"
        :key="i"
        :class="i <= currentStatus ? '' : 'subdued'"
    >
      <span class="row icon-small">
        <icon name="check" class="happy" v-if="i < currentStatus"/>
        <icon name="spinner" v-if="i === currentStatus" pulse/>
      </span>
      <span>
        {{desc}}
      </span>
    </li>
  </ul>
</template>

<script>
  export default {
    name: 'progress-log',
    props: {
      currentStatus: Number,
      statusDescriptions: Array,
    },
    computed: {
      k() {
        return 'k'
      },
    },
  }
</script>
