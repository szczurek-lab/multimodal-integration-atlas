const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../atlas-core.js');
const schema = require('../data/schema.json');
const {headers, records} = C.parseCsv(fs.readFileSync(path.join(__dirname, '../data/integration_methods_library.csv'),'utf8'));
const byId = id => records.find(r => r.method_id === id);
const matches = (id, filters) => C.methodMatches(byId(id),filters,schema.fields);

test('Combines different axes; alternatives within an axis are OR', () => {
  assert.equal(matches('mofa', {axis_correspondence:['paired','unpaired'],axis_supervision:['unsupervised']}), true);
  assert.equal(matches('mofa', {axis_correspondence:['unpaired'],axis_supervision:['unsupervised']}), false);
  assert.equal(matches('mofa', {axis_correspondence:['paired'],axis_supervision:['supervised']}), false);
});
test('Composable building blocks require every chosen block', () => {
  assert.equal(matches('multimil',{methodological_components:['vae','mil']}),true);
  assert.equal(matches('multivi',{methodological_components:['vae','mil']}),false);
  assert.equal(matches('scgcm',{methodological_components:['vae','contrastive']}),true);
});
test('Modality prediction does not imply missing-input tolerance', () => {
  assert.equal(matches('rosie',{integration_effects:['cross-modal-prediction']}),true);
  assert.equal(matches('rosie',{integration_effects:['cross-modal-prediction'],axis_missingness:['modality-level']}),false);
  assert.equal(matches('multivi',{integration_effects:['cross-modal-prediction'],axis_missingness:['modality-level']}),true);
});
test('Unknown properties cannot satisfy positive requirements', () => {
  // Synthetic fixtures keep unknown handling independent of new evidence about real methods.
  for (const value of ['not-assessed', '', undefined]) {
    const method={method_id:'unknown-fixture',inclusion_status:'included',axis_supervision:value,calibration_evidence:value};
    assert.equal(C.methodMatches(method,{axis_supervision:['supervised']},schema.fields),false);
    assert.equal(C.methodMatches(method,{axis_supervision:['not-assessed']},schema.fields),true);
    assert.equal(C.methodMatches(method,{calibration_evidence:['evaluated']},schema.fields),false);
    assert.equal(C.methodMatches(method,{calibration_evidence:['not-assessed']},schema.fields),true);
  }
  assert.equal(C.methodMatches({inclusion_status:'included',axis_supervision:'supervised'}, {axis_supervision:['supervised']},schema.fields),true);
});
test('Pending, contextual and excluded records are never recommendations', () => {
  for (const status of ['pending','contextual','excluded']) assert.equal(C.methodMatches({...byId('mofa'),inclusion_status:status},{},schema.fields),false);
  assert.equal(matches('clue',{curatedOnly:true}),false);
  assert.equal(matches('mofa',{curatedOnly:true}),true);
});
test('Search covers publication titles and measured modalities', () => {
  assert.equal(matches('diablo',{search:'phenotype'}),true);
  assert.equal(matches('rosie',{search:'H&E'}),true);
  assert.equal(matches('rosie',{search:'no-such-method'}),false);
});
test('Multiword searches match all terms across a method profile', () => {
  assert.equal(matches('multivi',{search:'RNA ATAC'}),true);
  assert.equal(matches('multivi',{search:'  atac   rna  '}),true);
  assert.equal(matches('multivi',{search:'RNA impossible-assay'}),false);
  assert.equal(matches('mofa-plus',{search:'MOFA+'}),true);
});
test('CSV preserves quoted, multiline, empty and Unicode fields', () => {
  const columns=['id','note','empty'];const rows=[{id:'μ',note:'First, "quoted"\nSecond line',empty:''}];
  assert.deepEqual(C.parseCsv('\uFEFF'+C.serializeCsv(rows,columns)),{headers:columns,records:rows});
  assert.deepEqual(C.parseCsv(C.serializeCsv(records,headers)).records,records);
  assert.throws(()=>C.parseCsv('id,id\na,b'),/Duplicate/);
  assert.throws(()=>C.parseCsv('id,note\na'),/unexpected/);
  assert.throws(()=>C.parseCsv('id,note\na,"unterminated'),/Unclosed/);
});
test('Suggestions match current headers, use unknowns and require review', () => {
  const r=C.candidateRecord({method:'New Method',citation:'https://doi.org/10.1234/example',axis_correspondence:['paired','unpaired'],methodological_components:['vae','mil']},headers,schema.fields);
  assert.equal(r.inclusion_status,'pending');assert.equal(r.needs_curation,'yes');
  assert.equal(r.axis_model_transparency,'not-assessed');assert.equal(r.method_doi,'10.1234/example');
  assert.equal(r.methodological_components,'vae;mil');assert.equal(r.axis_correspondence,'paired;unpaired');
  const parsed=C.parseCsv(C.serializeCsv([r],headers));assert.deepEqual(parsed.headers,headers);assert.equal(parsed.records[0].method_id,'new-method');
});
test('Untrusted text, links and spreadsheet formulas stay inert', () => {
  assert.equal(C.escapeHtml('<img onerror="x">'), '&lt;img onerror=&quot;x&quot;&gt;');
  assert.equal(C.safeUrl('javascript:alert(1)'), '');assert.equal(C.safeUrl('data:text/html,a'),'');
  assert.equal(C.safeUrl('https://example.org/test'),'https://example.org/test');
  assert.equal(C.parseCsv(C.serializeCsv([{x:'=1+1'}],['x'],true)).records[0].x,"'=1+1");
});
test('Corrected identity, classification and citation regressions', () => {
  assert.equal(matches('dirac',{methodological_components:['deterministic'],curatedOnly:true}),true);
  assert.equal(matches('dirac',{methodological_components:['vae','deterministic']}),false);
  assert.notEqual(byId('mofa').method_doi,byId('mofa-plus').method_doi);
  assert.equal(byId('fgot').method_doi,'10.1016/j.cels.2025.101479');
  assert.equal(byId('scgcm').resource_url,'https://github.com/closmouz/scGCM');
  assert.equal(byId('poe-vae').publication_date,'2025-04');
  assert.equal(byId('cell2location').publication_date,'2022-01');
});
test('Practical criteria combine with the scientific axes and survive shortlist export', () => {
  const filters={axis_correspondence:['paired'],dataset_size:['medium'],software_maturity:['mature'],compute_demand:['moderate'],validation_evidence:['independent']};
  assert.equal(matches('scgpt',filters),true);
  assert.equal(matches('scgpt',{...filters,compute_demand:['limited']}),false);
  const shortlist=records.filter(r=>C.methodMatches(r,filters,schema.fields));
  const exported=C.parseCsv(C.serializeCsv(shortlist,headers)).records;
  assert.deepEqual(exported,shortlist);
  assert.ok(exported.every(r=>r.compute_demand_sources && r.dataset_size_notes && r.operational_checked_on));
});
test('Unestablished practical evidence cannot satisfy a positive filter', () => {
  const practicalValues={
    software_maturity:['mature','developing','early'],
    compute_demand:['limited','moderate','high'],
    dataset_size:['small','medium','large'],
    validation_evidence:['internal','independent','prospective']
  };
  for (const [field, positiveValues] of Object.entries(practicalValues)) {
    for (const value of ['not-assessed', '', undefined]) {
      const method={method_id:'unknown-practical-fixture',inclusion_status:'included',[field]:value};
      assert.equal(C.methodMatches(method,{[field]:positiveValues},schema.fields),false,field);
      assert.equal(C.methodMatches(method,{[field]:['not-assessed']},schema.fields),true,field);
    }
    assert.equal(C.methodMatches({inclusion_status:'included',[field]:positiveValues[0]},{[field]:positiveValues},schema.fields),true,field);
  }
});
test('Trial provenance and a reachable data repository do not overstate readiness', () => {
  assert.equal(matches('mmai',{validation_evidence:['internal']}),true);
  assert.equal(matches('mmai',{validation_evidence:['prospective']}),false);
  assert.equal(byId('medhive').code_availability,'not-found');
  assert.equal(byId('convirt').code_availability,'public-documentation');
  assert.equal(byId('convirt').software_maturity,'not-assessed');
});
test('Different workflow tiers retain their explanatory evidence', () => {
  assert.equal(matches('cellwhisperer',{compute_demand:['limited']}),true);
  assert.equal(matches('cellwhisperer',{compute_demand:['high']}),true);
  assert.match(byId('cellwhisperer').compute_demand_notes,/Full paper pipeline/);
  assert.match(byId('moscot').dataset_size_notes,/unimodal.*not used/);
  const candidate=C.candidateRecord({method:'Pending'},headers,schema.fields);
  for(const f of ['dataset_size','software_maturity','compute_demand','validation_evidence']) assert.equal(candidate[f],'not-assessed');
  assert.equal(candidate.schema_version,schema.version);
});

