<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/equipos" />
        </ion-buttons>
        <ion-title>{{ esEdicion ? 'Editar Equipo' : 'Nuevo Equipo' }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <form @submit.prevent="guardar">
        <ion-list>
          <ion-item>
            <ion-input
              v-model="form.codigo"
              label="Código"
              label-placement="stacked"
              placeholder="EQ-0001"
              @ionInput="form.codigo = String($event.detail.value ?? '').toUpperCase()"
            />
          </ion-item>
          <ion-text v-if="errores.codigo" color="danger">
            <p class="ion-padding-start">{{ errores.codigo[0] }}</p>
          </ion-text>

          <ion-item>
            <ion-input
              v-model="form.nombre"
              label="Nombre"
              label-placement="stacked"
              placeholder="Nombre del equipo"
            />
          </ion-item>
          <ion-text v-if="errores.nombre" color="danger">
            <p class="ion-padding-start">{{ errores.nombre[0] }}</p>
          </ion-text>

          <ion-item>
            <ion-select
              v-model="form.categoria_id"
              label="Categoría"
              label-placement="stacked"
              placeholder="Seleccione una categoría"
            >
              <ion-select-option
                v-for="cat in categorias"
                :key="cat.id"
                :value="cat.id"
              >
                {{ cat.nombre }}
              </ion-select-option>
            </ion-select>
          </ion-item>
          <ion-text v-if="errores.categoria_id" color="danger">
            <p class="ion-padding-start">{{ errores.categoria_id[0] }}</p>
          </ion-text>

          <ion-item v-if="!estaPrestado">
            <ion-select
              v-model="form.estado"
              label="Estado"
              label-placement="stacked"
            >
              <ion-select-option value="disponible">Disponible</ion-select-option>
              <ion-select-option value="mantenimiento">Mantenimiento</ion-select-option>
              <ion-select-option value="baja">Baja</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-text v-if="errores.estado" color="danger">
            <p class="ion-padding-start">{{ errores.estado[0] }}</p>
          </ion-text>

          <ion-item>
            <ion-input
              v-model="form.fecha_adquisicion"
              type="date"
              label="Fecha de adquisición"
              label-placement="stacked"
            />
          </ion-item>
          <ion-text v-if="errores.fecha_adquisicion" color="danger">
            <p class="ion-padding-start">{{ errores.fecha_adquisicion[0] }}</p>
          </ion-text>

          <ion-item>
            <ion-input
              v-model="form.costo_interno"
              type="number"
              step="0.01"
              label="Costo interno"
              label-placement="stacked"
              placeholder="0.00"
            />
          </ion-item>
          <ion-text v-if="errores.costo_interno" color="danger">
            <p class="ion-padding-start">{{ errores.costo_interno[0] }}</p>
          </ion-text>
        </ion-list>

        <div class="ion-padding-top">
          <ion-button expand="block" type="submit">
            {{ esEdicion ? 'Actualizar' : 'Guardar' }}
          </ion-button>
        </div>
      </form>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonText,
  useIonRouter,
  onIonViewWillEnter,
  loadingController,
  toastController,
} from '@ionic/vue';
import { api, ErrorApi } from '../services/api';
import { useAuth } from '../composables/useAuth';

interface Categoria {
  id: number;
  nombre: string;
}

interface EquipoDetalle {
  id: number;
  codigo: string;
  nombre: string;
  estado: string;
  fecha_adquisicion: string;
  costo_interno?: number;
  categoria?: Categoria;
  categoria_id?: number;
}

const route = useRoute();
const ionRouter = useIonRouter();
const { token, olvidarSesion } = useAuth();

const equipoId = computed(() => route.params.id as string | undefined);
const esEdicion = computed(() => Boolean(equipoId.value));
const estaPrestado = ref(false);

const categorias = ref<Categoria[]>([]);
const errores = ref<Record<string, string[]>>({});

const form = ref({
  codigo: '',
  nombre: '',
  categoria_id: null as number | null,
  estado: 'disponible',
  fecha_adquisicion: '',
  costo_interno: '',
});

async function mostrarToast(message: string, color = 'dark') {
  const toast = await toastController.create({
    message,
    duration: 2500,
    color,
    position: 'bottom',
  });
  await toast.present();
}

async function cargarDatos() {
  const loading = await loadingController.create({ message: 'Cargando...' });
  await loading.present();

  try {
    const respCats = await api<{ data: Categoria[] }>('/categorias', {
      method: 'GET',
      token: token.value,
      onUnauthorized: olvidarSesion,
    });
    categorias.value = respCats?.data ?? [];

    if (esEdicion.value && equipoId.value) {
      const respEq = await api<{ data: EquipoDetalle }>(`/equipos/${equipoId.value}`, {
        method: 'GET',
        token: token.value,
        onUnauthorized: olvidarSesion,
      });

      if (respEq?.data) {
        const eq = respEq.data;
        estaPrestado.value = eq.estado === 'prestado';
        form.value = {
          codigo: eq.codigo ?? '',
          nombre: eq.nombre ?? '',
          categoria_id: eq.categoria?.id ?? eq.categoria_id ?? null,
          estado: eq.estado ?? 'disponible',
          fecha_adquisicion: eq.fecha_adquisicion ?? '',
          costo_interno: eq.costo_interno !== undefined ? String(eq.costo_interno) : '',
        };
      }
    }
  } catch (err) {
    if (err instanceof ErrorApi && err.status === 404) {
      await mostrarToast('El equipo no existe.', 'warning');
      ionRouter.back();
    } else {
      await mostrarToast('Error al cargar los datos del formulario.', 'danger');
    }
  } finally {
    await loading.dismiss();
  }
}

onIonViewWillEnter(async () => {
  errores.value = {};
  await cargarDatos();
});

async function guardar() {
  errores.value = {};
  const loading = await loadingController.create({ message: 'Guardando...' });
  await loading.present();

  try {
    const payload: Record<string, unknown> = {
      codigo: form.value.codigo.trim().toUpperCase(),
      nombre: form.value.nombre.trim(),
      categoria_id: form.value.categoria_id,
      fecha_adquisicion: form.value.fecha_adquisicion,
      costo_interno:
        form.value.costo_interno === '' ? null : Number(form.value.costo_interno),
    };

    if (!estaPrestado.value) {
      payload.estado = form.value.estado;
    }

    if (esEdicion.value && equipoId.value) {
      await api(`/equipos/${equipoId.value}`, {
        method: 'PUT',
        body: payload,
        token: token.value,
        onUnauthorized: olvidarSesion,
      });
      await mostrarToast('Equipo actualizado correctamente.', 'success');
    } else {
      await api('/equipos', {
        method: 'POST',
        body: payload,
        token: token.value,
        onUnauthorized: olvidarSesion,
      });
      await mostrarToast('Equipo creado correctamente.', 'success');
    }

    ionRouter.back();
  } catch (err) {
    if (err instanceof ErrorApi) {
      if (err.status === 422) {
        const body = err.cuerpo as { errors?: Record<string, string[]> } | null;
        errores.value = body?.errors ?? {};
        await mostrarToast('Revise los campos marcados.', 'warning');
      } else if (err.status === 404) {
        await mostrarToast('El equipo ya no existe.', 'warning');
        ionRouter.back();
      } else {
        await mostrarToast(err.message, 'danger');
      }
    } else {
      await mostrarToast('Ocurrió un error al guardar.', 'danger');
    }
  } finally {
    await loading.dismiss();
  }
}
</script>