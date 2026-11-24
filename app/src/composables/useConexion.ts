import { ref, onMounted, onUnmounted } from 'vue';
import { Network } from '@capacitor/network';
import type { PluginListenerHandle } from '@capacitor/core';

export function useConexion() {
  const conectado = ref(true);
  const tipoConexion = ref<string>('unknown');
  let listenerHandle: PluginListenerHandle | null = null;

  onMounted(async () => {
    const status = await Network.getStatus();
    conectado.value = status.connected;
    tipoConexion.value = status.connectionType;

    listenerHandle = await Network.addListener('networkStatusChange', (nuevoEstado) => {
      conectado.value = nuevoEstado.connected;
      tipoConexion.value = nuevoEstado.connectionType;
    });
  });

  onUnmounted(async () => {
    if (listenerHandle) {
      await listenerHandle.remove();
      listenerHandle = null;
    }
  });

  return {
    conectado,
    tipoConexion,
  };
}