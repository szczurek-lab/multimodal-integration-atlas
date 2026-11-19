"""Validate the public atlas data and local page links without network access."""
import csv
import json
import re
from collections import Counter
from datetime import date
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
errors = []
schema = json.loads((ROOT / 'data/schema.json').read_text())

def require(condition, message):
    if not condition:
        errors.append(message)

def csv_rows(name):
    with (ROOT / 'data' / name).open(newline='', encoding='utf-8-sig') as handle:
        reader = csv.DictReader(handle)
        require(len(reader.fieldnames) == len(set(reader.fieldnames)), f'{name}: duplicate columns')
        records = list(reader)
        require(all(None not in r and None not in r.values() for r in records), f'{name}: malformed row')
        return records

rows = csv_rows('integration_methods_library.csv')
field_ids = [f['id'] for f in schema['fields']]
require(len(field_ids)==len(set(field_ids)), 'Duplicate controlled field identifiers')
require([f['id'] for f in schema['fields'] if f['group']=='Practical considerations']==['dataset_size','software_maturity','compute_demand','validation_evidence'], 'The figure has exactly four practical axes')
for field in schema['fields']:
    option_values=[o['value'] for o in field['options']]
    require(len(option_values)==len(set(option_values)),f"Duplicate choices in {field['id']}")
archive = csv_rows('contextual_methods.csv')
ids = [r['method_id'] for r in rows]
require(len(set(ids)) == len(ids), 'Method identifiers must be unique')
require(not set(ids) & {r['method_id'] for r in archive}, 'Context records must not appear in the shortlist')
require(all(r['inclusion_status'] != 'included' and r['scope_reason'] for r in archive), 'Context records need scope decisions')
for row in archive:
    for field in ['publication_url','resource_url']:
        value=row.get(field,'')
        require(not value or (urlsplit(value).scheme in ['http','https'] and bool(urlsplit(value).netloc)),f"{row['method_id']}: invalid context {field}")
