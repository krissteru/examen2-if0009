import { onMounted, onUnmounted, ref } from 'vue';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Network } from '@capacitor/network';

export function useConexion() {
  const conectado = ref(true);
  const tipo = ref('unknown');
  let oyente: PluginListenerHandle | null = null;
  let desmontado = false;

  onMounted(async () => {
    const estadoInicial = await Network.getStatus();
    if (desmontado) return;
    conectado.value = estadoInicial.connected;
    tipo.value = estadoInicial.connectionType;

    const handle = await Network.addListener('networkStatusChange', (estado) => {
      conectado.value = estado.connected;
      tipo.value = estado.connectionType;
    });

    if (desmontado) {
      await handle.remove();
      return;
    }
    oyente = handle;
  });

  onUnmounted(async () => {
    desmontado = true;
    if (oyente) {
      await oyente.remove();
      oyente = null;
    }
  });

  return { conectado, tipo };
}

export async function vibrar() {
  if (!Capacitor.isNativePlatform()) return;
  await Haptics.impact({ style: ImpactStyle.Light });
}
