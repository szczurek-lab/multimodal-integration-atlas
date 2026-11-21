# Method library schema, version 2.1

`data/schema.json` is the authoritative vocabulary for the browser, contribution form and validation. Each included method occupies one row in `data/integration_methods_library.csv`. Cells with several controlled values use semicolons. Unknown properties use `not-assessed`, never a guessed negative value.

Filters combine fields with AND and choices within a field with OR. The building-block filter instead requires every selected descriptor. A method-level profile can cover several workflows; `training_requirements` and `curation_notes` describe the conditions. A match is not a guarantee that every property is available simultaneously in every workflow.

## Controlled fields

| Column | Label and meaning | Allowed values |
| --- | --- | --- |
| `primary_data_regime` | **Primary data setting.** Documented application settings; consult the method card for the actual assays and observational units. Multiple values allowed. | `single-cell-omics`, `sample-omics`, `spatial-assays`, `image-omics`, `image-text`, `image-clinical`, `omics-text`, `perturbation-readouts`, `genotype-transcriptome`, `not-assessed` |
| `axis_correspondence` | **Correspondence.** Paired measurements refer to the same cells, samples or patients. Partial pairing provides these matches for a subset of observations or modality combinations. Weak linkage connects datasets through shared features or biological anchors. Check the training requirements for each workflow. Multiple values allowed. | `paired`, `partially-paired`, `unpaired`, `weak-linkage`, `not-assessed` |
| `axis_missingness` | **Missingness.** Supported input patterns, not an ability to generate a missing modality. Modality-level support does not establish entry-level support or validity under arbitrary missingness mechanisms. Multiple values allowed. | `fully-observed`, `entry-level`, `modality-level`, `not-assessed` |
| `axis_granularity` | **Observational granularity.** Single-level: feature vectors for units. Multi-level: sets or lower-level observations linked to a sample, patient or region. A tensor or spatial coordinate alone does not establish multi-level modelling. Multiple values allowed. | `single-level`, `multi-level`, `not-assessed` |
| `axis_model_transparency` | **Model transparency.** Select the form of inspection you need. Explicit likelihoods, interpretable loadings and post-hoc attribution describe different properties and may coexist. Multiple values allowed. | `explicit-mapping`, `explicit-likelihood`, `structured-neural`, `post-hoc`, `black-box`, `not-assessed` |
| `axis_modality_decomposition` | **Modality decomposition.** How shared and modality-specific variation is represented. A structured decoder or biological/technical split is not automatically a shared/private decomposition. Multiple values allowed. | `shared-only`, `shared-and-specific`, `partially-shared`, `not-applicable`, `not-assessed` |
| `axis_prior_knowledge` | **Prior biological knowledge.** External biological information used by the model. Outcome labels and neighbours inferred from the same data are not automatically biological prior knowledge. Multiple values allowed. | `none`, `pathways`, `gene-networks`, `feature-links`, `spatial`, `temporal`, `biological-model`, `not-assessed` |
| `axis_method_scope` | **Method scope.** General-purpose representations are reusable across questions; domain-specific methods specialize a biological setting; task-specific models directly estimate a predefined quantity. One value only. | `general-purpose`, `domain-specific`, `task-specific`, `not-assessed` |
| `axis_supervision` | **Supervision.** Source and resolution of training targets. Pretraining and downstream adaptation may use different supervision; the method notes specify the stage. Multiple values allowed. | `unsupervised`, `self-supervised`, `semi-supervised`, `supervised`, `weakly-supervised`, `not-assessed` |
| `integration_effects` | **Integration effect.** Directly supported outputs. Representation learning and structure discovery share a category. Imputation, cross-modal prediction and generation have separate choices. Uncertainty specification, target and calibration are recorded below. Multiple values allowed. | `discovery`, `alignment`, `imputation`, `cross-modal-prediction`, `generation`, `spatial-mapping`, `temporal-mapping`, `endpoint-prediction`, `not-assessed` |
| `uncertainty_type` | **Uncertainty specification.** Form of uncertainty returned by a method. Read the target alongside it and use Calibration evidence to check whether prediction calibration has been evaluated. Multiple values allowed. | `model-based`, `evidential`, `post-hoc`, `not-reported`, `not-assessed` |
| `uncertainty_target` | **Uncertainty target.** Quantity to which uncertainty refers. This field is separate from the posterior approximation used for fitting. Multiple values allowed. | `latent-variables`, `parameters`, `missing-measurements`, `predictions`, `modality-evidence`, `not-assessed` |
| `calibration_evidence` | **Calibration evidence.** Evidence of held-out calibration is recorded separately from uncertainty output. Not assessed is not a negative result. One value only. | `evaluated`, `not-assessed` |
| `dataset_size` | **Dataset size.** Reported example size, with observation unit and workflow in each card. Atlas bands: <1,000; 1,000–99,999; ≥100,000. Includes labelled demos, simulations and pretraining; these are not minimum data requirements or capacity limits. Multiple values allowed. | `small`, `medium`, `large`, `not-assessed` |
| `software_maturity` | **Software maturity.** Evidence of reusable software: early research code; developing documented setup/use; mature package with documentation, tests and releases or registry checks. Does not certify installation, maintenance or scientific validity. One value only. | `early`, `developing`, `mature`, `not-assessed` |
| `compute_demand` | **Compute demand.** Hardware used or recommended for a documented example: limited CPU/ordinary computer; moderate single GPU/workstation; high HPC or large memory. Read workflow and memory details: this is not a minimum requirement or runtime ranking. Multiple values allowed. | `limited`, `moderate`, `high`, `not-assessed` |
| `validation_evidence` | **Validation evidence.** Internal: author-led evaluation. Independent: a separate team actually evaluated the method. Prospective: a locked model tested on subsequently accrued observations/outcomes. Retrospective use of clinical-trial data is not prospective validation. Multiple values allowed. | `internal`, `independent`, `prospective`, `not-assessed` |
| `methodological_components` | **Methodological building blocks.** The six building blocks describe model construction and combine within a method. Foundation models contribute pretrained representations. Set representation includes aggregation and multiple instance learning. Selecting several blocks requires all of them. Multiple values allowed. | `deterministic`, `probabilistic`, `vae`, `contrastive`, `foundation-pretraining`, `mil`, `not-assessed` |
| `publication_status` | **Publication status.** The original method publication, using the journal or proceedings version when verified. A retained preprint is labelled explicitly. One value only. | `journal`, `conference`, `preprint`, `not-verified`, `not-assessed` |
| `code_availability` | **Software availability.** A reachable repository is not a guarantee of installation, maintenance or reproducibility. Check date and destination are recorded in each card. One value only. | `public-code`, `public-documentation`, `not-verified`, `not-found`, `not-assessed` |
| `independent_benchmark` | **Independent benchmarking.** Requires a separate evaluation source; comparisons in the method authors’ own paper do not establish independent benchmarking. One value only. | `verified`, `not-assessed` |
| `pretrained_model` | **Pretrained model.** Availability of reusable weights, distinct from code availability. Not assessed does not mean unavailable. One value only. | `available`, `not-applicable`, `not-assessed` |

