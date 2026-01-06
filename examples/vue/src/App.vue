<script setup lang="ts">
import { HomeOutlined, HomeFilled, SettingTwoTone, DownOutlined, UpOutlined } from '@ant-design/icons-vue'
</script>

<template>
  <div class="app-container">
    <h1>Ant Design Icons SVG Replace Plugin Demo</h1>
    <div class="icons-container">
      <div class="icon-item">
        <HomeOutlined class="icon" />
        <span>HomeOutlined</span>
      </div>
      <div class="icon-item">
        <HomeFilled class="icon" />
        <span>HomeFilled</span>
      </div>
      <div class="icon-item">
        <SettingTwoTone class="icon" twoToneColor="#eb2f96" />
        <span>SettingTwoTone</span>
      </div>
      <div class="icon-item">
        <DownOutlined class="icon" />
        <span>DownOutlined</span>
      </div>
      <div class="icon-item">
        <UpOutlined class="icon" />
        <span>UpOutlined</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  text-align: center;
  padding: 2rem;
}

.icons-container {
  display: flex;
  justify-content: center;
  gap: 3rem;
  margin-top: 3rem;
}

.icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.icon {
  font-size: 4rem;
  color: #1890ff;
}
</style>
