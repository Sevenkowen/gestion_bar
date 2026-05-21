<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import { stockApi, type UnitType } from '@/services/stock.api';
import type { Ingredient, IngredientKind } from '@/types';
import { formatMoney } from '@/utils/format';

const $q = useQuasar();
const insumos = ref<Ingredient[]>([]);
const loading = ref(false);
const dialog = ref(false);
const adjustDialog = ref(false);
const editingId = ref<number | null>(null);
const adjustId = ref<number | null>(null);
const adjustQty = ref(0);

const units: { label: string; value: UnitType }[] = [
  { label: 'Unidad', value: 'UNIDAD' },
  { label: 'Gramo', value: 'GRAMO' },
  { label: 'Kilo', value: 'KILO' },
  { label: 'ml', value: 'ML' },
  { label: 'Litro', value: 'LITRO' },
];

const kinds: { label: string; value: IngredientKind }[] = [
  { label: 'Cocina (recetas de comida)', value: 'COCINA' },
  { label: 'Bebida (menú / combos)', value: 'BEBIDA' },
];

const form = ref<{ name: string; kind: IngredientKind; unit: UnitType; currentStock: number; minStock: number; cost: number }>({
  name: '',
  kind: 'COCINA',
  unit: 'UNIDAD',
  currentStock: 0,
  minStock: 0,
  cost: 0,
});

async function load() {
  loading.value = true;
  try {
    insumos.value = await stockApi.ingredientes();
  } finally {
    loading.value = false;
  }
}

onMounted(() => void load());

function openCreate() {
  editingId.value = null;
  form.value = { name: '', kind: 'COCINA', unit: 'UNIDAD', currentStock: 0, minStock: 0, cost: 0 };
  dialog.value = true;
}

function openEdit(insumo: Ingredient) {
  editingId.value = insumo.id;
  form.value = {
    name: insumo.name,
    kind: insumo.kind ?? 'COCINA',
    unit: insumo.unit as UnitType,
    currentStock: parseFloat(insumo.currentStock),
    minStock: parseFloat(insumo.minStock),
    cost: parseFloat(insumo.cost),
  };
  dialog.value = true;
}

function kindLabel(kind: IngredientKind) {
  return kind === 'BEBIDA' ? 'Bebida' : 'Cocina';
}

function openAdjust(id: number) {
  adjustId.value = id;
  adjustQty.value = 0;
  adjustDialog.value = true;
}

async function save() {
  try {
    if (editingId.value) {
      await stockApi.updateIngrediente(editingId.value, {
        name: form.value.name,
        kind: form.value.kind,
        unit: form.value.unit,
        minStock: form.value.minStock,
        cost: form.value.cost,
      });
    } else {
      await stockApi.createIngrediente(form.value);
    }
    $q.notify({ type: 'positive', message: 'Insumo guardado' });
    dialog.value = false;
    await load();
  } catch {
    $q.notify({ type: 'negative', message: 'Error al guardar insumo' });
  }
}

async function ajustar() {
  if (!adjustId.value) return;
  await stockApi.ajustarStock(adjustId.value, adjustQty.value);
  adjustDialog.value = false;
  await load();
}

function isLow(stock: string, min: string) {
  return parseFloat(stock) <= parseFloat(min);
}
</script>

<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h5">Insumos y stock</div>
      <q-space />
      <q-btn color="primary" icon="add" label="Nuevo insumo" @click="openCreate" />
    </div>

    <div class="text-caption text-grey-5 q-mb-md">
      El <strong>stock mínimo</strong> es la cantidad de alerta: cuando el stock baja de ese número,
      el dashboard avisa y los productos que usan ese insumo pueden quedar no disponibles.
      El <strong>costo unitario</strong> es lo que te cuesta cada unidad (compra) — sirve para referencia interna.
    </div>

    <q-inner-loading :showing="loading" />

    <q-table flat bordered dark :rows="insumos" row-key="id"
      :columns="[
        { name: 'name', label: 'Insumo', field: 'name', align: 'left' },
        { name: 'kind', label: 'Tipo', field: 'kind', align: 'left' },
        { name: 'unit', label: 'Unidad', field: 'unit', align: 'left' },
        { name: 'currentStock', label: 'Stock', field: 'currentStock', align: 'right' },
        { name: 'minStock', label: 'Stock mín.', field: 'minStock', align: 'right' },
        { name: 'cost', label: 'Costo unit.', field: 'cost', align: 'right' },
        { name: 'actions', label: '', field: 'id', align: 'right' },
      ]"
    >
      <template #body-cell-kind="props">
        <q-td :props="props">
          <q-badge :color="props.row.kind === 'BEBIDA' ? 'info' : 'secondary'" :label="kindLabel(props.row.kind ?? 'COCINA')" />
        </q-td>
      </template>
      <template #body-cell-currentStock="props">
        <q-td :props="props">
          <q-badge :color="isLow(props.row.currentStock, props.row.minStock) ? 'negative' : 'positive'" :label="props.row.currentStock" />
        </q-td>
      </template>
      <template #body-cell-cost="props">
        <q-td :props="props" class="text-amber">{{ formatMoney(props.row.cost) }}</q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td :props="props">
          <q-btn flat dense round icon="edit" color="primary" @click="openEdit(props.row)">
            <q-tooltip>Editar insumo</q-tooltip>
          </q-btn>
          <q-btn flat dense round icon="add_circle" color="secondary" @click="openAdjust(props.row.id)">
            <q-tooltip>Ajustar stock (+/-)</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>

    <q-dialog v-model="dialog">
      <q-card dark style="min-width: 350px">
        <q-card-section class="text-h6">{{ editingId ? 'Editar insumo' : 'Nuevo insumo' }}</q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="form.name" label="Nombre del insumo" outlined dark />
          <q-select
            v-model="form.kind"
            :options="kinds"
            emit-value
            map-options
            label="Tipo"
            outlined
            dark
            hint="Cocina: recetas de comida. Bebida: menú o combos."
          />
          <q-select
            v-model="form.unit"
            :options="units"
            emit-value
            map-options
            label="Unidad de medida"
            outlined
            dark
            :disable="!!editingId"
          />
          <q-input
            v-if="!editingId"
            v-model.number="form.currentStock"
            label="Stock inicial"
            type="number"
            outlined
            dark
          />
          <q-input
            v-else
            :model-value="form.currentStock"
            label="Stock actual"
            outlined
            dark
            readonly
            hint="Usá «Ajustar stock» para sumar o restar unidades"
          />
          <q-input
            v-model.number="form.minStock"
            label="Stock mínimo (alerta)"
            type="number"
            outlined
            dark
            hint="Aviso en dashboard cuando el stock baje de este valor"
          />
          <q-input
            v-model.number="form.cost"
            label="Costo unitario ($)"
            type="number"
            outlined
            dark
            hint="Precio de compra por unidad — actualizalo cuando suba el proveedor"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="primary" label="Guardar" @click="save" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="adjustDialog">
      <q-card dark style="min-width: 300px">
        <q-card-section class="text-h6">Ajustar stock</q-card-section>
        <q-card-section>
          <q-input v-model.number="adjustQty" label="Cantidad (+entrada / -salida)" type="number" outlined dark />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="primary" label="Aplicar" @click="ajustar" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
