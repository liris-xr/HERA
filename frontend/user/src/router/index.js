import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ProjectView from "@/views/ProjectView.vue";
import ProjectsView from "@/views/ProjectsView.vue";
import {BASE_URL} from "@/js/endpoints.js";
import QuestionnaireDemoView from "@/views/QuestionnaireDemoView.vue";

const router = createRouter({
  history: createWebHistory(BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },

    {
      path: '/projects',
      name: 'projects',
      component: ProjectsView
    },

    {
      path: '/project/:projectId',
      name: 'project',
      component: ProjectView
    },
    {
      path: '/questionnaire-demo',
      name: 'questionnaire-demo',
      component: QuestionnaireDemoView
    },
  ]
})

export default router
