<template>   
  <div class="input-number">      
    <button @click="sub">-</button>
    <span class="num">{{ ipt }}</span>
    <button class="add" @click="add">+</button>
  </div>   
</template>

<script>
export default {
    // name: 'CRInputnumber',
    // componentName: 'CRInputnumber',

    data() {
      return {
        ipt:1,
        islight: true,
      }
    },
    created() {
        if (this.count > 0) {
            this.ipt = this.count
        }
        this.islight = this.lightFunc()
    },
     props: {
         count:{
              type: Number,
              default: 1
        },
     },
     methods: {
    // 减少数量
        sub: function () {
            if (this.ipt < 2) {
                return
            }
            this.ipt--
            this.$emit('changeCount',this.ipt)
        },
        // 增加数量
        add: function () {
            this.ipt++
            this.$emit('changeCount',this.ipt)
        },
        lightFunc(){
            if (this.ipt < 2) {
                return true
            } else {
                return false
            }
        }
    }
     
     
};
</script>

<style scoped> 

</style>