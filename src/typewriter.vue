<template>
    <div class="typewriter-container">
      <div class="typewriter">{{ displayText }}</div>
    </div>
  </template>
  
  <script setup>
  import { ref, watch, onMounted } from 'vue';
  var typeInterval;
  var i = 0;
  const props = defineProps({
    text: {
      type: String,
      required: true,
    },
  });
  
  const displayText = ref('');
  const typingSpeed = 50;
  
  const typeWriterEffect = (text) => {
    if(typeInterval){
      clearInterval(typeInterval);
    }
     typeInterval = setInterval(() => {
      if (i < text.length) {
        displayText.value += text.charAt(i);
        i++;
      } else {
        clearInterval(typeInterval);
      }
    }, typingSpeed);
  };
  
  watch(
    () => props.text,
    (newText) => {
        
      const processedText = newText?.replace(/百度/g, 'Alx').replace(/文心一言/g, '小艾').replace(/千帆/g, '小艾').replace(/ERNIE Bot/g, 'Alx')
  
      if (processedText !== displayText.value) {
        typeWriterEffect(processedText);
      }
    },
    { immediate: true }
  );
  
  
  onMounted(() => {
    if (props.fullText) {
      typeWriterEffect(props.fullText);
    }
  });
  </script>
  
  <style scoped>
  .typewriter-container {
    display: flex;
    overflow: hidden;
    white-space: pre-wrap;
    height: auto;
    width: 100%;
  }
  
  .typewriter {
    overflow: hidden;
    height: auto;
    display: flex;
    align-items: flex-start;
    white-space: pre-wrap;
  }
  </style>
  