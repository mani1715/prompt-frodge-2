export function getAdminToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('adminToken');
  }
  return null;
}

export function getAdminUser() {
  if (typeof window !== 'undefined') {
    const user = localStorage.getItem('adminUser');
    return user ? JSON.parse(user) : null;
  }
  return null;
}

export function clearAuth() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
  }
}

export async function checkAuth(router) {
  const token = getAdminToken();
  if (!token) {
    router.push('/admin');
    return null;
  }

  try {
    const res = await fetch('/api/auth/verify', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      clearAuth();
      router.push('/admin');
      return null;
    }

    const data = await res.json();
    return data.user;
  } catch (error) {
    clearAuth();
    router.push('/admin');
    return null;
  }
}

export function getAuthHeaders() {
  const token = getAdminToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}
