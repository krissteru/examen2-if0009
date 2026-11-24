import { ref, computed } from 'vue';
import { Device } from '@capacitor/device';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { api } from '../services/api';

export interface Usuario {
  id: number;
  nombre: string;
  email?: string;
}

interface LoginResponse {
  token: string;
  usuario: Usuario;
}

const TOKEN_KEY = 'auth_token';
const USUARIO_KEY = 'auth_usuario';

const token = ref<string | null>(null);
const usuario = ref<Usuario | null>(null);
const cargandoSesion = ref(false);
let sesionCargada = false;
let promesaCarga: Promise<void> | null = null;

async function guardarSeguro(key: string, value: string): Promise<void> {
  await SecureStoragePlugin.set({ key, value });
}

async function leerSeguro(key: string): Promise<string | null> {
  try {
    const { value } = await SecureStoragePlugin.get({ key });
    return value ?? null;
  } catch {
    return null;
  }
}

async function borrarSeguro(key: string): Promise<void> {
  try {
    await SecureStoragePlugin.remove({ key });
  } catch {
    // Si la clave no existía en SecureStorage, ignoramos el error
  }
}

export function useAuth() {
  const estaAutenticado = computed(() => Boolean(token.value));

  async function olvidarSesion(): Promise<void> {
    token.value = null;
    usuario.value = null;
    sesionCargada = false;
    await Promise.all([borrarSeguro(TOKEN_KEY), borrarSeguro(USUARIO_KEY)]);
  }

  async function cargarToken(): Promise<void> {
    if (sesionCargada) return;
    if (promesaCarga) return promesaCarga;

    cargandoSesion.value = true;
    promesaCarga = (async () => {
      try {
        const storedToken = await leerSeguro(TOKEN_KEY);
        const storedUsuario = await leerSeguro(USUARIO_KEY);

        token.value = storedToken;
        if (storedUsuario) {
          try {
            usuario.value = JSON.parse(storedUsuario) as Usuario;
          } catch {
            usuario.value = null;
          }
        } else {
          usuario.value = null;
        }
        sesionCargada = true;
      } finally {
        cargandoSesion.value = false;
        promesaCarga = null;
      }
    })();

    return promesaCarga;
  }

  async function obtenerDeviceName(): Promise<string> {
    try {
      const info = await Device.getInfo();
      const modelo = info.model || 'Dispositivo';
      const plataforma = info.platform || 'unknown';
      const os = info.operatingSystem || '';
      return `${modelo} (${plataforma}${os ? ` - ${os}` : ''})`;
    } catch {
      return 'Dispositivo Web/Móvil';
    }
  }

  async function login(email: string, password: string): Promise<LoginResponse> {
    const device_name = await obtenerDeviceName();

    const data = await api<LoginResponse>('/login', {
      method: 'POST',
      body: {
        email,
        password,
        device_name,
      },
    });

    if (!data || !data.token) {
      throw new Error('Respuesta inválida del servidor al iniciar sesión');
    }

    token.value = data.token;
    usuario.value = data.usuario;
    sesionCargada = true;

    await Promise.all([
      guardarSeguro(TOKEN_KEY, data.token),
      guardarSeguro(USUARIO_KEY, JSON.stringify(data.usuario)),
    ]);

    return data;
  }

  async function cerrarSesion(): Promise<void> {
    const currentToken = token.value;
    try {
      if (currentToken) {
        await api('/logout', {
          method: 'POST',
          token: currentToken,
        });
      }
    } catch {
      // Aunque falle la revocación en el servidor, siempre limpiamos la sesión local
    } finally {
      await olvidarSesion();
    }
  }

  return {
    token,
    usuario,
    estaAutenticado,
    cargandoSesion,
    login,
    cargarToken,
    cerrarSesion,
    olvidarSesion,
  };
}