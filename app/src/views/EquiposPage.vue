<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Equipos</ion-title>
        <ion-buttons slot="end">
          <ion-button router-link="/equipos/nuevo">
            <ion-icon slot="icon-only" :icon="addOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          v-model="busqueda"
          placeholder="Buscar por código o nombre..."
          :debounce="400"
          @ionInput="onBuscar"
        />
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" @ionRefresh="onRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <!-- Skeleton en primera carga -->
      <ion-list v-if="cargandoInicial">
        <ion-item v-for="n in 6" :key="n">
          <ion-label>
            <h2><ion-skeleton-text animated style="width: 65%" /></h2>
            <p><ion-skeleton-text animated style="width: 45%" /></p>
          </ion-label>
          <ion-skeleton-text slot="end" animated style="width: 70px; height: 22px; border-radius: 12px" />
        </ion-item>
      </ion-list>

      <!-- Error con Reintentar -->
      <div v-else-if="errorMensaje" class="ion-padding ion-text-center">
        <ion-text color="danger">
          <p>{{ errorMensaje }}</p>
        </ion-text>
        <ion-button @click="cargarEquipos(true)">Reintentar</ion-button>
      </div>

      <!-- Estado vacío -->
      <div v-else-if="equipos.length === 0" class="ion-padding ion-text-center">
        <ion-text color="medium">
          <p>No se encontraron equipos registrados.</p>
        </ion-text>
      </div>

      <!-- Listado con ion-item-sliding -->
      <ion-list v-else>
        <ion-item-sliding v-for="equipo in equipos" :key="equipo.id">
          <ion-item :router-link="`/equipos/${equipo.id}/editar`" button detail>
            <ion-label>
              <h2>{{ equipo.nombre }}</h2>
              <p>{{ equipo.codigo }} - {{ equipo.categoria?.nombre }}</p>
            </ion-label>
            <ion-badge slot="end" :color="colorEstado(equipo.estado)">
              {{ equipo.estado }}
            </ion-badge>
          </ion-item>

          <ion-item-options side="end">
            <ion-item-option color="danger" @click="confirmarEliminacion(equipo)">
              <ion-icon slot="icon-only" :icon="trashOutline" />
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>

      <!-- Infinite Scroll -->
      <ion-infinite-scroll
        :disabled="paginaActual >= ultimaPagina"
        @ionInfinite="onInfinite"
      >
        <ion-infinite-scroll-content loading-spinner="crescent" />
      </ion-infinite-scroll>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonSearchbar,
  IonContent,
  IonRefresher,
  IonRefresherContent,
  IonList,
  IonItem,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonLabel,
  IonBadge,
  IonSkeletonText,
  IonText,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  onIonViewWillEnter,
  alertController,
  toastController,
} from '@ionic/vue';
import { addOutline, trashOutline } from 'ionicons/icons';
import { api, ErrorApi } from '../services/api';
import { useAuth } from '../composables/useAuth';

interface Categoria {
  id: number;
  nombre: string;
}

interface Equipo {
  id: number;
  codigo: string;
  nombre: string;
  estado: string;
  fecha_adquisicion: string;
  categoria?: Categoria;
}

interface EquiposResponse {
  data: Equipo[];
  meta: {
    current_page: number;
    last_page: number;
    total: number;
  };
}

const { token, olvidarSesion } = useAuth();

const equipos = ref<Equipo[]>([]);
const busqueda = ref('');
const paginaActual = ref(1);
const ultimaPagina = ref(1);
const cargandoInicial = ref(true);
const errorMensaje = ref<string | null>(null);

function colorEstado(estado: string): string {
  switch (estado) {
    case 'disponible':
      return 'success';
    case 'prestado':
      return 'warning';
    case 'mantenimiento':
      return 'medium';
    default:
      return 'primary';
  }
}

async function mostrarToast(message: string, color = 'dark') {
  const toast = await toastController.create({
    message,
    duration: 2500,
    color,
    position: 'bottom',
  });
  await toast.present();
}

async function cargarEquipos(reiniciar = true) {
  if (reiniciar) {
    paginaActual.value = 1;
    errorMensaje.value = null;
    if (equipos.value.length === 0) {
      cargandoInicial.value = true;
    }
  }

  try {
    const resp = await api<EquiposResponse>('/equipos', {
      method: 'GET',
      token: token.value,
      onUnauthorized: olvidarSesion,
      params: {
        page: paginaActual.value,
        per_page: 15,
        q: busqueda.value.trim(),
      },
    });

    if (resp) {
      equipos.value = reiniciar ? resp.data : [...equipos.value, ...resp.data];
      paginaActual.value = resp.meta.current_page;
      ultimaPagina.value = resp.meta.last_page;
    }
  } catch (err) {
    if (reiniciar) {
      errorMensaje.value =
        err instanceof ErrorApi ? err.message : 'Error al cargar los equipos.';
    } else {
      await mostrarToast('No se pudieron cargar más equipos.', 'danger');
    }
  } finally {
    cargandoInicial.value = false;
  }
}

onIonViewWillEnter(async () => {
  await cargarEquipos(true);
});

async function onBuscar() {
  await cargarEquipos(true);
}

async function onRefresh(event: CustomEvent) {
  await cargarEquipos(true);
  (event.target as HTMLIonRefresherElement).complete();
}

async function onInfinite(event: CustomEvent) {
  if (paginaActual.value < ultimaPagina.value) {
    paginaActual.value += 1;
    await cargarEquipos(false);
  }
  (event.target as HTMLIonInfiniteScrollElement).complete();
}

async function confirmarEliminacion(equipo: Equipo) {
  const alert = await alertController.create({
    header: 'Eliminar equipo',
    message: `¿Desea eliminar "${equipo.nombre}" (${equipo.codigo})?`,
    buttons: [
      {
        text: 'Cancelar',
        role: 'cancel',
      },
      {
        text: 'Eliminar',
        role: 'destructive',
        handler: async () => {
          await eliminarEquipo(equipo);
        },
      },
    ],
  });

  await alert.present();
}

async function eliminarEquipo(equipo: Equipo) {
  try {
    await api(`/equipos/${equipo.id}`, {
      method: 'DELETE',
      token: token.value,
      onUnauthorized: olvidarSesion,
    });

    equipos.value = equipos.value.filter((item) => item.id !== equipo.id);
    await mostrarToast('Equipo eliminado correctamente.', 'success');
  } catch (err) {
    if (err instanceof ErrorApi) {
      if (err.status === 409) {
        const msg =
          typeof err.cuerpo === 'object' &&
          err.cuerpo !== null &&
          'mensaje' in err.cuerpo
            ? String((err.cuerpo as { mensaje?: unknown }).mensaje)
            : 'No se puede eliminar un equipo prestado.';
        await mostrarToast(msg, 'warning');
        return;
      }

      if (err.status === 404) {
        equipos.value = equipos.value.filter((item) => item.id !== equipo.id);
        await mostrarToast('El equipo ya no existe.', 'medium');
        return;
      }

      await mostrarToast(err.message, 'danger');
    } else {
      await mostrarToast('Error al intentar eliminar el equipo.', 'danger');
    }
  }
}
</script>