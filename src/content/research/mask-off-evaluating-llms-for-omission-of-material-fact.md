---
title: "MASK-OFF: Evaluating LLMs for omission of material fact"
authors: ["Antyabha Rahman", "Justin Michael Moeljono"]
venue: AI4GOOD Workshop @ NeurIPS 2026 Poster
date: 2026-10-02
description: A benchmark of 500 scenarios that measures when LLMs leave out a material fact they know is harmful, with no pressure to conceal it.
openreview: https://openreview.net/forum?id=2fMvRl8Eiw
code: https://github.com/AntyabhaRahman/MASK-OFF
---

## Abstract

Large language models (LLMs) are widely deployed with the ability to influence user decisions, yet on benign requests they often fail to accurately convey material information, which can lead to harm. While existing benchmarks measure aspects of trustworthiness in LLMs (e.g., hallucination or sycophancy), material omission, the failure to disclose relevant true information, remains underexplored. We introduce MASK-OFF, a dataset of 500 scenarios spanning 14 categories (e.g., product safety, legal, medical) with a human-validated evaluation suite that measures material omission in LLMs without explicit pressure to conceal. 14 of the 15 frontier closed and open-weight models complete the user’s request without disclosing the material fact that they recognize as harmful in 46% to 95% of responses. For example, models readily draft marketing copy for a product without revealing that it contains a known carcinogen. Claude Opus 5 has the lowest omission rate but refuses 39% of all requests. We also find that the user raising the salience of the material fact, through a single sentence expressing a related false belief or a dismissed suspicion, cuts omission rates significantly. This is what makes omission so pernicious: the user cannot raise a fact that they do not know. Given this recurring failure mode across leading models, there is a need for developers to address material omission and improve the trustworthiness of LLMs. The MASK-OFF code is available at [github.com/AntyabhaRahman/MASK-OFF](https://github.com/AntyabhaRahman/MASK-OFF), and the dataset is accessible through Harvard Dataverse.
