export const ROUTES = {
  AUTH: {
    SIGN_IN: '/(auth)/sign-in' as const,
    SIGN_UP: '/(auth)/sign-up' as const,
  },
  ADMIN: {
    HOME: '/(admin)' as const,
    ACCEPT_INVITATION: '/(admin)/accept-invitation' as const,
    ONBOARDING: '/(admin)/onboarding' as const,
    PROFILE: '/(admin)/profile' as const,
    SUPER_ADMIN: '/(admin)/super-admin' as const,
    RESTAURANTS: {
      CREATE: '/(admin)/restaurants/create' as const,
      detail: (id: number | string) => `/(admin)/restaurants/${id}` as const,
      edit: (id: number | string) => `/(admin)/restaurants/${id}/edit` as const,
      subpage: (id: number | string, page: string) =>
        `/(admin)/restaurants/${id}/${page}` as const,
    },
    MENU: {
      list: (id: number | string) => `/(admin)/restaurants/${id}/menu` as const,
      categoryForm: (id: number | string) =>
        `/(admin)/restaurants/${id}/menu/category-form` as const,
      itemForm: (id: number | string, itemId?: number | string) =>
        itemId
          ? (`/(admin)/restaurants/${id}/menu/item-form?itemId=${itemId}` as const)
          : (`/(admin)/restaurants/${id}/menu/item-form` as const),
    },
    TABLES: {
      list: (id: number | string) => `/(admin)/restaurants/${id}/tables` as const,
      create: (id: number | string) =>
        `/(admin)/restaurants/${id}/tables/create` as const,
      detail: (id: number | string, tableId: number | string) =>
        `/(admin)/restaurants/${id}/tables/${tableId}` as const,
    },
    MEMBERS: {
      invite: (id: number | string) =>
        `/(admin)/restaurants/${id}/members/invite` as const,
    },
    ROLES: {
      list: (id: number | string) => `/(admin)/restaurants/${id}/roles` as const,
      create: (id: number | string) =>
        `/(admin)/restaurants/${id}/roles/form` as const,
      edit: (id: number | string, roleId: number | string) =>
        `/(admin)/restaurants/${id}/roles/form?roleId=${roleId}` as const,
    },
    NOTIFICATIONS: {
      settings: (id: number | string) =>
        `/(admin)/restaurants/${id}/notification-settings` as const,
    },
    SUBSCRIPTION: {
      detail: (id: number | string) =>
        `/(admin)/restaurants/${id}/subscription` as const,
    },
  },
  ORDER: {
    JOIN: '/order/join' as const,
    menu: (slug: string, table: string) =>
      `/order/${slug}/${table}/menu` as const,
    summary: (slug: string, table: string) =>
      `/order/${slug}/${table}` as const,
  },
} as const;
