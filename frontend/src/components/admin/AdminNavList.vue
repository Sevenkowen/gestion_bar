<script setup lang="ts">
import badgePasion from '@/assets/badge-pasion.png';

const navItems = [
  { to: '/admin', icon: 'dashboard', label: 'Dashboard', exact: true },
  { to: '/admin/productos', icon: 'lunch_dining', label: 'Productos' },
  { to: '/admin/combos', icon: 'fastfood', label: 'Combos' },
  { to: '/admin/menu', icon: 'restaurant_menu', label: 'Menú / Carta' },
  { to: '/admin/categorias', icon: 'category', label: 'Categorías' },
  { to: '/admin/insumos', icon: 'inventory_2', label: 'Insumos y stock' },
  { to: '/admin/mesas', icon: 'table_restaurant', label: 'Mesas' },
  { to: '/admin/impresoras', icon: 'print', label: 'Impresoras' },
  { to: '/admin/usuarios', icon: 'people', label: 'Usuarios' },
];
</script>

<template>
  <div class="admin-nav">
    <div class="admin-nav__menu">
      <q-list class="bar-nav">
        <q-item
          v-for="item in navItems"
          :key="item.to"
          v-ripple
          dense
          clickable
          :to="item.to"
          :exact="item.exact"
          class="bar-nav__item"
          active-class="bar-nav__item--active"
        >
          <q-item-section side class="bar-nav__icon">
            <q-icon :name="item.icon" size="17px" />
          </q-item-section>
          <q-item-section class="bar-nav__label">{{ item.label }}</q-item-section>
        </q-item>
      </q-list>
    </div>

    <div class="bar-drawer__footer">
      <div class="bar-drawer__badge-frame">
        <img
          :src="badgePasion"
          alt="Hechas con pasión para vos"
          class="bar-drawer__badge-img"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-nav {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  overflow-y: auto;
}

.admin-nav__menu {
  flex: 1 1 auto;
  min-height: 0;
  padding: 14px var(--bar-nav-inset, 18px) 8px;
  box-sizing: border-box;
}
</style>
