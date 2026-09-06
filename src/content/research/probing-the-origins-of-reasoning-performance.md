---
title: "Probing the Origins of Reasoning Performance: Representational Quality for Mathematical Problem-Solving in RL vs SFT Finetuned Models"
authors: ["Antyabha Rahman", "Akshaj Gurugubelli", "Omar Ankit", "Kevin Zhu", "Aishwarya Balwani"]
venue: AAAI 2026 Workshop on XAI4Science
date: 2026-07-28
description: Investigating how reinforcement learning and supervised fine-tuning shape internal representations for mathematical reasoning.
openreview: https://openreview.net/forum?id=6bdhxhvBLd
arxiv: https://arxiv.org/abs/2607.26119
---

## Abstract

Large reasoning models trained via reinforcement learning (RL) have been increasingly shown to outperform their supervised fine-tuned (SFT) counterparts on mathematical reasoning tasks; yet, the mechanistic basis for this advantage remains unclear. We therefore ask: what internal representational differences enable RL models’ superior performance? Our work presents two converging lines of evidence.

First, linear probes trained on layer-wise hidden states reveal that RL models tend to achieve higher accuracy in predicting answer correctness compared to SFT models, indicating more linearly separable and structured representations. Second, mean ablation studies show that RL models develop a hierarchical architecture where deeper layers become progressively more critical, whereas SFT models distribute importance uniformly across layers.

Together, these findings demonstrate that RL training fundamentally restructures how models represent and process reasoning problems. Finally, we analyze token-count variability under repeated sampling across problems to assess adaptive compute allocation. While we observe higher variability in some RL-tuned models than in their SFT counterparts, we see strong consistency in others, suggesting that token allocation may depend more on the overall training pipeline than on RL versus SFT alone.

We believe this token-allocation variability reveals the spread of plausible on-policy reasoning, highlighting which models exhibit stable policies versus those that are under-determined, potentially non-identifiable solution behaviour.

[Project website](https://oankit.github.io/-rl-sft-reasoning/)
