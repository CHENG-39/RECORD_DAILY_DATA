<template>
  <div class="skeleton">
    <!-- NavBar placeholder -->
    <div class="skeleton-navbar">
      <div class="skeleton-title"></div>
    </div>

    <!-- Dashboard placeholder -->
    <div class="skeleton-content">
      <div class="skeleton-card">
        <div class="skeleton-ring"></div>
        <div class="skeleton-rows">
          <div class="skeleton-row" v-for="i in 3" :key="i">
            <div class="skeleton-line w-30"></div>
            <div class="skeleton-line w-60"></div>
            <div class="skeleton-bar"></div>
          </div>
        </div>
      </div>

      <!-- Button placeholder -->
      <div class="skeleton-btn"></div>

      <!-- Records placeholder -->
      <div class="skeleton-card">
        <div class="skeleton-line w-40"></div>
        <div class="skeleton-line w-80" style="margin-top:12px"></div>
        <div class="skeleton-line w-50" style="margin-top:8px"></div>
        <div class="skeleton-line w-80" style="margin-top:12px"></div>
        <div class="skeleton-line w-50" style="margin-top:8px"></div>
      </div>
    </div>

    <!-- TabBar placeholder -->
    <div class="skeleton-tabbar">
      <div class="skeleton-tab" v-for="i in 4" :key="i"></div>
    </div>
  </div>
</template>

<style scoped>
.skeleton {
  padding-bottom: 50px;
}

.skeleton-navbar {
  height: 46px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #f0f0f0;
}

.skeleton-title {
  width: 80px;
  height: 18px;
  background: #f0f0f0;
  border-radius: 4px;
}

.skeleton-content {
  padding: 10px 16px;
}

.skeleton-card {
  background: #fff;
  border-radius: 14px;
  padding: 20px 16px;
  margin-bottom: 14px;
}

.skeleton-ring {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: #f5f5f5;
  margin: 0 auto 20px;
}

.skeleton-rows {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.skeleton-line {
  height: 12px;
  background: #f0f0f0;
  border-radius: 4px;
}

.skeleton-line.w-30 { width: 30%; }
.skeleton-line.w-40 { width: 40%; }
.skeleton-line.w-50 { width: 50%; }
.skeleton-line.w-60 { width: 60%; }
.skeleton-line.w-80 { width: 80%; }

.skeleton-bar {
  height: 5px;
  background: #f5f5f5;
  border-radius: 3px;
  width: 100%;
}

.skeleton-btn {
  height: 44px;
  background: #f0f0f0;
  border-radius: 22px;
  margin-bottom: 16px;
}

.skeleton-tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50px;
  background: #fff;
  display: flex;
  justify-content: space-around;
  align-items: center;
  border-top: 1px solid #f0f0f0;
}

.skeleton-tab {
  width: 30px;
  height: 30px;
  background: #f5f5f5;
  border-radius: 6px;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.skeleton * {
  animation: pulse 1.5s ease-in-out infinite;
}
</style>
