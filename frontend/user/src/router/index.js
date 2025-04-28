import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ProjectView from "@/views/ProjectView.vue";
import ProjectsView from "@/views/ProjectsView.vue";
import {BASE_URL} from "@/js/endpoints.js";
import LoginView from "@/views/LoginView.vue";
import AccountView from "@/views/AccountView.vue";

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
      path: '/login',
      name: 'login',
      component: LoginView
    },

    {
      path: '/account',
      name: 'account',
      component: AccountView
    }
  ]
})

export default router
