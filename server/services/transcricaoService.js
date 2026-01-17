const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');

const execPromise = promisify(exec);

/**
 * Baixa arquivo de áudio de uma URL
 */
async function baixarAudio(url) {
  try {
    console.log(`[TRANSCRICAO] Baixando áudio de: ${url.substring(0, 100)}...`);
    
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000, // 30 segundos
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    
    // Criar arquivo temporário
    const tempDir = os.tmpdir();
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    
    // Detectar extensão do arquivo pela URL ou content-type
    let extensao = '.ogg';
    if (url.includes('.mp3')) extensao = '.mp3';
    else if (url.includes('.wav')) extensao = '.wav';
    else if (url.includes('.m4a')) extensao = '.m4a';
    else if (url.includes('.webm')) extensao = '.webm';
    
    const tempFile = path.join(tempDir, `audio_${timestamp}_${random}${extensao}`);
    
    fs.writeFileSync(tempFile, response.data);
    console.log(`[TRANSCRICAO] Áudio salvo em: ${tempFile}`);
    
    return tempFile;
  } catch (error) {
    console.error('[TRANSCRICAO] Erro ao baixar áudio:', error.message);
    throw new Error(`Falha ao baixar áudio: ${error.message}`);
  }
}

/**
 * Transcreve arquivo de áudio usando manus-speech-to-text (open source)
 */
async function transcreverAudio(caminhoArquivo) {
  try {
    console.log(`[TRANSCRICAO] Transcrevendo áudio: ${caminhoArquivo}`);
    
    // Executar comando manus-speech-to-text
    const comando = `manus-speech-to-text "${caminhoArquivo}"`;
    const { stdout, stderr } = await execPromise(comando, {
      timeout: 120000, // 2 minutos de timeout
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    
    if (stderr) {
      console.warn(`[TRANSCRICAO] Avisos: ${stderr}`);
    }
    
    const transcricao = stdout.trim();
    
    if (!transcricao || transcricao.length === 0) {
      throw new Error('Transcrição vazia retornada');
    }
    
    console.log(`[TRANSCRICAO] Transcrição concluída: ${transcricao.substring(0, 100)}...`);
    
    return transcricao;
  } catch (error) {
    console.error('[TRANSCRICAO] Erro ao transcrever áudio:', error.message);
    
    // Mensagens de erro mais amigáveis
    if (error.message.includes('timeout')) {
      throw new Error('Timeout ao transcrever áudio (arquivo muito grande ou servidor lento)');
    } else if (error.message.includes('not found')) {
      throw new Error('Comando manus-speech-to-text não encontrado');
    } else if (error.message.includes('Invalid')) {
      throw new Error('Formato de áudio inválido ou corrompido');
    }
    
    throw new Error(`Falha ao transcrever áudio: ${error.message}`);
  } finally {
    // Limpar arquivo temporário
    try {
      if (fs.existsSync(caminhoArquivo)) {
        fs.unlinkSync(caminhoArquivo);
        console.log(`[TRANSCRICAO] Arquivo temporário removido: ${caminhoArquivo}`);
      }
    } catch (cleanupError) {
      console.error('[TRANSCRICAO] Erro ao limpar arquivo temporário:', cleanupError.message);
    }
  }
}

/**
 * Transcreve áudio de uma URL
 */
async function transcreverAudioDeURL(url) {
  try {
    if (!url || typeof url !== 'string') {
      throw new Error('URL inválida');
    }
    
    // Baixar áudio
    const caminhoArquivo = await baixarAudio(url);
    
    // Transcrever
    const transcricao = await transcreverAudio(caminhoArquivo);
    
    return {
      sucesso: true,
      transcricao
    };
  } catch (error) {
    console.error('[TRANSCRICAO] Erro ao transcrever áudio de URL:', error.message);
    return {
      sucesso: false,
      erro: error.message,
      transcricao: null
    };
  }
}

/**
 * Transcreve mensagem de áudio se necessário
 */
async function transcreverMensagemSeNecessario(mensagem) {
  try {
    // Verificar se é áudio e se já tem transcrição
    if (mensagem.tipoMidia !== 'audio') {
      return {
        sucesso: false,
        motivo: 'Não é mensagem de áudio'
      };
    }
    
    if (mensagem.transcricao && mensagem.transcricao.trim().length > 0) {
      return {
        sucesso: false,
        motivo: 'Já possui transcrição'
      };
    }
    
    if (!mensagem.urlMidia) {
      return {
        sucesso: false,
        motivo: 'URL de mídia não disponível'
      };
    }
    
    // Transcrever
    const resultado = await transcreverAudioDeURL(mensagem.urlMidia);
    
    if (resultado.sucesso && resultado.transcricao) {
      // Atualizar mensagem com transcrição
      mensagem.transcricao = resultado.transcricao;
      await mensagem.save();
      
      console.log(`[TRANSCRICAO] Mensagem ${mensagem.id} transcrita com sucesso`);
      
      return {
        sucesso: true,
        transcricao: resultado.transcricao
      };
    }
    
    return {
      sucesso: false,
      motivo: resultado.erro || 'Falha na transcrição'
    };
  } catch (error) {
    console.error('[TRANSCRICAO] Erro ao transcrever mensagem:', error.message);
    return {
      sucesso: false,
      motivo: error.message
    };
  }
}

/**
 * Processa lote de mensagens de áudio para transcrição
 */
async function transcreverLoteMensagens(mensagens) {
  const resultados = {
    total: mensagens.length,
    transcritas: 0,
    falhas: 0,
    puladas: 0,
    erros: []
  };
  
  for (const mensagem of mensagens) {
    try {
      const resultado = await transcreverMensagemSeNecessario(mensagem);
      
      if (resultado.sucesso) {
        resultados.transcritas++;
      } else if (resultado.motivo === 'Não é mensagem de áudio' || resultado.motivo === 'Já possui transcrição') {
        resultados.puladas++;
      } else {
        resultados.falhas++;
        resultados.erros.push({
          mensagemId: mensagem.id,
          erro: resultado.motivo
        });
      }
    } catch (error) {
      resultados.falhas++;
      resultados.erros.push({
        mensagemId: mensagem.id,
        erro: error.message
      });
    }
  }
  
  console.log(`[TRANSCRICAO] Lote processado:`, {
    total: resultados.total,
    transcritas: resultados.transcritas,
    falhas: resultados.falhas,
    puladas: resultados.puladas
  });
  
  if (resultados.erros.length > 0) {
    console.log(`[TRANSCRICAO] Erros detalhados:`, resultados.erros.slice(0, 5));
  }
  
  return resultados;
}

/**
 * Verifica se o serviço de transcrição está disponível
 */
async function verificarDisponibilidade() {
  try {
    const { stdout } = await execPromise('which manus-speech-to-text', {
      timeout: 5000
    });
    
    if (stdout.trim()) {
      console.log('[TRANSCRICAO] Serviço disponível:', stdout.trim());
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[TRANSCRICAO] Serviço não disponível:', error.message);
    return false;
  }
}

module.exports = {
  transcreverAudioDeURL,
  transcreverMensagemSeNecessario,
  transcreverLoteMensagens,
  baixarAudio,
  transcreverAudio,
  verificarDisponibilidade
};
