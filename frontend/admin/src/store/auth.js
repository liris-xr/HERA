import { computed, ref, watch } from "vue";
import { jwtDecode } from "jwt-decode";

const token = ref(sessionStorage.getItem("token") || null);

try {
    jwtDecode(token.value);
} catch {
    token.value = null;
}

/**
 * @type {import('vue').ComputedRef<Token | null>}
 */
const userData = computed(() => {
    if (!token.value) return null;
    return jwtDecode(token.value);
});

watch(token, () => {
    if (token.value) {
        sessionStorage.setItem("token", token.value);
    } else {
        sessionStorage.removeItem("token");
    }
});

/**
 * @type {import('vue').ComputedRef<boolean>}
 */
const isAuthenticated = computed(() => userData.value !== null);


/**
 * @type {import('vue').ComputedRef<string>}
 */
const username = computed(() => userData.value.username);

export function useAuthStore() {
    return {
        userData,
        token,
        isAuthenticated,
        username,
        login,
        logout,
    };
}

/**
 * @param {string} _token
 */
function login(_token) {
    token.value = _token;
}

function logout() {
    token.value = null;
}