for row in rows:
    name = row['method_id']
    require(bool(re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', name)), f'{name}: invalid identifier')
    require(row['inclusion_status'] == 'included' and row['schema_version'] == schema['version'], f'{name}: invalid inclusion or schema version')
    component_labels={o['value']:o['label'] for f in schema['fields'] if f['id']=='methodological_components' for o in f['options']}
    require(row['method_family']==';'.join(component_labels.get(v,v) for v in row['methodological_components'].split(';')),f'{name}: building-block display labels are stale')
    require(row['application_tasks']==row['integration_effects'],f'{name}: compatibility output categories are stale')
    for field in schema['fields']:
        values = row.get(field['id'], '').split(';')
        allowed = {o['value'] for o in field['options']}
        require(set(values) <= allowed and len(set(values)) == len(values), f"{name}: invalid {field['id']}={values}")
        require(field['multiple'] or len(values) == 1, f"{name}: {field['id']} accepts one value")
        require('not-assessed' not in values or len(values) == 1, f"{name}: unknown cannot coexist with known {field['id']}")
    for key in ['summary','modalities','training_requirements','publication_title','publication_url','evidence_sources','reviewed_on','curation_notes']:
        require(bool(row.get(key)), f'{name}: missing {key}')
    require(row['needs_curation'] in ['yes','no'], f'{name}: invalid curation flag')
    require(row['curation_status'] == ('provisional' if row['needs_curation'] == 'yes' else 'reviewed'), f'{name}: inconsistent curation status')
    for key in ['reviewed_on','publication_checked_on','resource_checked_on']:
        if row.get(key):
            try:
                require(date.fromisoformat(row[key]) <= date.today(), f'{name}: future {key}')
            except ValueError:
                errors.append(f'{name}: invalid {key}')
    require(bool(re.fullmatch(r'\d{4}(?:-(?:0[1-9]|1[0-2]))?',row['publication_date'])), f'{name}: invalid publication date')
    require(row['publication_date'] <= date.today().strftime('%Y-%m'), f'{name}: future publication')
    doi=row['method_doi']
    require(not doi or bool(re.fullmatch(r'10\.\d{4,9}/\S+',doi)), f'{name}: invalid DOI')
    if 'doi.org/' in row['publication_url']:
        require(row['publication_url'].split('doi.org/',1)[1].lower()==doi.lower(), f'{name}: DOI/URL mismatch')
    urls=[row[k] for k in ['publication_url','resource_url','publication_metadata_source','benchmark_source','pretrained_model_source'] if row.get(k)]+row['evidence_sources'].split(';')
    require(all(urlsplit(u).scheme in ['http','https'] and urlsplit(u).netloc for u in urls), f'{name}: unsafe or malformed source link')
    require(all('docs.google.com/' not in u for u in urls),f'{name}: private manuscript link')
    if row['code_availability'] in ['public-code','public-documentation']:
        require(bool(row['resource_url']) and row['resource_check_status']=='reachable' and bool(row['resource_checked_on']), f'{name}: verified software needs a checked URL')
    if row['independent_benchmark']=='verified':require(bool(row['benchmark_source']), f'{name}: benchmark requires evidence')
    if row['pretrained_model']=='available':require(bool(row['pretrained_model_source']), f'{name}: weights require evidence')

class PageLinks(HTMLParser):
    def __init__(self,path):
        super().__init__(); self.path=path; self.ids=set(); self.links=[]
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if attrs.get('id'):
            require(attrs['id'] not in self.ids,f'{self.path.name}: duplicate element ID {attrs["id"]}')
            self.ids.add(attrs['id'])
        if tag in ['a','script','link','img']:
            self.links.append(attrs.get('href') or attrs.get('src') or '')
pages={}
for path in ROOT.glob('*.html'):
    p=PageLinks(path);p.feed(path.read_text());pages[path.name]=p
for p in pages.values():
    for link in p.links:
        parsed=urlsplit(link)
        if not link or parsed.scheme or parsed.netloc:continue
        target=ROOT/unquote(parsed.path) if parsed.path else p.path
        require(target.exists(),f'{p.path.name}: missing target {link}')
        if parsed.fragment and target.name in pages and parsed.fragment not in ['contribute']:
            require(parsed.fragment in pages[target.name].ids,f'{p.path.name}: missing anchor {link}')

audit=json.loads((ROOT/'data/refresh-audit.json').read_text())
require(audit['included_count']==len(rows) and audit.get('contextual_count',audit['removed_from_shortlist_count'])==len(archive),'Audit counts are stale')
require(audit['baseline_count']+audit['added_count']-audit['removed_from_shortlist_count']==len(rows),'Addition/removal counts do not reconcile')
require(audit['provisional_count']==sum(r['needs_curation']=='yes' for r in rows),'Provisional count is stale')
profiles=json.loads((ROOT/'data/classification-audit.json').read_text())['profiles']
require({p['method_id'] for p in profiles}==set(ids),'Classification audit is incomplete')
current_rows={r['method_id']:r for r in rows}
for profile in profiles:
    for field,value in profile['current_profile'].items():
        require(current_rows[profile['method_id']].get(field)==value,f"{profile['method_id']}: profile record differs for {field}")
coverage=json.loads((ROOT/'data/literature-coverage.json').read_text())
require(len({r['identifier'] for r in coverage['references']})==len(coverage['references']),'Duplicate literature identifiers')
doi_count=sum(r['identifier'].lower().startswith('10.') for r in coverage['references'])
require(coverage['counts']['doi_identifiers']==doi_count,'Literature DOI count is stale')
require(coverage['counts']['additional_non_doi_checks']==len(coverage['references'])-doi_count,'Non-DOI coverage count is stale')
require(coverage['counts']['included_methods']==len(rows) and coverage['counts']['contextual_records']==len(archive),'Literature coverage counts are stale')
context_ids={r['method_id'] for r in archive}
covered=set()
for ref in coverage['references']:
    targets=set(ref['method_ids'])
    require(bool(ref['title']) and bool(ref['reason']),f"Literature source lacks a documented decision: {ref['identifier']}")
    if ref['category']=='included-method':
        require(bool(targets) and targets<=set(ids),f"Missing included method for {ref['identifier']}")
        covered.update(targets)
    elif ref['category']=='contextual-resource':
        require(bool(targets) and targets<=context_ids,f"Missing context record for {ref['identifier']}")
    else:
        require(ref['category'] in {'general-building-block','evaluation-or-theory','review-or-perspective'} and not targets,f"Unresolved literature source: {ref['identifier']}")
require(covered==set(ids),'Literature coverage must account for every included method')
require(coverage['counts']['included_methods_matched']==len(covered),'Matched-method coverage count is stale')
require(coverage['counts']['missing_eligible_methods']==0,'Literature coverage has unresolved eligible methods')
require(coverage['counts']['reference_categories']==dict(Counter(r['category'] for r in coverage['references'])),'Literature category counts are stale')
operational=json.loads((ROOT/'data/operational-evidence.json').read_text())
practical_fields=['dataset_size','software_maturity','compute_demand','validation_evidence']
op_profiles=operational['profiles']
require(len(op_profiles)==len(rows) and {p['method_id'] for p in op_profiles}==set(ids),'Operational profiles must cover every included method exactly once')
require(operational['schema_version']==schema['version'],'Operational schema version is stale')
rows_by_id={r['method_id']:r for r in rows}
for p in op_profiles:
    r=rows_by_id.get(p['method_id'])
    if r is None:continue
    name=p['method_id']
    require(r['operational_checked_on']==p['checked_on'],f'{name}: operational check date differs')
    try:require(date.fromisoformat(p['checked_on'])<=date.today(),f'{name}: future operational check')
    except ValueError:errors.append(f'{name}: invalid operational check date')
    for field in practical_fields:
        a=p[field]
        require(r[field]==';'.join(a['values']),f'{name}: {field} differs from evidence record')
        require(bool(a['note']) and r[field+'_notes']==a['note'],f'{name}: {field} note missing or stale')
        require(bool(a['sources']) and r[field+'_sources']==';'.join(a['sources']),f'{name}: {field} sources missing or stale')
        require(all(urlsplit(u).scheme in ['http','https'] and urlsplit(u).netloc and 'docs.google.com/' not in u for u in a['sources']),f'{name}: unsafe/private operational source')
    examples=p['dataset_size']['examples']
    bands=set()
    for example in examples:
        n=example['count']
        require(isinstance(n,(int,float)) and n>0 and bool(example['unit']) and bool(example['stage']) and bool(example['kind']),f'{name}: incomplete dataset example')
        bands.add('small' if n<1000 else 'medium' if n<100000 else 'large')
        require(example['source'] in p['dataset_size']['sources'],f'{name}: dataset source not recorded')
    require(set(p['dataset_size']['values'])==(bands or {'not-assessed'}),f'{name}: size band unsupported by a recorded observation count')
    independent='independent' in p['validation_evidence']['values']
    require(independent==(r['independent_benchmark']=='verified'),f'{name}: independent evaluation fields disagree')
    if independent:require(len(p['validation_evidence']['sources'])>=2,f'{name}: independent validation needs a separate source')
    if 'prospective' in p['validation_evidence']['values']:
        study=p['validation_evidence'].get('prospective_study',{})
        require(bool(study.get('locked_model')) and bool(study.get('subsequent_accrual')) and study.get('source') in p['validation_evidence']['sources'],f'{name}: prospective evaluation needs model-lock and accrual evidence')
for field in practical_fields:
    require(operational['counts'][field]==dict(Counter(v for p in op_profiles for v in p[field]['values'])),f'{field}: operational counts are stale')
if errors:
    raise SystemExit('\n'.join(errors))
print(f'Validated {len(rows)} included methods, {len(archive)} context records, {len(schema["fields"])} controlled fields and {len(pages)} pages.')
print('Publication status:', dict(Counter(r['publication_status'] for r in rows)))
