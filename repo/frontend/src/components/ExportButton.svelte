<script lang="ts">
  export let data: Record<string, unknown>[] = [];
  export let columns: string[] = [];
  export let filename = 'export.csv';

  function exportCsv() {
    if (data.length === 0) return;

    const cols = columns.length > 0 ? columns : Object.keys(data[0]);
    const header = cols.join(',');
    const rows = data.map(row =>
      cols.map(col => {
        const val = String(row[col] ?? '');
        return val.includes(',') || val.includes('"') || val.includes('\n')
          ? `"${val.replace(/"/g, '""')}"`
          : val;
      }).join(',')
    );

    const csv = '\uFEFF' + [header, ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<button class="export-btn" on:click={exportCsv} disabled={data.length === 0}>
  Export CSV
</button>

<style>
  .export-btn {
    padding: var(--spacing-xs) var(--spacing-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: white;
    cursor: pointer;
    font-size: 0.8rem;
  }
  .export-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
