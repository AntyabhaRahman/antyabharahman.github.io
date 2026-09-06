---
title: "Placeholder paper: Bandwidth schedules for softmax attention"
authors: ["Antyabha Rahman", "Ines Moreau", "Kenji Sato"]
venue: Preprint
date: 2026-05-20
description: Treating the attention temperature as a kernel bandwidth and annealing it during training cuts the perplexity gap on long context evaluation.
pdf: https://example.com
arxiv: https://example.com
code: https://example.com
---

<!-- Placeholder. Replace this file with your own content. Keep the frontmatter keys. -->

This is a placeholder entry for a paper that does not exist.

Softmax attention divides its scores by a fixed constant $\sqrt{d}$. We read that constant as the bandwidth of a Nadaraya Watson kernel and ask whether one value should serve the whole run. We replace it with a schedule $\tau_t$ that starts wide and narrows.

$$
\tau_t = \tau_{\mathrm{min}} + (\tau_0 - \tau_{\mathrm{min}}) \exp(-t / T)
$$

A wide kernel early in training averages over many tokens, which keeps gradients flowing to keys that a sharp head would ignore. Narrowing later lets heads commit to single positions.

We train decoder models at 160M and 1.4B parameters on 30B tokens. The schedule lowers validation perplexity by 0.9 percent at 160M and 1.3 percent at 1.4B against a tuned fixed temperature. The gain concentrates in sequences longer than 4096 tokens, where the fixed baseline spreads mass over roughly twice as many keys as needed. We also report the entropy of the attention weights per layer across training, and the middle layers narrow on their own while the first two layers stay wide.

Code and checkpoints are at the link above.
