# Multimodal Integration Atlas

A curated companion to the multimodal integration review. Choose methods by data regime, model design, learning setup and desired integration effect. Methodological building blocks can overlap; matching profiles are not a performance ranking.

The November 2026 refresh contains 92 included profiles and a separate register of 31 contextual/excluded methods and resources. A full-manuscript follow-up added 13 eligible methods beyond the initial refresh, including methods mentioned only by citation or in Supplementary Methods. Original publications, author software and dated source records support the classifications. Unverified properties remain explicit. See [the curation record](curation.html) for additions, scope decisions, citation repairs and provisional profiles.

## Website

Static HTML, CSS and vanilla JavaScript, served through GitHub Pages. No backend, build process or runtime dependencies. The manuscript is not included in this public repository.

- `data/schema.json`: controlled fields, labels and selection semantics.
- `data/integration_methods_library.csv`: the included method library.
- `data/contextual_methods.csv`: preserved records outside the shortlist.
- `data/operational-evidence.json`: dated practical-axis assessments, dataset examples, software evidence and hardware/validation sources for every included method.
- `data/classification-audit.json` and `data/refresh-audit.json`: profile evidence and migration decisions.
- `atlas-core.js`: CSV, filtering, escaping and candidate records, shared with tests.
- `app.js`: browser controls, method cards, contributions and timeline.
- `index.html`, `timeline.html`, `authors.html`, `curation.html`: public pages.
- `docs/schema.md`: field definitions and legacy compatibility notes.
- `docs/review-alignment.md`: correspondence between review concepts and all atlas fields.

## Selection

Different fields are combined with AND; choices within one field are alternatives (OR). Selected methodological building blocks must all be present. Unknown values do not satisfy a positive capability requirement. Profiles cover documented workflows, whose training conditions are explained on the cards.

Search matches all entered words across a profile. Search links and navigation retain filters and comparison selections. Contextual method names show their scope explanation. The shortlist download exports only matching methods. The full library remains separately downloadable. Preprints and proceedings have explicit publication statuses; timeline dates use the verified online date when available.

Select **Compare** on up to four method cards to open a compact comparison of their main axes and practical evidence. Selected additional filters are included as comparison rows. Selection stays available while searching for other methods and is retained in the copied search link. A selected method outside the current filters is explicitly labelled. Evidence notes expand within the comparison, and full profiles open separately.

**Download shortlist** exports all matching methods with readable column headings, category labels, paper/software links and the practical evidence notes that preserve units and workflow context. **Full evidence CSV** retains all source columns. The comparison dialog offers the same two exports for only the selected methods.

The figure’s last row is selectable under **Practical considerations**: dataset size, software maturity, compute demand and validation evidence. Each method’s expanded practical profile shows its rationale and sources. Dataset size describes a reported example with an explicit unit and workflow; hardware describes a documented configuration, not a universal minimum. Pretraining and routine use can differ. See the [public rubric and coverage](curation.html#practical). Unknown evidence never satisfies a positive filter, and these grades do not certify software installation or clinical readiness.

To revise practical classifications, edit `data/operational-evidence.json`, update its counts, then run `python3 scripts/sync_operational.py` before validation. This keeps CSV filters, exports and evidence notes consistent. The four fields are curated from sources; community suggestions leave them unknown until reviewed.

## Contributions

The contribution form opens a prefilled issue in the lab repository and provides a candidate CSV with headers. An email fallback is also available. Suggestions are pending curator review, never automatically included. No message or issue is submitted merely by opening the form. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Preview and validation

Run from this directory:

```sh
python3 scripts/validate_atlas.py
node --test tests/atlas-core.test.js
python3 -m http.server 8000
```

Open <http://localhost:8000>. Fetching the CSV requires a local web server rather than opening the HTML as a file. Validation checks controlled values, identity, provenance, dates and local links. Tests cover meaningful selection distinctions, CSV handling and pending suggestions. GitHub Pages runs both checks before deployment.

## Research use

Cite each original method paper when using the corresponding method. Cite the associated review once released. Link reachability does not establish software reproducibility, and these classifications do not replace reading method-specific requirements.
