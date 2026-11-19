'use strict';

const DATA_URL = 'data/integration_methods_library.csv';
const REPO_URL = 'https://github.com/szczurek-lab/multimodal-integration-atlas';
const ISSUE_LABELS = 'method suggestion,curation';
const CURATOR_TO = [['k.gogolewski', 'mimuw.edu.pl']];
const CURATOR_CC = [['em.szczurek', 'uw.edu.pl'], ['m.lazecka', 'uw.edu.pl'], ['ko373086', 'students.mimuw.edu.pl']];
const C = AtlasCore;
const $ = id => document.getElementById(id);
const esc = C.escapeHtml;
const practicalAxes = ['dataset_size','software_maturity','compute_demand','validation_evidence'];
let schema, methods = [], contextual = [], headers = [], filtered = [], resultLimit = 6;
let comparisonIds = [];
const labels = new Map();

function optionLabel(field, value) {
  return schema.fields.find(f => f.id === field)?.options.find(o => o.value === value)?.label || value || 'Not assessed';
}
function fieldValue(method, id) {
  return C.displayField(method, id, schema.fields);
}
function link(label, url, className = 'method-link') {
  const safe = C.safeUrl(url);
  return safe ? `<a class="${className}" href="${esc(safe)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>` : '';
}
function formatDate(value) {
  if (/^\d{4}$/.test(value || '')) return value;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value || '')) return '';
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en', {month:'short', year:'numeric'});
}
function getFilters() {
  const filters = {search:$('searchInput')?.value || '', curatedOnly:$('hideCuration')?.checked || false};
  for (const f of schema.fields) filters[f.id] = [...document.querySelectorAll(`[data-filter="${f.id}"]:checked`)].map(e => e.value);
  return filters;
}
function selectMethods(filters) {
  return methods.filter(m => C.methodMatches(m, filters, schema.fields)).sort((a,b) => a.method.localeCompare(b.method));
}
function createFilters() {
  const narrow = matchMedia('(max-width: 980px)');
  const arrangeFilters = () => {$('filtersDisclosure').open = !narrow.matches;};
  arrangeFilters(); narrow.addEventListener('change', arrangeFilters);
  const groups = [...new Set(schema.fields.map(f => f.group))];
  $('filterGroups').innerHTML = groups.map(group => {
    const practical = group === 'Practical considerations';
    const controls = schema.fields.filter(f => f.group === group).map(f => `
      <details class="filter-choice">
        <summary><span>${esc(f.label)}</span><span id="selected-${f.id}" class="selection-label">Any</span></summary>
        <p class="field-help" id="help-${f.id}">${esc(f.help)}</p>
        <div class="choice-list" role="group" aria-label="${esc(f.label)}" aria-describedby="help-${f.id}">
          ${f.options.map(o => `<label><input type="checkbox" data-filter="${f.id}" value="${esc(o.value)}" /><span>${esc(o.label)}</span><span class="choice-count" data-count-field="${f.id}" data-count-value="${esc(o.value)}"></span></label>`).join('')}
        </div>
      </details>`).join('');
    return practical ? `<details class="practical-filters"><summary>${esc(group)}</summary><p class="field-help">The figure’s four practical axes. <a href="curation.html#practical">Read the classification rules</a>.</p>${controls}</details>` : `<fieldset class="filter-group"><legend>${esc(group)}</legend>${controls}</fieldset>`;
  }).join('');
  const params = new URLSearchParams(location.search);
  comparisonIds = C.comparisonMethods(methods, params.getAll('compare')).map(m => m.method_id);
  if (params.has('q')) $('searchInput').value = params.get('q');
  $('hideCuration').checked = params.get('reviewed') === '1';
  document.querySelectorAll('[data-filter]').forEach(input => {
    input.checked = params.getAll(input.dataset.filter).includes(input.value);
    if (input.checked) {
      input.closest('details').open = true;
      const practical = input.closest('.practical-filters');
      if (practical) practical.open = true;
    }
    input.addEventListener('change', () => renderResults(true));
  });
}
function saveProfile(filters) {
  const url = new URL(location.href);
  url.search = '';
  if (filters.search.trim()) url.searchParams.set('q', filters.search.trim());
  if (filters.curatedOnly) url.searchParams.set('reviewed', '1');
  for (const field of schema.fields) for (const value of filters[field.id]) url.searchParams.append(field.id, value);
  for (const id of comparisonIds) url.searchParams.append('compare',id);
  history.replaceState(null, '', url.pathname + url.search + url.hash);
  preserveNavigation();
}
function preserveNavigation() {
  document.querySelectorAll('a[href]:not([target])').forEach(anchor => {
    const url = new URL(anchor.href, location.href);
    if (url.origin !== location.origin || !/\/(index|timeline|authors|curation)\.html$/.test(url.pathname)) return;
    url.search = location.search;
    anchor.href = url.href;
  });
}
function updateFilterCounts(filters) {
  for (const f of schema.fields) {
    const relaxed = {...filters, [f.id]:[]};
    const candidates = selectMethods(relaxed);
    const selected = filters[f.id];
    $(`selected-${f.id}`).textContent = selected.length ? `${selected.length} selected` : 'Any';
    for (const count of document.querySelectorAll(`[data-count-field="${f.id}"]`)) {
      const v = count.dataset.countValue;
      const proposed = f.id === 'methodological_components' ? [...new Set([...selected,v])] : [v];
      count.textContent = candidates.filter(m => C.methodMatches(m,{...relaxed,[f.id]:proposed},schema.fields)).length;
    }
  }
}
function renderActiveFilters(filters) {
  const items = [];
  if (filters.search) items.push({label:`Search: ${filters.search}`,clear:() => {$('searchInput').value='';}});
  for (const f of schema.fields) for (const v of filters[f.id]) items.push({label:`${f.label}: ${optionLabel(f.id,v)}`,clear:() => {
    document.querySelectorAll(`[data-filter="${f.id}"]`).forEach(e => {if(e.value===v)e.checked=false;});
  }});
  if (filters.curatedOnly) items.push({label:'Reviewed profiles only',clear:() => {$('hideCuration').checked=false;}});
  $('activeFilters').replaceChildren();
  for (const item of items) {
    const button=document.createElement('button');button.type='button';button.className='chip removable-chip';button.textContent=item.label+' ×';
    button.setAttribute('aria-label','Remove '+item.label);button.onclick=()=>{item.clear();renderResults(true);};$('activeFilters').appendChild(button);
  }
}
function axisBlock(method, id) {
  return `<div class="axis"><span>${esc(labels.get(id))}</span><strong>${esc(fieldValue(method,id))}</strong></div>`;
}
function practicalEvidence(method, id) {
  const sources = C.values(method[id+'_sources']).filter(C.safeUrl);
  return `<section class="practical-evidence"><h5>${esc(labels.get(id))}</h5><strong>${esc(fieldValue(method,id))}</strong><p>${esc(method[id+'_notes'] || 'No supporting detail established.')}</p><div class="evidence-links">${sources.map((u,i)=>link(`Source ${i+1}`,u)).join(' ')}</div></section>`;
}
function renderMethod(m) {
  const status = m.needs_curation === 'yes' ? 'Profile needs confirmation' : 'Profile reviewed';
  const publication = [formatDate(m.publication_date),m.publisher,optionLabel('publication_status',m.publication_status)].filter(Boolean).join(' · ');
  const coreFields=['axis_correspondence','axis_missingness','axis_method_scope','integration_effects'];
  const remaining=schema.fields.filter(f => !coreFields.includes(f.id) && !practicalAxes.includes(f.id) && f.id!=='methodological_components');
  const sources=C.values(m.evidence_sources).filter(C.safeUrl);
  return `<article class="method-card" id="method-${esc(m.method_id)}">
    <div class="method-topline"><div><h3>${esc(m.method)}</h3><div class="component-tags">${C.values(m.methodological_components).map(v=>`<span>${esc(optionLabel('methodological_components',v))}</span>`).join('')}</div></div>
      <div class="method-actions"><span class="status ${m.needs_curation==='yes'?'needs-curation':'curated'}">${status}</span><label class="compare-toggle"><input type="checkbox" data-compare="${esc(m.method_id)}" aria-label="Compare ${esc(m.method)}" ${comparisonIds.includes(m.method_id)?'checked':''} /><span>Compare</span></label></div></div>
    <p class="method-modalities">${esc(m.modalities)}</p>
    <p class="method-summary">${esc(m.summary)}</p>
    <div class="publication-meta">${esc(publication)}</div>
    <div class="method-links">${link(m.method_doi ? `Paper · ${m.method_doi}`:'Original paper',m.publication_url)}
      ${link('Software / documentation',m.resource_url)}${m.preprint_doi?link('Full preprint','https://doi.org/'+m.preprint_doi):''}</div>
    <div class="axis-grid compact-axes">${coreFields.map(id=>axisBlock(m,id)).join('')}</div>
    <details class="method-details"><summary>All axes, requirements and evidence</summary>
      <h4>Practical profile</h4>
      <p class="field-help">Reported examples may cover different workflow stages. A filter match does not establish that all properties were demonstrated together. <a href="curation.html#practical">Classification rules</a> · checked ${esc(m.operational_checked_on || 'date not recorded')}.</p>
      <div class="practical-evidence-grid">${practicalAxes.map(id=>practicalEvidence(m,id)).join('')}</div>
      <h4>Other axes and supporting evidence</h4>
      <div class="axis-grid">${remaining.map(f=>axisBlock(m,f.id)).join('')}</div>
      <h4>Training requirements</h4><p>${esc(m.training_requirements)}</p>
      ${m.curation_notes!==m.training_requirements?`<h4>Interpretation</h4><p>${esc(m.curation_notes)}</p>`:''}
      <p><strong>Uncertainty fitting:</strong> ${esc(m.inference_method || 'Not assessed')}. Posterior or evidential uncertainty does not establish calibrated predictions.</p>
      <h4>Source record</h4><p>${sources.map((u,i)=>link(i===0?'Primary publication':`Supporting source ${i}`,u)).join(' ')}</p>
      ${m.benchmark_source?`<p>${link('Independent evaluation',m.benchmark_source)}</p>`:''}
      ${m.pretrained_model_source?`<p>${link('Pretrained-model availability',m.pretrained_model_source)}</p>`:''}
      <p class="field-help">Profile reviewed ${esc(m.reviewed_on || 'date not recorded')}. Software link: ${esc(m.resource_check_status || 'not verified')}${m.resource_checked_on?' ('+esc(m.resource_checked_on)+')':''}${m.repository_archived==='yes'?'; repository archived':''}. Link availability does not verify installation or reproducibility.</p>
    </details>
  </article>`;
}
function renderResults(reset = false) {
  if (reset) resultLimit=6;
  const filters=getFilters();filtered=selectMethods(filters);
  saveProfile(filters);updateFilterCounts(filters);renderActiveFilters(filters);
  const shown=filtered.slice(0,resultLimit);
  $('resultsMeta').textContent=`${filtered.length} matching ${filtered.length===1?'method':'methods'} · ${shown.length} shown`;
  $('showMatches').textContent=`Show ${filtered.length} matching ${filtered.length===1?'method':'methods'}`;
  $('resultsList').innerHTML=shown.length?shown.map(renderMethod).join(''):'<div class="empty-state"><h3>No documented match</h3><p>Try removing a filter. An unassessed property does not count as a confirmed match.</p></div>';
  const terms=filters.search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const contextMatches=terms.length?contextual.filter(m=>terms.every(t=>[m.method,m.method_id].join(' ').toLowerCase().includes(t))):[];
  $('contextMatches').innerHTML=contextMatches.length?`<h3>Related records outside the shortlist</h3>${contextMatches.map(m=>`<p><strong>${esc(m.method)}</strong> ${esc(m.scope_reason)}</p>`).join('')}<a href="curation.html${esc(location.search)}">Read the scope decisions</a>`:'';
  $('contextMatches').hidden=!contextMatches.length;
  $('showMoreResults').hidden=resultLimit>=filtered.length;
  $('showAllResults').hidden=resultLimit>=filtered.length;
  $('collapseResults').hidden=resultLimit<=6;
  $('downloadCsv').disabled=!filtered.length;
  $('downloadEvidence').disabled=!filtered.length;
  updateComparison();
}
function downloadRecords(records, fullEvidence, filename) {
  const table = fullEvidence ? {records,headers} : C.readableShortlist(records,schema.fields,getFilters());
  const blob=new Blob(['\uFEFF'+C.serializeCsv(table.records,table.headers,true)],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function comparisonMethods() {
  return C.comparisonMethods(methods,comparisonIds);
}
function updateComparison() {
  const selected = comparisonMethods();
  const outside = selected.filter(m => !filtered.some(f => f.method_id === m.method_id)).length;
  $('comparisonTray').hidden = !selected.length;
  document.body.classList.toggle('has-comparison',Boolean(selected.length));
  $('comparisonStatus').textContent = `${selected.length} of 4 selected${selected.length===1?' · Choose one more to compare':''}${outside?` · ${outside} outside current filters`:''}`;
  $('comparisonChips').innerHTML = selected.map(m=>`<button type="button" class="chip removable-chip" data-remove-comparison="${esc(m.method_id)}" aria-label="Remove ${esc(m.method)} from comparison" title="${esc(m.method)}">${esc(m.method)} ×</button>`).join('');
  $('openComparison').disabled = selected.length < 2;
  $('openComparison').textContent = `Compare ${selected.length} ${selected.length===1?'method':'methods'}`;
  document.querySelectorAll('[data-compare]').forEach(input=>{
    input.checked = comparisonIds.includes(input.dataset.compare);
    input.disabled = selected.length >= 4 && !input.checked;
  });
  if ($('comparisonDialog').open) {
    if (selected.length) renderComparison();
    else {$('comparisonDialog').close();$('searchInput').focus();}
  }
}
function changeComparison(id, checked) {
  comparisonIds = checked ? C.comparisonMethods(methods,[...comparisonIds,id]).map(m=>m.method_id) : comparisonIds.filter(value=>value!==id);
  saveProfile(getFilters());
  updateComparison();
}
function comparisonValue(method, field) {
  let content = `<span>${esc(fieldValue(method,field.id))}</span>`;
  if (practicalAxes.includes(field.id)) {
    const sources = C.values(method[field.id+'_sources']).filter(C.safeUrl);
    content += `<details class="comparison-evidence"><summary aria-label="${esc(field.label)} evidence for ${esc(method.method)}">Evidence notes</summary><p>${esc(method[field.id+'_notes'] || 'Supporting detail remains unestablished.')}</p><div class="evidence-links">${sources.map(u=>link(new URL(u).hostname.replace(/^www\./,''),u)).join(' ')}</div><p class="field-help">Checked ${esc(method.operational_checked_on || 'date not recorded')}</p></details>`;
  }
  return content;
}
function renderComparison() {
  const selected = comparisonMethods();
  const fields = C.comparisonFields(schema.fields,getFilters());
  $('comparisonTitle').textContent = `Compare ${selected.length} ${selected.length===1?'method':'methods'}`;
  $('comparisonTable').innerHTML = `<table class="comparison-table"><caption class="visually-hidden">Selected multimodal integration methods, with key axes and practical evidence</caption><thead><tr><th scope="col">Method</th>${selected.map(m=>{
    const profile=new URL('index.html',location.href);profile.searchParams.set('q',m.method_id);profile.hash='atlas';
    const matches=filtered.some(f=>f.method_id===m.method_id);
    return `<th scope="col"><h3>${esc(m.method)}</h3><span class="comparison-review">${m.needs_curation==='yes'?'Profile needs confirmation':'Profile reviewed'}</span>${!matches?'<span class="comparison-outside">Outside current filters</span>':''}<div class="comparison-links">${link('Paper',m.publication_url)}${link('Software',m.resource_url)}${link('Full profile',profile.href)}</div><button class="link-button comparison-remove" type="button" data-remove-comparison="${esc(m.method_id)}" aria-label="Remove ${esc(m.method)} from comparison">Remove</button></th>`;
  }).join('')}</tr></thead><tbody><tr><th scope="row">Measured modalities</th>${selected.map(m=>`<td>${esc(m.modalities)}</td>`).join('')}</tr>${fields.map(f=>`<tr><th scope="row">${esc(f.label)}</th>${selected.map(m=>`<td>${comparisonValue(m,f)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function renderAxesGuide() {
  if (!$('axisDefinitions')) return;
  $('axisDefinitions').innerHTML=schema.fields.map(f=>`<article><h3>${esc(f.label)}</h3><p>${esc(f.help)}</p></article>`).join('');
}
function createSuggestionFields() {
  if (!$('suggestAxisFields')) return;
  $('suggestAxisFields').innerHTML=schema.fields.filter(f=>![...practicalAxes,'code_availability','independent_benchmark','pretrained_model','calibration_evidence'].includes(f.id)).map(f=>`
    <details class="suggest-axis"><summary>${esc(f.label)}</summary><p class="field-help">${esc(f.help)}</p>
      <div class="choice-list">${f.options.filter(o=>o.value!=='not-assessed').map(o=>`<label><input type="${f.multiple?'checkbox':'radio'}" name="suggest-${f.id}" data-suggest="${f.id}" value="${esc(o.value)}"/><span>${esc(o.label)}</span></label>`).join('')}</div>
    </details>`).join('');
}
function suggestionInput() {
  const input={method:$('suggestMethod')?.value.trim(),citation:$('suggestCitation')?.value.trim(),resource_url:$('suggestResourceUrl')?.value.trim(),modalities:$('suggestModalities')?.value.trim(),summary:$('suggestSummary')?.value.trim(),rationale:$('suggestRationale')?.value.trim()};
  for (const f of schema.fields) input[f.id]=[...document.querySelectorAll(`[data-suggest="${f.id}"]:checked`)].map(e=>e.value);
  return input;
}
function suggestionBody(input, record) {
  return ['## Method suggestion','',`- Method: ${input.method || 'not provided'}`,`- Original publication: ${input.citation || 'not provided'}`,`- Software: ${input.resource_url || 'not provided'}`,`- Measured modalities and units: ${input.modalities || 'not provided'}`,
    ...schema.fields.filter(f=>input[f.id]?.length).map(f=>`- ${f.label}: ${fieldValue(record,f.id)}`),'','## Method summary','',input.summary || 'Not provided.','','## Evidence and scope rationale','',input.rationale || 'Not provided.'].join('\n');
}
function updateSuggestionOutput() {
  if (!$('suggestCsvRow')) return;
  const input=suggestionInput(),record=C.candidateRecord(input,headers,schema.fields),body=suggestionBody(input,record);
  $('suggestCsvRow').value=C.serializeCsv([record],headers);
  $('openIssueLink').href=`${REPO_URL}/issues/new?${new URLSearchParams({title:`Method suggestion: ${input.method || 'new method'}`,body,labels:ISSUE_LABELS})}`;
}
function emailCurators() {
  const input=suggestionInput(),record=C.candidateRecord(input,headers,schema.fields);
  const join=list=>list.map(([a,b])=>`${a}@${b}`).join(',');
  const params=new URLSearchParams({cc:join(CURATOR_CC),subject:`Method suggestion: ${input.method || 'new method'}`,body:suggestionBody(input,record).replace(/```csv\n|\n```/g,'')});
  location.href=`mailto:${join(CURATOR_TO)}?${params.toString().replace(/\+/g,'%20')}`;
}
async function copyText(value, success) {
  try {await navigator.clipboard.writeText(value);$('actionStatus').textContent=success;}
  catch {$('actionStatus').textContent='Copy was unavailable. Select the text and copy it manually.';}
}
function attachEvents() {
  if ($('atlas')) {
    $('searchInput').oninput=()=>renderResults(true);$('hideCuration').onchange=()=>renderResults(true);
    $('showMatches').onclick=()=>{$('filtersDisclosure').open=false;$('resultsMeta').scrollIntoView({block:'start'});$('resultsMeta').focus({preventScroll:true});};
    $('clearFilters').onclick=()=>{document.querySelectorAll('[data-filter]').forEach(e=>e.checked=false);$('searchInput').value='';$('hideCuration').checked=false;renderResults(true);};
    $('showMoreResults').onclick=()=>{resultLimit+=10;renderResults();};$('showAllResults').onclick=()=>{resultLimit=methods.length;renderResults();};$('collapseResults').onclick=()=>renderResults(true);
    $('downloadCsv').onclick=()=>downloadRecords(filtered,false,'multimodal-atlas-shortlist.csv');
    $('downloadEvidence').onclick=()=>downloadRecords(filtered,true,'multimodal-atlas-shortlist-full-evidence.csv');
    $('copyProfile').onclick=()=>copyText(location.href,'Search profile link copied.');
    $('resultsList').addEventListener('change',event=>{const input=event.target.closest('[data-compare]');if(input)changeComparison(input.dataset.compare,input.checked);});
    const removeComparison=event=>{
      const button=event.target.closest('[data-remove-comparison]');
      if (!button) return;
      changeComparison(button.dataset.removeComparison,false);
      if ($('comparisonDialog').open) $('closeComparison').focus();
      else if (comparisonIds.length >= 2) $('openComparison').focus();
      else $('searchInput').focus();
    };
    $('comparisonChips').addEventListener('click',removeComparison);
    $('comparisonTable').addEventListener('click',removeComparison);
    $('clearComparison').onclick=()=>{comparisonIds=[];saveProfile(getFilters());updateComparison();$('searchInput').focus();};
    $('openComparison').onclick=()=>{renderComparison();$('comparisonDialog').showModal();};
    $('closeComparison').onclick=()=>$('comparisonDialog').close();
    $('comparisonDialog').addEventListener('close',()=>{if($('openComparison').disabled)$('searchInput').focus();});
    $('downloadComparison').onclick=()=>downloadRecords(comparisonMethods(),false,'multimodal-atlas-comparison.csv');
    $('downloadComparisonEvidence').onclick=()=>downloadRecords(comparisonMethods(),true,'multimodal-atlas-comparison-full-evidence.csv');
  }
  const dialog=$('suggestDialog');
  if (dialog) {
    document.querySelectorAll('.open-suggest-dialog').forEach(b=>b.onclick=()=>{updateSuggestionOutput();dialog.showModal();});
    $('closeSuggestDialog').onclick=()=>dialog.close();
    document.querySelectorAll('#suggestDialog input, #suggestDialog textarea:not([readonly])').forEach(e=>e.addEventListener('input',updateSuggestionOutput));
    $('copyCsvRow').onclick=async()=>{try{await navigator.clipboard.writeText($('suggestCsvRow').value);$('suggestStatus').textContent='Candidate CSV copied, including column headers.';}catch{$('suggestCsvRow').select();$('suggestStatus').textContent='Select and copy the candidate CSV manually.';}};
    $('emailCuratorsLink').onclick=emailCurators;
    if (location.hash==='#contribute'){updateSuggestionOutput();dialog.showModal();history.replaceState(null,'',location.pathname+location.search);}
  }
  if ($('axesDialog')){$('openAxesDialog').onclick=()=>$('axesDialog').showModal();$('closeAxesDialog').onclick=()=>$('axesDialog').close();}
}
function renderTimeline() {
  if (!$('timelineList')) return;
  const groups=new Map();
  const dated=methods.filter(m=>/^\d{4}(-\d{2})?$/.test(m.publication_date)).sort((a,b)=>b.publication_date.localeCompare(a.publication_date)||a.method.localeCompare(b.method));
  for (const m of dated){const year=m.publication_date.slice(0,4);if(!groups.has(year))groups.set(year,[]);groups.get(year).push(m);}
  $('timelineList').innerHTML=[...groups].map(([year,list])=>`<article class="timeline-year"><div class="timeline-year-head"><strong>${year}</strong><span>${list.length} methods</span></div><div class="timeline-methods">${list.map(m=>`<div class="timeline-entry"><div>${link(m.method,m.publication_url)}</div><span>${esc(formatDate(m.publication_date))} · ${esc(optionLabel('publication_status',m.publication_status))}</span><p>${esc(m.publication_title || '')}</p></div>`).join('')}</div></article>`).join('');
  const missing=methods.length-dated.length;if(missing)$('timelineList').insertAdjacentHTML('beforeend',`<p>${missing} entries have no verified publication date and are omitted from the timeline.</p>`);
}
async function init() {
  const responses=await Promise.all([fetch('data/schema.json',{cache:'no-cache'}),fetch(DATA_URL,{cache:'no-cache'}),fetch('data/contextual_methods.csv',{cache:'no-cache'})]);
  if(responses.some(r=>!r.ok))throw new Error('The library could not be downloaded.');
  schema=await responses[0].json();const parsed=C.parseCsv(await responses[1].text());headers=parsed.headers;
  contextual=C.parseCsv(await responses[2].text()).records;
  methods=parsed.records.filter(m=>m.inclusion_status==='included');
  if(new Set(methods.map(m=>m.method_id)).size!==methods.length)throw new Error('Duplicate method identifiers in the library.');
  schema.fields.forEach(f=>labels.set(f.id,f.label));
  if($('methodCount'))$('methodCount').textContent=methods.length;
  if($('libraryUpdated'))$('libraryUpdated').textContent=`Taxonomy and sources reviewed ${schema.updated_on}`;
  if($('atlas'))createFilters();
  renderAxesGuide();createSuggestionFields();attachEvents();renderTimeline();updateSuggestionOutput();
  if($('atlas')){renderResults();document.querySelectorAll('[data-needs-library]').forEach(e=>e.disabled=false);}
  preserveNavigation();
}
init().catch(error=>{
  const target=$('resultsList')||$('timelineList');
  if(target)target.innerHTML=`<div class="empty-state" role="alert"><h3>Could not load the atlas</h3><p>${esc(error.message)}</p><p>Reload the page, or download the <a href="${DATA_URL}">method library</a>.</p></div>`;
  if($('resultsMeta'))$('resultsMeta').textContent='Library unavailable';
});
