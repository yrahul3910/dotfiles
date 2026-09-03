---
name: experiment-loop
description: Run a bounded empirical research loop using Pi background terminals - launch experiments, analyze evidence, and refine the stated hypothesis. Use for explicit research or experiment requests; do not use for ordinary implementation work or open-ended exploration.
---

# Experiment loop

Turn a stated research idea into a sequence of reproducible experiments. Run jobs in Pi background terminals so analysis and preparation can continue while they execute. Background terminals are intentionally session-scoped: do not attempt to preserve jobs if Pi shuts down.

## Establish the research contract

Before launching work, identify:

- **Question and hypothesis.** What mechanism or prediction the experiment tests, not merely what code to run.
- **Evidence standard.** The primary metric, comparison baseline, direction of improvement, and the result that would count as useful evidence.
- **Search boundary.** The allowed datasets, model class, objectives, hyperparameters, and code paths. Refinement stays inside this boundary.
- **Resources.** Available compute, time or cost budget, and safe concurrency.
- **Artifact and ledger location.** Reuse an existing experiment tracker when one exists. Otherwise ask where the user wants the durable ledger and artifacts; do not silently create repo conventions or edit `.gitignore`.

Read the repository and dataset documentation first. Ask every material question needed to establish this contract. In particular, do not infer a success metric, claim, compute budget, held-out split, or permission to change the model or dataset family.

## Build trustworthy evidence

1. Run a smoke test and the simplest relevant baseline before a broad sweep. Confirm that the dataset, metric, artifact capture, and evaluation path are real before spending the budget.
2. Record every run in the ledger with: hypothesis, dataset and split/version, code revision, model and configuration, seed, exact command, artifact path, metric, and verdict. Record failed and negative runs as well as wins.
3. Use a development/validation split to choose variants. Do not tune against the held-out final test set; run that evaluation only for the chosen result or when the user explicitly changes the evaluation plan.
4. Change one meaningful variable or a deliberately named bundle per experiment. A larger sweep is allowed only when the search boundary and resource budget make it interpretable.

## Run jobs without waiting idly

1. Start independent jobs with `bg_start`, using descriptive titles and stable artifact paths. Select concurrency from the research contract; the terminal limit is not a compute budget.
2. After launching a job, continue with in-scope work: inspect prior results, prepare the next bounded configurations, validate data or metric code, or analyze completed artifacts. Do not invent unrelated research directions.
3. Use `bg_status` when a live result is needed for the next decision and `bg_list` to inventory jobs. Do not busy-poll. A completed terminal sends a follow-up automatically, at which point collect its artifacts and update the ledger.
4. A failed job is evidence. Diagnose the failure within scope, retry only when a transient failure or corrected setup justifies it, and record the outcome. Do not hide failures by deleting their evidence or silently changing the experiment.

## Refine, stop, and ask

Use each completed result to choose the next experiment: retain a supported hypothesis, falsify a weak one, or test the next alternative inside the agreed search boundary. A plateau means redesigning the next experiment, not repeating the same run.

Stop and ask before changing the research question, data source or split, model family, primary metric, evaluation protocol, resource budget, or stated claim. Also ask when the evidence leaves multiple materially different next directions. Ask every concrete question necessary to make the next run unambiguous.

Finish when the evidence standard is met, the agreed budget is exhausted, or the results show the idea is unsupported. Report the hypothesis, baseline and results, the ledger and artifact locations, what was verified, negative or failed evidence, limitations, and the narrowest justified conclusion. Do not describe a promising training curve as evidence that the research idea works.
