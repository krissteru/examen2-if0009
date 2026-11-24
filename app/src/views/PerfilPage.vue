<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Perfil</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-card v-if="usuario">
        <ion-card-header>
          <ion-card-title>{{ usuario.nombre }}</ion-card-title>
          <ion-card-subtitle>{{ usuario.email }}</ion-card-subtitle>
        </ion-card-header>
      </ion-card>

      <ion-card>
        <ion-card-header>
          <ion-card-title>Dispositivo</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list lines="none">
            <ion-item>
              <ion-label>
                <h3>Plataforma</h3>
                <p>{{ plataforma }}</p>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label>
                <h3>Modelo</h3>
                <p>{{ modelo }}</p>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label>
                <h3>Sistema operativo</h3>
                <p>{{ sistemaOperativo }}</p>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label>
                <h3>Conexión</h3>
                <p>{{ conectado ? `Conectado (${tipoConexion})` : 'Sin conexión' }}</p>
              </ion-label>
            </ion-item>
          </ion-list>

          <ion-button expand="block" fill="outline" @click="probarVibracion">
            Probar vibración
          </ion-button>
        </ion-card-content>
      </ion-card>

      <ion-button expand="block" color="danger" @click="salir">
        Cerrar sesión
      </ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  useIonRouter,
} from '@ionic/vue';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useAuth } from '../composables/useAuth';
import { useConexion } from '../composables/useConexion';

const ionRouter = useIonRouter();
const { usuario, cerrarSesion } = useAuth();
const { conectado, tipoConexion } = useConexion();

const plataforma = ref(Capacitor.getPlatform());
const modelo = ref('');
const sistemaOperativo = ref('');

onMounted(async () => {
  const info = await Device.getInfo();
  modelo.value = `${info.manufacturer ?? ''} ${info.model ?? ''}`.trim();
  sistemaOperativo.value = `${info.operatingSystem} ${info.osVersion}`.trim();
});

async function vibrar() {
  if (!Capacitor.isNativePlatform()) {
    return;
  }
  await Haptics.impact({ style: ImpactStyle.Medium });
}

async function probarVibracion() {
  await vibrar();
}

async function salir() {
  await cerrarSesion();
  ionRouter.replace('/login');
}
</script>