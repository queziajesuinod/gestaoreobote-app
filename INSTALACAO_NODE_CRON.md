# 📦 Instalação do node-cron

Para que os cron jobs do módulo de inadimplentes funcionem, é necessário instalar a biblioteca `node-cron`.

---

## 🔧 Instalação

### Usando npm:

```bash
cd /caminho/para/gestaoreobote-app
npm install node-cron --save
```

### Usando yarn:

```bash
cd /caminho/para/gestaoreobote-app
yarn add node-cron
```

---

## ✅ Verificação

Após a instalação, verificar se foi adicionado ao `package.json`:

```json
{
  "dependencies": {
    ...
    "node-cron": "^3.0.0"
    ...
  }
}
```

---

## 🚀 Reiniciar Servidor

Após instalar, reiniciar o servidor para ativar os cron jobs:

```bash
npm start
```

ou

```bash
npm run start:prod
```

---

## 📝 Logs de Inicialização

Se instalado corretamente, você verá os seguintes logs ao iniciar o servidor:

```
🕐 Inicializando cron jobs do módulo de inadimplentes...
✅ Cron job de geração de cobranças agendado: Diariamente às 00:00 (America/Manaus)
✅ Cron job de detecção de inadimplência agendado: Diariamente às 08:00 (America/Manaus)
✅ Cron job de limpeza de logs agendado: Semanalmente aos domingos às 02:00 (America/Manaus)

🎉 Todos os cron jobs do módulo de inadimplentes foram inicializados!
```

---

## ⚠️ Troubleshooting

### Erro: Cannot find module 'node-cron'

**Solução:** Instalar a biblioteca conforme instruções acima.

### Cron jobs não estão executando

**Verificar:**
1. Se node-cron está instalado
2. Se o servidor foi reiniciado após instalação
3. Se há erros nos logs do servidor
4. Se o timezone está configurado corretamente

---

## 📚 Documentação

- [node-cron no npm](https://www.npmjs.com/package/node-cron)
- [node-cron no GitHub](https://github.com/node-cron/node-cron)
