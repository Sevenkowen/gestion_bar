import { nextTick, onMounted, onUnmounted, ref, watch, type Ref } from 'vue';

const DEFAULT_ROW_HEIGHT = 34;
const DEFAULT_HEADER_HEIGHT = 32;
const DEFAULT_FOOTER_HEIGHT = 46;
const MIN_ROWS = 4;
const MAX_ROWS = 100;

type Options = {
  footerRef?: Ref<HTMLElement | null>;
  footerHeight?: number;
  minRows?: number;
  maxRows?: number;
  /** Recalcular cuando cambia (p. ej. datos cargados) */
  watchSources?: Array<Ref<unknown>>;
};

export function useAdaptiveTableRows(containerRef: Ref<HTMLElement | null>, options: Options = {}) {
  const rowsPerPage = ref(10);
  const minRows = options.minRows ?? MIN_ROWS;
  const maxRows = options.maxRows ?? MAX_ROWS;
  const fallbackFooterHeight = options.footerHeight ?? DEFAULT_FOOTER_HEIGHT;

  function measureRowHeight(container: HTMLElement): number {
    const sample = container.querySelector('.q-table tbody tr');
    const h = sample?.getBoundingClientRect().height;
    return h && h > 0 ? h : DEFAULT_ROW_HEIGHT;
  }

  function measureHeaderHeight(container: HTMLElement): number {
    const thead = container.querySelector('.q-table thead');
    const h = thead?.getBoundingClientRect().height;
    return h && h > 0 ? h : DEFAULT_HEADER_HEIGHT;
  }

  function recalculate() {
    const container = containerRef.value;
    if (!container) return;

    const footerEl = options.footerRef?.value;
    const footerHeight = footerEl?.offsetHeight ?? fallbackFooterHeight;
    const headerHeight = measureHeaderHeight(container);
    const rowHeight = measureRowHeight(container);
    const available = container.clientHeight - footerHeight - headerHeight;
    const rows = Math.floor(available / rowHeight);

    rowsPerPage.value = Math.max(minRows, Math.min(maxRows, rows || minRows));
  }

  let observer: ResizeObserver | null = null;

  onMounted(() => {
    observer = new ResizeObserver(() => recalculate());
    if (containerRef.value) observer.observe(containerRef.value);

    window.addEventListener('resize', recalculate);
    void nextTick(recalculate);
  });

  onUnmounted(() => {
    observer?.disconnect();
    window.removeEventListener('resize', recalculate);
  });

  if (options.watchSources?.length) {
    watch(options.watchSources, () => void nextTick(recalculate), { deep: true });
  }

  return { rowsPerPage, recalculate };
}