## Identity, publications and evidence

| Column | Meaning |
| --- | --- |
| `method_id`, `method` | Unique stable identifier and display name. MOFA+ uses `mofa-plus`, distinct from `mofa`. |
| `schema_version`, `inclusion_status` | `2.1` and `included` for browser records. Suggestions are `pending` and are not automatically imported. |
| `summary`, `modalities`, `training_requirements` | Plain-language mechanism, actual measured inputs/units and workflow constraints. |
| `method_doi`, `publication_url`, `publication_title` | Original method publication; DOI can be empty for proceedings without one. No review article substitutes for the method paper. |
| `preprint_doi` | Optional companion preprint retained alongside the verified published version. |
| `publication_date`, `publisher` | Verified online date preferred; otherwise registered publication date. `YYYY-MM` or `YYYY`, without invented precision. |
| `publication_metadata_source`, `publication_checked_on` | Metadata source and verification date. |
| `resource_url`, `resource_type` | Software or documentation destination; empty if no destination verified. |
| `resource_check_status`, `resource_checked_on`, `repository_archived` | Link check and repository archival state where known. Reachability is not a reproducibility claim. |
| `pretrained_model_source`, `benchmark_source` | Evidence required for verified reusable weights and independent benchmarking. |
| `inference_method` | Fitting/uncertainty approximation, separate from what quantity has uncertainty. |
| `needs_curation`, `curation_status` | `yes`/`provisional` for a substantive unresolved profile judgement; `no`/`reviewed` otherwise. Reviewed does not mean every operational field was verified. |
| `curation_notes`, `curation_basis`, `evidence_sources`, `reviewed_on` | Decision rationale, basis, semicolon-separated primary/author URLs and review date. |

## Legacy fields and scope register

`legacy_axis_*` and `legacy_method_family` preserve prior classifications. Other extractor fields such as `data_pairedness`, `data_missingness`, `method_scope`, `method_integration_level`, `method_uncertainty`, `method_prior_knowledge`, `supervision`, and `source_*` are historical provenance, not current selection fields. In particular, legacy `method_scope` is not `axis_method_scope`.

The old `axis_latent_design`, `axis_architecture` and `axis_application_level` are blank and are not used by the browser. `application_tasks` mirrors `integration_effects` for export compatibility. `method_family` is a display-only list of building blocks, not a mutually exclusive taxonomy.

`data/contextual_methods.csv` retains original records removed from the shortlist and other cited contextual methods or resources, with `scope_reason`, `inclusion_status` and `reviewed_on`. They are not returned as search results. `data/classification-audit.json` records migrated profile decisions and source links; `data/refresh-audit.json` records additions, scope decisions and citation replacements.

