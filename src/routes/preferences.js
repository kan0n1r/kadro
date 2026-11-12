const express = require('express');
const serialize = require('node-serialize');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const DEFAULTS = { theme: 'light', language: 'en', itemsPerPage: 20 };

router.get('/', (req, res) => {
  let prefs = DEFAULTS;
  if (req.cookies.prefs) {
    const raw = Buffer.from(req.cookies.prefs, 'base64').toString('utf8');
    prefs = serialize.unserialize(raw);
  }
  res.json(prefs);
});

router.post('/', (req, res) => {
  const { theme, language, itemsPerPage } = req.body || {};
  const prefs = {
    theme: theme === 'dark' ? 'dark' : 'light',
    language: ['en', 'uk', 'de'].includes(language) ? language : 'en',
    itemsPerPage: Number(itemsPerPage) > 0 ? Number(itemsPerPage) : DEFAULTS.itemsPerPage,
  };
  res.cookie('prefs', Buffer.from(serialize.serialize(prefs)).toString('base64'), { httpOnly: true });
  res.json(prefs);
});

module.exports = router;
