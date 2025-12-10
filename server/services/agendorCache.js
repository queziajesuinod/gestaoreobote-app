'use strict';

const crypto = require('crypto');
const { Op } = require('sequelize');
const { AgendorCache } = require('../models');

const TTL_DEFAULT_MS = 15 * 60 * 1000;

function buildCacheKey({ tipo = 'tarefas', inicio, fim, dealStatus = 'ALL', token }) {
  const tokenSuffix = token ? String(token).slice(-8) : 'default';
  const raw = [
    tipo,
    inicio || 'sem-inicio',
    fim || 'sem-fim',
    dealStatus || 'ALL',
    tokenSuffix
  ].join('|');

  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { hash, tokenSuffix };
}

async function getCache(hash) {
  if (!hash) return null;
  const entry = await AgendorCache.findOne({
    where: {
      hashParams: hash,
      expiresAt: { [Op.gt]: new Date() }
    },
    order: [['updatedAt', 'DESC']]
  });

  return entry?.payload || null;
}

async function setCache({
  hash,
  tokenSuffix,
  tipo,
  inicio,
  fim,
  dealStatus,
  payload,
  ttlMs = TTL_DEFAULT_MS
}) {
  if (!hash || !payload) return;

  const expiresAt = new Date(Date.now() + ttlMs);

  await AgendorCache.upsert({
    hashParams: hash,
    tokenSuffix: tokenSuffix || 'default',
    tipo,
    inicio,
    fim,
    dealStatus: dealStatus || null,
    payload,
    expiresAt
  });
}

module.exports = {
  buildCacheKey,
  getCache,
  setCache
};