`data/literature-coverage.json` maps reviewed literature identifiers and name-only cases to method IDs or explicit background categories. It contains public bibliographic information and scope decisions, without manuscript excerpts.

Run `python3 scripts/validate_atlas.py` and `node --test tests/atlas-core.test.js` before publishing changes.


## Operational evidence

`data/operational-evidence.json` is the maintained evidence record for all four practical axes. Every included method needs a profile, checked date, per-field note and source URLs. Dataset examples preserve count, observational unit, workflow stage and whether the example is simulated or used for pretraining.

- **Dataset size:** Reported example scale: small <1,000; medium 1,000–99,999; large >=100,000 observational units. These thresholds are an atlas convention, not thresholds stated in the manuscript figure. Always read the unit, workflow and simulation/pretraining status. Examples do not establish minimum data needs, capacity, statistical power or equal difficulty across modalities.
- **Software maturity:** Early: research code/archive with limited reuse infrastructure. Developing: documented setup and usage, but the full mature criteria are not established. Mature: installable package, documentation/tutorials, tests and versioned releases, or an established package-registry release with documentation and registry checks. This is an engineering-evidence classification, not age, popularity, maintenance, installation success, scientific accuracy or clinical certification. No inspectable implementation: not established.
- **Compute demand:** Documented hardware context, not a benchmark ranking: limited = CPU/ordinary-computer example; moderate = single conventional GPU or workstation example (up to 128 GB host RAM); high = explicitly recommended HPC, more than 128 GB host RAM, >=40 GB accelerator memory, or multi-accelerator configuration. A tier describes the reported example, not a minimum. CPU support alone is insufficient. Training, inference, demo and pretraining contexts are recorded separately in notes; multiple tiers can describe different workflows.
- **Validation evidence:** Internal = evaluation by the method authors, including their simulations, held-out data or external cohorts. Independent = a separately authored evaluation/benchmark that actually tests the method, not a review or citation. Prospective = a locked model/workflow evaluated prospectively on subsequently accrued observations/outcomes. Retrospective analyses of clinical-trial material do not qualify. Categories can coexist; absence of a verified source is not evidence of absence.

not-assessed is displayed as Not established for these fields: sources were checked, but a defensible tier was not established. Unknown values do not match positive filters. A method-level match can combine evidence from different examples or stages. It does not prove all selected properties were demonstrated simultaneously. Read the example notes before shortlisting.

The CSV repeats each practical field, its `<field>_notes`, `<field>_sources` and `operational_checked_on`. Source lists use semicolons. After editing the evidence record and its counts, run `python3 scripts/sync_operational.py`, then the standard validator and tests. Update the curation-page evidence totals if counts changed. New community candidates keep these fields unknown until evidence is reviewed. Prospective records additionally require `prospective_study.locked_model`, `subsequent_accrual` and a source in the evidence list.


## Reproducible manuscript Table 1 (21 November 2026)

The table uses the 91 method IDs frozen in `data/table1-population.json`, not the entire evolving atlas. MCFA remains in the broader atlas but is outside this manuscript population. `data/table1-definition.json` gives every column and row criterion, the denominator policy and exact frequency bands. `data/table1-evidence.json` retains the source audit, version qualifications, accepted changes, scoped uncertainty decisions and unresolved component memberships.

Columns overlap. The VAE column is nested within probabilistic modelling. `mil` now denotes the manuscript's broader **set representation and multiple instance learning** block. Confirmed use of a foundation model's external backbone does not by itself establish the method's own reusable-pretraining component. Three candidate memberships remain unassessed and are excluded from that column, separately from unknown row properties.

For a confirmed block member, each row is positive, a scoped negative, or not assessed. Known `not-applicable` values are negative for the presence of that property, not missing evidence. The denominator includes only positive and scoped-negative records. A negative is limited to the reviewed workflow. It does not claim that no possible extension could provide the property. The table displays n/N and a rounded percentage, but the four shading bands use the exact fraction with lower boundaries at 0%, 25%, 50% and 75%. Values at 100% belong to the final band. Zero assessed records produce NA, never 0%.

Posterior and endpoint-predictive uncertainty are source-audited separately. `uncertainty_type=resampling-based` and `uncertainty_target=structure` preserve rank/subspace diagnostics without confusing them with Bayesian posteriors. `uncertainty_target=not-applicable` records a scoped absence of a documented uncertainty output. Calibration evaluations retain their target and are not implied by posterior or evidential output. MultiMIL is pinned to v1 and its historical implementation because v2 removes its VAE.

Rebuild with `python3 scripts/build_table1.py`. Validate with `python3 scripts/validate_atlas.py`, `python3 -m unittest discover -s tests -p 'test_table1.py'`, and `python3 scripts/build_table1.py --check`. Generated JSON records input hashes and per-cell memberships. The CSV and interactive HTML are derived from the same inputs. These checks validate consistency and arithmetic, not the scientific truth of every classification. The additional source audit was AI-assisted and is retained for author review.
