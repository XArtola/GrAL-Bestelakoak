<script>
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';

  let efficiencyData = writable([]);
  let selectedModel = '';
  let loading = true;

  onMount(() => {
    loadEfficiencyData();
  });

  async function loadEfficiencyData() {
    try {
      loading = true;
      const response = await fetch('/api/efficiency?summary=true');
      const data = await response.json();
      efficiencyData.set(data);
    } catch (error) {
      console.error('Error loading efficiency data:', error);
    } finally {
      loading = false;
    }
  }

  function calculateEfficiencyScore(genEff, execEff) {
    return ((genEff + execEff) / 2 * 100).toFixed(1);
  }

  function getEfficiencyColor(score) {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  }
</script>

<div class="efficiency-section bg-white rounded-lg shadow-lg p-6">
  <div class="flex justify-between items-center mb-6">
    <h2 class="text-2xl font-bold text-gray-800">LLM Efficiency Metrics</h2>
    <button 
      on:click={loadEfficiencyData}
      class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      disabled={loading}
    >
      {loading ? 'Loading...' : 'Refresh'}
    </button>
  </div>

  {#if loading}
    <div class="flex justify-center items-center h-40">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
  {:else if $efficiencyData.length === 0}
    <div class="text-center text-gray-500 py-8">
      No efficiency data available. Upload test results to see metrics.
    </div>
  {:else}
    <div class="grid gap-6">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each $efficiencyData as model}
          <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <h3 class="font-semibold text-lg mb-3">{model.llm_model}</h3>
            
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-sm text-gray-600">Tests:</span>
                <span class="font-medium">{model.passed_tests}/{model.total_tests}</span>
              </div>
              
              <div class="flex justify-between">
                <span class="text-sm text-gray-600">Pass Rate:</span>
                <span class="font-medium">{((model.passed_tests / model.total_tests) * 100).toFixed(1)}%</span>
              </div>
              
              <div class="flex justify-between">
                <span class="text-sm text-gray-600">Gen. Efficiency:</span>
                <span class="font-medium">{(model.avg_generation_efficiency * 100).toFixed(1)}%</span>
              </div>
              
              <div class="flex justify-between">
                <span class="text-sm text-gray-600">Exec. Efficiency:</span>
                <span class="font-medium">{(model.avg_execution_efficiency * 100).toFixed(1)}%</span>
              </div>
              
              <div class="mt-3 pt-2 border-t">
                <div class="flex justify-between items-center">
                  <span class="text-sm font-medium">Overall Score:</span>
                  <span class="px-2 py-1 rounded text-xs font-semibold {getEfficiencyColor(calculateEfficiencyScore(model.avg_generation_efficiency, model.avg_execution_efficiency))}">
                    {calculateEfficiencyScore(model.avg_generation_efficiency, model.avg_execution_efficiency)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>

      <!-- Efficiency Explanation -->
      <div class="bg-gray-50 rounded-lg p-4 mt-6">
        <h4 class="font-semibold mb-2">Efficiency Metrics Explanation:</h4>
        <div class="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div>
            <strong>Generation Efficiency:</strong> Measures the relationship between generation time and test success rate. Higher efficiency means faster generation with better pass rates.
          </div>
          <div>
            <strong>Execution Efficiency:</strong> Measures the relationship between test success and the number of actions used. Higher efficiency means achieving more with fewer actions.
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .efficiency-section {
    min-height: 400px;
  }
</style>
