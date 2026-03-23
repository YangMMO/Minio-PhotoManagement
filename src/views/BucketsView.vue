<template>
  <div class="app-shell flex h-screen flex-col">
    <AppHeader />

    <main class="page-shell flex-1 overflow-auto pt-14">
      <div class="page-content">
        <section class="section-header">
          <div>
            <div class="page-kicker">MinIO {{ i18nStore.t('workspaceKicker') }}</div>
            <h1 class="page-title">{{ i18nStore.t('bucketList') }}</h1>
          </div>
          <p class="section-meta">
            {{ authStore.endPoint ? `${authStore.endPoint}:${authStore.port}` : 'MinIO' }}
          </p>
        </section>

        <div v-if="isLoading" class="flex items-center justify-center py-16">
          <i class="ri-loader-4-line text-4xl text-primary animate-spin"></i>
        </div>

        <div v-else-if="buckets.length > 0" class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          <BucketCard
            v-for="bucket in buckets"
            :key="bucket.name"
            :bucket="bucket"
            @click="handleBucketClick(bucket.name)"
          />
        </div>

        <div v-else class="empty-state">
          <i class="ri-folder-open-line mb-4 text-5xl"></i>
          <p>{{ loadError || i18nStore.t('noBucketSpecified') }}</p>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMinioStore } from '../stores/minio'
import { useAuthStore } from '../stores/auth'
import { useI18nStore } from '../stores/i18n'
import AppHeader from '../components/common/AppHeader.vue'
import BucketCard from '../components/buckets/BucketCard.vue'

const router = useRouter()
const minioStore = useMinioStore()
const authStore = useAuthStore()
const i18nStore = useI18nStore()

const buckets = ref([])
const isLoading = ref(false)
const loadError = ref('')

onMounted(async () => {
  await loadBuckets()
})

async function loadBuckets() {
  isLoading.value = true
  loadError.value = ''

  const result = await minioStore.fetchBuckets()
  if (result.success) {
    buckets.value = minioStore.buckets
  } else {
    buckets.value = []
    loadError.value = i18nStore.t('loadFailed')
  }

  isLoading.value = false
}

function handleBucketClick(bucketName) {
  router.push({ name: 'Files', params: { bucket: bucketName } })
}
</script>
