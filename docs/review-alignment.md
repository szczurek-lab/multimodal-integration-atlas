# Mapping the review to the atlas

The atlas uses the review's four scientific groups and the four practical considerations in Figure 1. Methodological building blocks describe constructions that combine within a method. Data setting and supporting evidence provide additional search criteria.

The main text supplies the expanded category definitions. Figure 1 shows representative endpoints and short labels. The browser preserves the distinctions needed for selecting methods and records unestablished properties explicitly.

| Review concept | Atlas field | Category mapping |
| --- | --- | --- |
| Application setting | `primary_data_regime` | Additional filter for the documented assay combinations and observational units. |
| Correspondence | `axis_correspondence` | Paired, partially paired, unpaired and weak linkage. Partial pairing records matched observations in a subset. Weak linkage records shared features or biological anchors. |
| Missingness | `axis_missingness` | Fully observed, entry-level and whole-modality missingness. Training requirements identify workflow conditions. |
| Observational granularity | `axis_granularity` | Single-level and multi-level or set-valued observations. Figure 1 abbreviates the heading to Granularity. |
| Model transparency | `axis_model_transparency` | The black-box to white-box range is represented by explicit mappings, explicit distributions, inspectable neural components, post-hoc exploration and black-box representations. Properties may coexist. |
| Modality decomposition | `axis_modality_decomposition` | Shared representations, shared and modality-specific components, and components shared by subsets of modalities. Methods without a latent decomposition receive an explicit applicability label. |
| Prior biological knowledge | `axis_prior_knowledge` | No required external prior, pathways, networks, feature links, spatial structure, temporal structure and explicit biological relationships. |
| Method scope | `axis_method_scope` | General-purpose, domain-specific and task-specific. |
| Supervision | `axis_supervision` | Unsupervised, self-supervised, semi-supervised, supervised and weakly supervised. The notes distinguish training stages and sources of targets. |
| Integration effect | `integration_effects` | Representation and structure discovery, alignment, imputation, cross-modal prediction, generation, spatial or biological mapping, temporal mapping and endpoint prediction. The representation-learning and discovery icons in Figure 1 correspond to the shared heading in the main text. |
| Uncertainty specification | `uncertainty_type` | Model-based posterior or predictive uncertainty, evidential uncertainty, post-hoc uncertainty and absence of a documented output. Unassessed profiles retain an unknown value. |
| Quantity with uncertainty | `uncertainty_target` | Latents, parameters, missing measurements, predictions and modality evidence. |
| Predictive calibration | `calibration_evidence` | Verified calibration evaluation is recorded separately from the existence of uncertainty outputs. |
| Dataset size | `dataset_size` | Small, medium and large documented examples. Counts retain their units and workflow stages. The atlas bands are below 1,000, 1,000–99,999 and at least 100,000 observations. |
| Software maturity | `software_maturity` | Early, developing and mature, according to documented support for installation and reuse. |
| Compute demand | `compute_demand` | Limited, moderate and high, according to a documented hardware configuration or recommendation. |
| Validation evidence | `validation_evidence` | Internal, independent and prospective. Each category requires the corresponding evaluation evidence. |
| Methodological building blocks | `methodological_components` | Deterministic optimization, probabilistic modeling, variational autoencoders, contrastive learning, foundation models, and set representation and multiple instance learning. A method may use several blocks. |
| Peer-review status | `publication_status` | Journal article, conference paper, preprint or unverified status. |
| Code availability | `code_availability` | Verified code, verified documentation, no implementation located or unverified availability. |
| Independent benchmarking | `independent_benchmark` | A separately authored evaluation has tested the method. This agrees with the independent category under Validation evidence. |
| Usable pretrained models | `pretrained_model` | Documented public weights, an explicit applicability label or unassessed availability. |

All controls, method cards, comparisons and readable exports obtain their labels from `data/schema.json`. The full CSV also retains historical provenance columns, described in [the schema documentation](schema.md). Its `method_family` and `application_tasks` compatibility fields mirror the current building blocks and integration effects.

Positive filters require documented membership. A method-level match may combine evidence from several workflows. The practical notes retain the observation units, workflow stages, sources and check dates needed to interpret these matches. The [practical classification rules](../curation.html#practical) define the evidence thresholds.
