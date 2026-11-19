(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AtlasCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function parseCsv(text) {
    const rows = []; let row = [], value = '', quoted = false;
    text = text.replace(/^\uFEFF/, '');
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"' && text[i + 1] === '"') { value += '"'; i++; }
        else if (c === '"') quoted = false;
        else value += c;
      } else if (c === '"') quoted = true;
      else if (c === ',') { row.push(value); value = ''; }
      else if (c === '\n') { row.push(value); rows.push(row); row = []; value = ''; }
      else if (c !== '\r') value += c;
    }
    if (quoted) throw new Error('Unclosed quoted field in the method library.');
    if (value || row.length) { row.push(value); rows.push(row); }
    const headers = rows.shift() || [];
    if (new Set(headers).size !== headers.length) throw new Error('Duplicate library columns.');
    const records = rows.filter(r => r.some(Boolean)).map(r => {
      if (r.length !== headers.length) throw new Error('A method row has an unexpected number of fields.');
      return Object.fromEntries(headers.map((h, i) => [h, r[i]]));
    });
    return {headers, records};
  }
  const values = value => (value || '').split(';').map(v => v.trim()).filter(Boolean);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function safeUrl(value) {
    try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : ''; }
    catch { return ''; }
  }
  function csvEscape(value, spreadsheetSafe = false) {
    let s = String(value ?? '');
    if (spreadsheetSafe && /^[\s]*[=+@-]/.test(s)) s = "'" + s;
    return /[",\r\n]/.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s;
  }
  function serializeCsv(records, headers, spreadsheetSafe = false) {
    return [headers.map(h => csvEscape(h)).join(','), ...records.map(r => headers.map(h => csvEscape(r[h], spreadsheetSafe)).join(','))].join('\r\n') + '\r\n';
  }
  function methodMatches(method, filters, fields) {
    if (method.inclusion_status !== 'included') return false;
    if (filters.curatedOnly && method.needs_curation === 'yes') return false;
    const query = (filters.search || '').trim().toLowerCase();
    const searchable = [method.method, method.method_id, method.publication_title, method.modalities, method.methodological_components, method.method_doi, method.summary, method.curation_notes].join(' ').toLowerCase();
    if (query && !query.split(/\s+/).every(term => searchable.includes(term))) return false;
    return fields.every(field => {
      const selected = filters[field.id] || [];
      if (!selected.length) return true;
      const actual = values(method[field.id] || 'not-assessed');
      return field.id === 'methodological_components'
        ? selected.every(v => actual.includes(v))
        : selected.some(v => actual.includes(v));
    });
  }
  function candidateRecord(input, headers, fields) {
    const record = Object.fromEntries(headers.map(h => [h, '']));
    const citation = (input.citation || '').trim();
    const doi = citation.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
    Object.assign(record, {method_id:(input.method || 'new-method').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''), method:input.method || '', method_doi:/^10\.\d{4,9}\/\S+$/i.test(doi) ? doi : '', publication_url:/^10\.\d{4,9}\/\S+$/i.test(doi) ? 'https://doi.org/' + doi : safeUrl(citation), resource_url:safeUrl(input.resource_url), modalities:input.modalities || '', summary:input.summary || '', curation_notes:input.rationale || '', inclusion_status:'pending', needs_curation:'yes', source_table:'Community suggestion', schema_version:'2.1'});
    for (const field of fields) record[field.id] = (input[field.id] || []).join(';') || 'not-assessed';
    return record;
  }
  const practicalFields = ['dataset_size','software_maturity','compute_demand','validation_evidence'];
  function displayField(method, id, fields) {
    const field = fields.find(f => f.id === id);
    return values(method[id] || 'not-assessed').map(value => field?.options.find(o => o.value === value)?.label || value).join('; ');
  }
  function comparisonFields(fields, filters = {}) {
    const ids = ['axis_correspondence','axis_missingness','axis_method_scope','integration_effects',...practicalFields,'code_availability'];
    for (const field of fields) if (filters[field.id]?.length) ids.push(field.id);
    return [...new Set(ids)].map(id => fields.find(f => f.id === id)).filter(Boolean);
  }
  function comparisonMethods(methods, ids) {
    const included = new Map(methods.filter(m => m.inclusion_status === 'included').map(m => [m.method_id,m]));
    return [...new Set(ids)].filter(id => included.has(id)).slice(0,4).map(id => included.get(id));
  }
  function readableShortlist(methods, fields, filters = {}) {
    const axes = comparisonFields(fields, filters).filter(f => f.id !== 'publication_status');
    const headers = ['Method','Measured modalities',...axes.map(f => f.label),'Publication date','Publication status','Paper','Software / documentation','Profile review','Practical evidence checked on'];
    const records = methods.map(method => {
      const row = {'Method':method.method,'Measured modalities':method.modalities};
      for (const field of axes) {
        let value = displayField(method,field.id,fields);
        if (practicalFields.includes(field.id) && method[field.id+'_notes']) value += '\n'+method[field.id+'_notes'];
        row[field.label] = value;
      }
      return Object.assign(row, {'Publication date':method.publication_date,'Publication status':displayField(method,'publication_status',fields),'Paper':safeUrl(method.publication_url),'Software / documentation':safeUrl(method.resource_url),'Profile review':method.needs_curation === 'yes' ? 'Needs confirmation' : 'Reviewed','Practical evidence checked on':method.operational_checked_on});
    });
    return {headers,records};
  }
  return {parseCsv, values, escapeHtml, safeUrl, csvEscape, serializeCsv, methodMatches, candidateRecord, displayField, comparisonFields, comparisonMethods, readableShortlist};
});
