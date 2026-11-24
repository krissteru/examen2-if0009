import { computed, ref } from 'vue';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { Device } from '@capacitor/device';
import { api } from '@/services/api';

export interface Usuario { id: number; nombre: string }

const CLAVE_TOKEN = 'token';
const CLAVE_USUARIO = 'usuario';

// Estado compartido por toda la app (fuera de la función = un solo valor) — YA IMPLEMENTADO
const token = ref<string | null>(null);
const usuario = ref<Usuario | null>(null);
let tokenCargado = false;
let promesaCarga: Promise<void> | null = null;

/** YA IMPLEMENTADO — lo usa services/api.ts para armar el encabezado Authorization. */
export const obtenerToken = () => token.value;

/** Borra token y usuario de la memoria (refs) y del almacenamiento cifrado. */
export async function olvidarSesion() {
  token.value = null;
  usuario.value = null;
  await Promise.allSettled([
    SecureStorage.remove(CLAVE_TOKEN),
    SecureStorage.remove(CLAVE_USUARIO),
  ]);
}

export function useAuth() {
  const estaAutenticado = computed(() => token.value !== null);

  async function login(email: string, password: string) {
    const info = await Device.getInfo();
    const device_name = `${info.platform} ${info.model}`.trim().slice(0, 60);

    const respuesta = await api<{ token: string; usuario: Usuario }>('/login', {
      method: 'POST',
      body: { email, password, device_name },
    });

    token.value = respuesta.token;
    usuario.value = respuesta.usuario;
    tokenCargado = true;

    await Promise.all([
      SecureStorage.set(CLAVE_TOKEN, respuesta.token),
      SecureStorage.set(CLAVE_USUARIO, JSON.stringify(respuesta.usuario)),
    ]);
  }

  async function cargarToken() {
    if (tokenCargado) return;
    if (promesaCarga) return promesaCarga;

    promesaCarga = (async () => {
      try {
        const [tokenGuardado, usuarioGuardado] = await Promise.all([
          SecureStorage.get(CLAVE_TOKEN),
          SecureStorage.get(CLAVE_USUARIO),
        ]);

        token.value = typeof tokenGuardado === 'string' && tokenGuardado.length > 0 ? tokenGuardado : null;

        if (typeof usuarioGuardado === 'string') {
          try {
            usuario.value = JSON.parse(usuarioGuardado) as Usuario;
          } catch {
            usuario.value = null;
          }
        } else if (usuarioGuardado && typeof usuarioGuardado === 'object') {
          usuario.value = usuarioGuardado as unknown as Usuario;
        } else {
          usuario.value = null;
        }
      } catch {
        token.value = null;
        usuario.value = null;
      } finally {
        tokenCargado = true;
        promesaCarga = null;
      }
    })();

    return promesaCarga;
  }

  async function cerrarSesion() {
    try {
      await api<null>('/logout', { method: 'POST' });
    } catch {
      // Siempre limpiamos la sesión local aunque falle la API (sin red o token vencido)
    } finally {
      await olvidarSesion();
    }
  }

  return { usuario, estaAutenticado, login, cargarToken, cerrarSesion };
}
