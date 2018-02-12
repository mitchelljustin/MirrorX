<template>
  <ul class="no-bullets">
    <li v-for="(desc, i) in statusDescriptions"
        :key="i"
        v-if="i <= currentStatus"
    >
      <span class="row">
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
