const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authenticateAdmin } = require('../middleware/auth');
const sanitizeHtml = require('sanitize-html');

// Apply auth middleware to all template routes
router.use(authenticateAdmin);

// Sanitization utility
const cleanTemplate = (body) => {
  return sanitizeHtml(body, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([ 'h1', 'h2', 'img', 'span', 'div' ]),
    allowedAttributes: {
      '*': ['style', 'class', 'id'],
      'a': ['href', 'name', 'target'],
      'img': ['src', 'alt', 'width', 'height']
    },
    allowedStyles: {
      '*': {
        'color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i],
        'text-align': [/^left$/, /^right$/, /^center$/],
        'font-size': [/^\d+(?:px|em|rem)$/],
        'font-weight': [/^\d+$/, /^bold$/, /^normal$/],
        'background-color': [/^#(0x)?[0-9a-f]+$/i],
        'padding': [/^\d+px$/],
        'margin': [/^\d+px$/],
        'border': [/^.*$/]
      }
    }
  });
};

router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('email_templates').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', async (req, res) => {
  const { title, subject, body, variables } = req.body;
  const sanitizedBody = cleanTemplate(body);
  
  const { data, error } = await supabase
    .from('email_templates')
    .insert({ title, subject, body: sanitizedBody, variables })
    .select();
    
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data[0]);
});

router.put('/:id', async (req, res) => {
  const { title, subject, body, variables } = req.body;
  const sanitizedBody = cleanTemplate(body);

  const { data, error } = await supabase
    .from('email_templates')
    .update({ title, subject, body: sanitizedBody, variables })
    .eq('id', req.params.id)
    .select();
    
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('email_templates').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

module.exports = router;
