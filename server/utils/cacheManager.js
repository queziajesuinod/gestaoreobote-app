// server/utils/cacheManager.js
// ✅ Sistema robusto de cache com invalidação automática e manual

/**
 * Gerenciador de cache com suporte a:
 * - TTL (Time To Live) automático
 * - Invalidação manual por padrão de chave
 * - Limpeza de cache expirado
 * - Logs detalhados
 */
class CacheManager {
  constructor(ttlMs = 15 * 60 * 1000) {
    this.cache = new Map();
    this.ttlMs = ttlMs;
    this.listeners = new Map(); // Para notificações de invalidação
  }

  /**
   * Armazena um valor no cache
   */
  set(chave, valor, ttlMs = null) {
    const expiresAt = Date.now() + (ttlMs || this.ttlMs);
    this.cache.set(chave, {
      data: valor,
      expiresAt,
      criadoEm: Date.now()
    });
    console.log(`✅ Cache SET: ${chave} (expira em ${ttlMs || this.ttlMs}ms)`);
    return this;
  }

  /**
   * Recupera um valor do cache
   */
  get(chave) {
    const entrada = this.cache.get(chave);
    
    if (!entrada) {
      console.log(`❌ Cache MISS: ${chave} (não encontrado)`);
      return null;
    }

    // Verifica se expirou
    if (entrada.expiresAt <= Date.now()) {
      console.log(`⏰ Cache EXPIRED: ${chave} (expirou)`);
      this.cache.delete(chave);
      return null;
    }

    console.log(`✅ Cache HIT: ${chave}`);
    return entrada.data;
  }

  /**
   * Verifica se uma chave existe e não expirou
   */
  has(chave) {
    const entrada = this.cache.get(chave);
    if (!entrada) return false;
    if (entrada.expiresAt <= Date.now()) {
      this.cache.delete(chave);
      return false;
    }
    return true;
  }

  /**
   * Limpa cache expirado
   */
  limparExpirado() {
    const agora = Date.now();
    let removidos = 0;

    for (const [chave, entrada] of this.cache.entries()) {
      if (entrada.expiresAt <= agora) {
        this.cache.delete(chave);
        removidos++;
      }
    }

    if (removidos > 0) {
      console.log(`🧹 Cache: ${removidos} entradas expiradas removidas`);
    }
    return removidos;
  }

  /**
   * Invalida (remove) uma chave específica
   */
  invalidar(chave) {
    const existia = this.cache.has(chave);
    this.cache.delete(chave);
    if (existia) {
      console.log(`🗑️  Cache INVALIDATED: ${chave}`);
    }
    return existia;
  }

  /**
   * Invalida múltiplas chaves por padrão (regex)
   * Exemplo: invalidarPorPadrao('tarefas_.*') remove todas as chaves que começam com 'tarefas_'
   */
  invalidarPorPadrao(padrao) {
    const regex = new RegExp(padrao);
    let removidos = 0;

    for (const chave of this.cache.keys()) {
      if (regex.test(chave)) {
        this.cache.delete(chave);
        removidos++;
      }
    }

    if (removidos > 0) {
      console.log(`🗑️  Cache INVALIDATED by pattern: ${padrao} (${removidos} entradas)`);
    }
    return removidos;
  }

  /**
   * Invalida todas as chaves que contêm um token específico
   * Útil quando você quer limpar cache de um usuário
   */
  invalidarPorToken(token) {
    const tokenKey = `tk_${token.slice(-6)}`;
    return this.invalidarPorPadrao(`.*${tokenKey}.*`);
  }

  /**
   * Invalida todas as chaves que contêm um período específico
   * Útil quando você quer limpar cache de um período de datas
   */
  invalidarPorPeriodo(dataInicio, dataFim) {
    return this.invalidarPorPadrao(`.*${dataInicio}.*${dataFim}.*`);
  }

  /**
   * Limpa TODO o cache
   */
  limparTudo() {
    const quantidade = this.cache.size;
    this.cache.clear();
    console.log(`🗑️  Cache CLEARED: ${quantidade} entradas removidas`);
    return quantidade;
  }

  /**
   * Retorna estatísticas do cache
   */
  stats() {
    let tamanho = 0;
    let expirados = 0;
    const agora = Date.now();

    for (const entrada of this.cache.values()) {
      tamanho++;
      if (entrada.expiresAt <= agora) {
        expirados++;
      }
    }

    return {
      total: tamanho,
      expirados,
      ativos: tamanho - expirados
    };
  }

  /**
   * Registra um listener para ser notificado quando cache é invalidado
   */
  onInvalidate(chave, callback) {
    if (!this.listeners.has(chave)) {
      this.listeners.set(chave, []);
    }
    this.listeners.get(chave).push(callback);
  }

  /**
   * Retorna todas as chaves do cache
   */
  chaves() {
    return Array.from(this.cache.keys());
  }

  /**
   * Debug: mostra conteúdo do cache
   */
  debug() {
    console.log('\n📊 Cache Debug:');
    for (const [chave, entrada] of this.cache.entries()) {
      const expirado = entrada.expiresAt <= Date.now() ? '⏰ EXPIRADO' : '✅ ATIVO';
      const tempoRestante = Math.max(0, entrada.expiresAt - Date.now());
      console.log(`  ${chave}: ${expirado} (${tempoRestante}ms restantes)`);
    }
    console.log('');
  }
}

// Exporta instâncias singleton
const cacheTarefas = new CacheManager(15 * 60 * 1000); // 15 minutos
const cacheNegocios = new CacheManager(15 * 60 * 1000); // 15 minutos

module.exports = {
  CacheManager,
  cacheTarefas,
  cacheNegocios
};
    