import { createRouter, createWebHistory } from 'vue-router'
import ProjectsView from "@/views/ProjectsView.vue";
import ProjectView from "@/views/ProjectView.vue";
import LoginView from "@/views/LoginView.vue";
import NotFoundView from "@/views/NotFoundView.vue";
import SceneView from "@/views/SceneView.vue";
import RegisterView from "@/views/RegisterView.vue";
import {BASE_URL} from "@/js/endpoints.js";
import AdminView from "@/views/AdminView.vue";

const router = createRouter({
  history: createWebHistory(BASE_URL),
  routes: [

    {
      path: "/:notFound",
      name: "notFound",
      component: NotFoundView,
    },

    {
      path: "/login",
      name: "login",
      component: LoginView,
    },

    // {
    //   path: "/register",
    //   name: "register",
    //   component: RegisterView,
    // },

    {
      path: '/',
      name: 'home',
      component: ProjectsView
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
      path: '/scene/:sceneId',
      name: 'scene',
      component: SceneView
    },
    {
      path: '/admin',
      name: 'admin',
      component: AdminView
    },
  ]
})

export default router