test('Comparison preserves selection order, caps at four and ignores invalid or excluded records', () => {
  const library=[...records,{method_id:'excluded-example',inclusion_status:'excluded'}];
  const selected=C.comparisonMethods(library,['mofa-plus','missing','mofa-plus','excluded-example','midas','multivi','totalvi','scgpt']);
  assert.deepEqual(selected.map(m=>m.method_id),['mofa-plus','midas','multivi','totalvi']);
  assert.equal(C.comparisonMethods(library,[]).length,0);
});
test('Comparison includes selected additional axes without duplicating standard rows', () => {
  const fields=C.comparisonFields(schema.fields,{software_maturity:['mature'],axis_supervision:['unsupervised'],methodological_components:['vae']});
  const ids=fields.map(f=>f.id);
  assert.equal(new Set(ids).size,ids.length);
  assert.ok(ids.includes('axis_supervision'));
  assert.ok(ids.includes('methodological_components'));
  for(const id of ['dataset_size','software_maturity','compute_demand','validation_evidence'])assert.ok(ids.includes(id));
});
test('Readable export keeps labels, workflow evidence, unknowns and exactly the requested methods', () => {
  const selected=[byId('mofa-plus'),byId('cellwhisperer'),byId('medhive')];
  const table=C.readableShortlist(selected,schema.fields,{axis_supervision:['unsupervised']});
  const parsed=C.parseCsv(C.serializeCsv(table.records,table.headers,true));
  assert.deepEqual(parsed.records.map(r=>r.Method),selected.map(m=>m.method));
  assert.ok(parsed.headers.length < 25);
  assert.equal(new Set(parsed.headers).size,parsed.headers.length);
  assert.equal(parsed.records[0]['Software maturity'].split('\n')[0],'Mature');
  assert.ok(parsed.records[0]['Dataset size'].includes(byId('mofa-plus').dataset_size_notes));
  assert.ok(parsed.records[1]['Compute demand'].includes(byId('cellwhisperer').compute_demand_notes));
  assert.equal(parsed.records[2]['Software maturity'].split('\n')[0],'Not established');
  assert.equal(parsed.records[0].Supervision,'Unsupervised');
  assert.equal(parsed.records[0].Paper,byId('mofa-plus').publication_url);
  assert.ok(!parsed.headers.includes('method_id'));
});
test('Readable export handles empty selections, repeated publication fields and unsafe links or formulas', () => {
  const empty=C.readableShortlist([],schema.fields);assert.deepEqual(empty.records,[]);
  const method={...byId('mofa'),method:'=HYPERLINK("https://example.org")',publication_url:'javascript:alert(1)',resource_url:'data:text/html,test'};
  const table=C.readableShortlist([method],schema.fields,{publication_status:['journal']});
  assert.equal(table.headers.filter(h=>h==='Publication status').length,1);
  const row=C.parseCsv(C.serializeCsv(table.records,table.headers,true)).records[0];
  assert.equal(row.Paper,'');assert.equal(row['Software / documentation'],'');assert.ok(row.Method.startsWith("'="));
});
