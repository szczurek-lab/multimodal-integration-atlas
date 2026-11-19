# Contributing

Contributions should improve scientific accuracy, coverage or usefulness for method selection. Use the website contribution form or the GitHub “Method suggestion” issue template. Proposals remain pending until a curator reviews their evidence.

## Evidence to provide

- Official method name and original method publication. Prefer a verified journal/proceedings version; label preprints. Do not substitute a review article.
- Measured modalities, observational units and how they are linked. Labels, augmentations, multiple patches or protein channels alone do not establish a multimodal integrator.
- Public author software/documentation, when available.
- Supported properties along the current axes, training requirements and source passages or documentation supporting the classification.

The current vocabulary is in `data/schema.json` and described in `docs/schema.md`. Several values can apply when documented. Leave uncertain properties `not-assessed` rather than inferring them from a model family or the manuscript section where a method appears.

## Important distinctions

- Unpaired application may still require paired training.
- Missing-input support differs from imputation, cross-modal prediction and generation.
- Biological/technical separation is not automatically a shared/private modality decomposition.
- Outcome labels belong under supervision, not biological prior knowledge.
- Posterior/evidential uncertainty does not establish calibration.
- Reusable weights, code availability and independent benchmarking are separate claims, each requiring its own evidence.
- Dataset size needs an observation count, unit and workflow stage; pretraining cells, image patches and patients are not interchangeable.
- Compute tiers describe documented hardware examples or recommendations; optional GPU support alone is insufficient.
- Software maturity uses documented packaging, setup, examples, tests and release/check infrastructure. A reachable placeholder or data-only repository is not model code.
- Author-led evaluation, independent-team evaluation and prospective model validation are distinct. Retrospective use of clinical-trial data is not prospective validation.

## Updating records

1. Keep a unique `method_id` and one included method per row in `data/integration_methods_library.csv`.
2. Use controlled values and semicolon-delimited lists. Preserve historical provenance fields.
3. Record original sources, the review date and a rationale. Mark substantive unresolved classifications `needs_curation=yes`, `curation_status=provisional`.
4. Record checked software destinations and dates. Do not label rate limits, access restrictions or transient failures as a confirmed dead link.
5. Keep contextual/excluded records with reasons in `data/contextual_methods.csv`; do not return them as shortlist candidates.
6. Update the classification audit and curation record when decisions change. Do not add private manuscript drafts or unpublished collaborative notes.
7. Maintain a practical profile for every included method in `data/operational-evidence.json`, including unknown properties, dated rationale and primary sources. Update its counts and the curation-page totals; run `python3 scripts/sync_operational.py` to synchronize the browser CSV.
8. Run `python3 scripts/validate_atlas.py` and `node --test tests/atlas-core.test.js`, then preview affected browser flows.

Use a pull request for curator review. Website submissions prepare an issue and CSV candidate; they do not modify the public library directly.
