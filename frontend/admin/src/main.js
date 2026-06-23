import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import i18n from './i18n.js'
import { installDevHttpsFetchGuard } from "@/js/devHttpsFetchGuard.js";



const app = createApp(App)

installDevHttpsFetchGuard()

app.use(router)
app.use(i18n)

app.mount('#app')
