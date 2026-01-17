const { OpenAI } = require('openai');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Inicializar cliente OpenAI
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Baixa arquivo de áudio de uma URL
 */
async function baixarAudio(url) {
  try {
    console.log(`[TRANSCRICAO] Baixando áudio de: ${url.substring(0, 100)}...`);
    
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000 // 30 segundos
    });
    
    // Criar arquivo temporário
    const tempDir = os.tmpdir();
    const timestamp = Date.now();
    const tempFile = path.join(tempDir, `audio_${timestamp}.ogg`);
    
    fs.writeFileSync(tempFile, response.data);
    console.log(`[TRANSCRICAO] Áudio salvo em: ${tempFile}`);
    
    return tempFile;
  } catch (error) {
    console.error('[TRANSCRICAO] Erro ao baixar áudio:', error.message);
    throw new Error(`Falha ao baixar áudio: ${error.message}`);
  }
}

/**
 * Transcreve arquivo de áudio usando Whisper API
 */
async function transcreverAudio(caminhoArquivo) {
  try {
    console.log(`[TRANSCRICAO] Transcrevendo áudio: ${caminhoArquivo}`);
    
    const audioFile = fs.createReadStream(caminhoArquivo);
    
    const response = await client.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'pt', // Português
      response_format: 'json'
    });
    
    const transcricao = response.text || '';
    console.log(`[TRANSCRICAO] Transcrição concluída: ${transcricao.substring(0, 100)}...`);
    
    return transcricao;
  } catch (error) {
    console.error('[TRANSCRICAO] Erro ao transcrever áudio:', error.message);
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
    puladas: 0
  };
  
  for (const mensagem of mensagens) {
    const resultado = await transcreverMensagemSeNecessario(mensagem);
    
    if (resultado.sucesso) {
      resultados.transcritas++;
    } else if (resultado.motivo === 'Não é mensagem de áudio' || resultado.motivo === 'Já possui transcrição') {
      resultados.puladas++;
    } else {
      resultados.falhas++;
    }
  }
  
  console.log(`[TRANSCRICAO] Lote processado:`, resultados);
  
  return resultados;
}

module.exports = {
  transcreverAudioDeURL,
  transcreverMensagemSeNecessario,
  transcreverLoteMensagens,
  baixarAudio,
  transcreverAudio
};
