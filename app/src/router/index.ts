import { createRouter, createWebHistory } from '@ionic/vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useAuth } from '../composables/useAuth';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/tabs/equipos',
  },
  {
    path: '/login',
    component: () => import('../views/LoginPage.vue'),
  },
  {
    path: '/tabs/',
    component: () => import('../views/TabsPage.vue'),
    meta: { requiereSesion: true },
    children: [
      {
        path: '',
        redirect: '/tabs/equipos',
      },
      {
        path: 'equipos',
        component: () => import('../views/EquiposPage.vue'),
      },
      {
        path: 'perfil',
        component: () => import('../views/PerfilPage.vue'),
      },
    ],
  },
  {
    path: '/equipos/nuevo',
    component: () => import('../views/EquipoFormPage.vue'),
    meta: { requiereSesion: true },
  },
  {
    path: '/equipos/:id/editar',
    component: () => import('../views/EquipoFormPage.vue'),
    meta: { requiereSesion: true },
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach(async (to) => {
  const { cargarToken, estaAutenticado } = useAuth();

  await cargarToken();

  const requiereSesion = to.matched.some((record) => Boolean(record.meta?.requiereSesion));

  if (requiereSesion && !estaAutenticado.value) {
    return { path: '/login' };
  }

  if (to.path === '/login' && estaAutenticado.value) {
    return { path: '/tabs/equipos' };
  }

  return true;
});

export default router;